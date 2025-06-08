import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtPayload } from 'src/user/interfaces/jwt-payload.interface';
import { OAuth2Result } from './interfaces/oauth2-result.interface';
import { OAuth2Strategy } from './strategies/oauth2.strategy';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './services/TokenBlacklist.service';
import { AuthProviderService } from './services/AuthProvider.service';
import { LoginDto } from './Dto/login.dto';
import { RegisterDto } from './Dto/register.dto';
import { ForgotPasswordDto } from './Dto/forgot-password.dto';
import { ResetPasswordDto } from './Dto/reset-password.dto';


@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly oAuth2Strategy: OAuth2Strategy,
        private readonly tokenBlacklistService: TokenBlacklistService,
        private readonly configService: ConfigService,
        private readonly authProviderService: AuthProviderService,
    ) { }

    // === Métodos de autenticación tradicional (email/password) ===

    /**
     * Login con email y contraseña
     */
    async login(loginDto: LoginDto) {
        try {
            this.logger.log(`Login attempt for user: ${loginDto.email}`);

            const authResult = await this.authProviderService.login(
                loginDto.email,
                loginDto.password
            );

            this.logger.log(`Login successful for user: ${loginDto.email}`);

            return {
                accessToken: authResult.accessToken,
                refreshToken: authResult.refreshToken,
                user: authResult.user,
                expiresAt: authResult.expiresAt,
            };
        } catch (error) {
            this.logger.error(`Login failed for user: ${loginDto.email}`, error);
            throw new UnauthorizedException('Invalid credentials');
        }
    }

    /**
     * Registro de usuario
     */
    async register(registerDto: RegisterDto) {
        try {
            this.logger.log(`Registration attempt for user: ${registerDto.email}`);

            const authResult = await this.authProviderService.register({
                email: registerDto.email,
                password: registerDto.password,
                name: registerDto.name,
                // Agregar otros campos según necesites
            });

            this.logger.log(`Registration successful for user: ${registerDto.email}`);

            return {
                accessToken: authResult.accessToken,
                refreshToken: authResult.refreshToken,
                user: authResult.user,
                expiresAt: authResult.expiresAt,
            };
        } catch (error) {
            this.logger.error(`Registration failed for user: ${registerDto.email}`, error);
            throw error; // Re-lanza la excepción del provider
        }
    }

    /**
     * Refresca tokens
     */
    async refreshToken(refreshToken: string) {
        try {
            // Verifica que el refresh token no esté en blacklist
            if (await this.tokenBlacklistService.isBlacklisted(refreshToken)) {
                throw new UnauthorizedException('Refresh token has been revoked');
            }

            this.logger.log('Attempting to refresh token');

            const tokenResult = await this.authProviderService.refreshToken(refreshToken);

            // Blacklist el refresh token anterior
            await this.blacklistToken(refreshToken);

            this.logger.log('Token refresh successful');

            return {
                accessToken: tokenResult.accessToken,
                refreshToken: tokenResult.refreshToken,
                expiresAt: tokenResult.expiresAt,
            };
        } catch (error) {
            this.logger.error('Token refresh failed', error);
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Logout - invalida tokens tanto localmente como en el proveedor
     */
    async logout(accessToken: string, refreshToken: string): Promise<void> {
        try {
            this.logger.log('Processing logout');

            // Logout en el proveedor (no crítico si falla)
            await this.authProviderService.logout(accessToken, refreshToken);

            // Agregar tokens a la blacklist local
            await Promise.all([
                this.blacklistToken(accessToken),
                this.blacklistToken(refreshToken),
            ]);

            this.logger.log('Logout completed successfully');
        } catch (error) {
            this.logger.error('Error during logout', error);
            // Asegurar que al menos se agreguen a la blacklist local
            try {
                await Promise.all([
                    this.blacklistToken(accessToken),
                    this.blacklistToken(refreshToken),
                ]);
            } catch (blacklistError) {
                this.logger.error('Failed to blacklist tokens', blacklistError);
            }
            throw error;
        }
    }

    /**
     * Solicita reset de contraseña
     */
    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
        await this.authProviderService.forgotPassword(forgotPasswordDto.email);
    }

    /**
     * Resetea contraseña
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
        await this.authProviderService.resetPassword(
            resetPasswordDto.token,
            resetPasswordDto.newPassword
        );
    }

    // === Métodos OAuth2 ===

    /**
     * Redirige al usuario al proveedor OAuth2
     */
    getOAuth2RedirectUrl(): string {
        const state = this.generateState();
        // Guarda el state en sesión o Redis para validación posterior
        return this.oAuth2Strategy.authorizationUrl() + `&state=${state}`;
    }

    /**
     * Intercambia el código OAuth2 por tokens y valida
     */
    async exchangeCodeForTokens(code: string): Promise<OAuth2Result> {
        try {
            // Intercambia el código por tokens con el proveedor OAuth2
            const tokenResponse = await this.exchangeCodeWithProvider(code);

            // Valida el token de acceso
            const userInfo = await this.validateOAuth2Token(tokenResponse.accessToken);

            // Calcula la expiración del token
            const expiresAt = userInfo.exp ? userInfo.exp * 1000 : Date.now() + (3600 * 1000);

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

    // === Métodos de validación ===

    /**
     * Valida token usando el proveedor de autenticación
     */
    async validateToken(accessToken: string): Promise<JwtPayload> {
        try {
            // Verifica blacklist local primero (más rápido)
            if (await this.tokenBlacklistService.isBlacklisted(accessToken)) {
                throw new UnauthorizedException('Token has been revoked');
            }

            // Valida con el proveedor de autenticación
            const validationResult = await this.authProviderService.validateToken(accessToken);

            if (!validationResult.valid) {
                throw new UnauthorizedException('Invalid token');
            }

            return {
                sub: validationResult.user.sub,
                email: validationResult.user.email,
                roles: validationResult.user.roles,
                permissions: validationResult.user.permissions,
                exp: this.calculateExpirationFromToken(accessToken),
            };
        } catch (error) {
            this.logger.error('Token validation failed', error);
            throw new UnauthorizedException('Invalid token');
        }
    }

    /**
     * Valida el token OAuth2 (mantiene compatibilidad)
     */
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

    // === Métodos utilitarios ===

    /**
     * Obtiene la URL de redirección después del login
     */
    getRedirectUrl(): string {
        return this.configService.get<string>('OAUTH2_REDIRECT_SUCCESS_URL', '/dashboard');
    }

    /**
     * Agrega un token a la blacklist con su tiempo de expiración
     */
    private async blacklistToken(token: string): Promise<void> {
        try {
            const payload = this.parseJwtPayload(token);
            const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + (3600 * 1000);

            await this.tokenBlacklistService.addToBlacklist(token, expiresAt);
        } catch (error) {
            this.logger.error('Failed to blacklist token', error);
            throw error;
        }
    }

    /**
     * Calcula la expiración de un token JWT
     */
    private calculateExpirationFromToken(token: string): number {
        try {
            const payload = this.parseJwtPayload(token);
            return payload.exp || Math.floor(Date.now() / 1000) + 3600; // 1 hora por defecto
        } catch (error) {
            return Math.floor(Date.now() / 1000) + 3600; // 1 hora por defecto
        }
    }

    // === Métodos privados (OAuth2 - mantiene compatibilidad) ===

    private generateState(): string {
        return Math.random().toString(36).substring(2);
    }

    private async exchangeCodeWithProvider(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
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

    private async introspectToken(token: string): Promise<boolean> {
        // Implementa la lógica para validar el token con el proveedor
        // Ejemplo: Llamada a /introspect con client_id y client_secret
        return true; // Placeholder
    }

    private parseJwtPayload(token: string): JwtPayload {
        try {
            // Decodifica el JWT sin verificar (verifica en introspectToken)
            const payload = Buffer.from(token.split('.')[1], 'base64').toString();
            return JSON.parse(payload);
        } catch (error) {
            throw new UnauthorizedException('Invalid token format');
        }
    }

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