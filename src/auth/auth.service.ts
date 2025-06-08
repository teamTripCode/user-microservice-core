import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from 'src/user/interfaces/jwt-payload.interface';
import { OAuth2Result } from './interfaces/oauth2-result.interface';
import { OAuth2Strategy } from './strategies/oauth2.strategy';
import { UserService } from 'src/user/user.service';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './services/TokenBlacklist.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly oAuth2Strategy: OAuth2Strategy,
        private readonly tokenBlacklistService: TokenBlacklistService,
        private readonly configService: ConfigService,
    ) { }

    // Redirige al usuario al proveedor OAuth2
    getOAuth2RedirectUrl(): string {
        const state = this.generateState();
        // Guarda el state en sesión o Redis para validación posterior
        return this.oAuth2Strategy.authorizationUrl() + `&state=${state}`;
    }

    // Intercambia el código por tokens y valida
    async exchangeCodeForTokens(code: string): Promise<OAuth2Result> {
        try {
            // Intercambia el código por tokens con el proveedor OAuth2
            const tokenResponse = await this.exchangeCodeWithProvider(code);

            // Valida el token de acceso
            const userInfo = await this.validateOAuth2Token(tokenResponse.accessToken);

            // Calcula la expiración del token
            const expiresAt = userInfo.exp ? userInfo.exp * 1000 : Date.now() + (3600 * 1000); // 1 hora por defecto

            return {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken,
                user: {
                    sub: userInfo.sub,
                    email: userInfo.email,
                    roles: userInfo.roles,
                    permissions: userInfo.permissions
                },
                expiresAt
            };
        } catch (error) {
            throw new UnauthorizedException('Failed to exchange code for tokens');
        }
    }

    // Valida el token de acceso recibido del proveedor
    async validateOAuth2Token(accessToken: string): Promise<JwtPayload> {
        // Verifica que el token no esté revocado
        if (await this.tokenBlacklistService.isBlacklisted(accessToken)) {
            throw new UnauthorizedException('Token has been revoked');
        }

        // Valida el token con el proveedor (ejemplo con introspección)
        const isValid = await this.introspectToken(accessToken);
        if (!isValid) {
            throw new UnauthorizedException('Invalid token');
        }

        // Retorna el payload del token
        return this.parseJwtPayload(accessToken);
    }

    // Revoca tokens cuando el usuario cierra sesión
    async logout(accessToken: string): Promise<void> {
        // Agrega el token a la lista negra
        const payload = this.parseJwtPayload(accessToken);
        if (typeof payload.exp === 'undefined') {
            throw new UnauthorizedException('Token expiration (exp) is missing');
        }

        await this.tokenBlacklistService.addToBlacklist(
            accessToken,
            payload.exp * 1000,
        );

        // Opcional: Llama al endpoint de logout del proveedor
        await this.revokeProviderToken(accessToken);
    }

    // Obtiene la URL de redirección después del login
    getRedirectUrl(): string {
        return this.configService.get<string>('OAUTH2_REDIRECT_SUCCESS_URL', '/dashboard');
    }

    // Genera un estado único para prevenir CSRF
    private generateState(): string {
        return Math.random().toString(36).substring(2);
    }

    // Intercambia el código con el proveedor OAuth2
    private async exchangeCodeWithProvider(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
        // Implementa la lógica para intercambiar el código por tokens
        // Ejemplo: POST a /token con authorization_code grant

        const clientId = this.configService.get<string>('OAUTH2_CLIENT_ID');
        const clientSecret = this.configService.get<string>('OAUTH2_CLIENT_SECRET');
        const redirectUri = this.configService.get<string>('OAUTH2_REDIRECT_URI');
        const tokenUrl = this.configService.get<string>('OAUTH2_TOKEN_URL');

        if (!tokenUrl) {
            throw new Error('OAUTH2_TOKEN_URL is not defined in configuration');
        }

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri ?? '',
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to exchange code for tokens');
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
        };
    }

    // Valida el token con el proveedor (ejemplo con introspección)
    private async introspectToken(token: string): Promise<boolean> {
        // Implementa la lógica para validar el token con el proveedor
        // Ejemplo: Llamada a /introspect con client_id y client_secret
        return true; // Placeholder
    }

    // Parsea el JWT (si el token es JWT)
    private parseJwtPayload(token: string): JwtPayload {
        try {
            // Decodifica el JWT sin verificar (verifica en introspectToken)
            const payload = Buffer.from(token.split('.')[1], 'base64').toString();
            return JSON.parse(payload);
        } catch (error) {
            throw new UnauthorizedException('Invalid token format');
        }
    }

    // Revoca el token en el proveedor (opcional)
    private async revokeProviderToken(token: string): Promise<void> {
        // Llama al endpoint /revoke del proveedor
        const clientId = this.configService.get<string>('OAUTH2_CLIENT_ID');
        const clientSecret = this.configService.get<string>('OAUTH2_CLIENT_SECRET');
        const revokeUrl = this.configService.get<string>('OAUTH2_REVOKE_URL');

        if (!revokeUrl) return;

        try {
            await fetch(revokeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                },
                body: new URLSearchParams({
                    token,
                    token_type_hint: 'access_token'
                }),
            });
        } catch (error) {
            // Log error but don't throw - logout should succeed even if revocation fails
            console.error('Failed to revoke token with provider:', error);
        }
    }
}