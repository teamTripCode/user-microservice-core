import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

// Interfaces para las respuestas del proveedor
interface AuthProviderLoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        sub: string;
        email: string;
        roles: string[];
        permissions: string[];
    };
    expiresAt: number;
}

interface AuthProviderRegisterResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        sub: string;
        email: string;
        roles: string[];
        permissions: string[];
    };
    expiresAt: number;
}

interface AuthProviderValidationResponse {
    valid: boolean;
    user: {
        sub: string;
        email: string;
        roles: string[];
        permissions: string[];
    };
}

interface AuthProviderTokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

@Injectable()
export class AuthProviderService {
    private readonly logger = new Logger(AuthProviderService.name);
    private readonly authServiceBaseUrl: string;
    private readonly authServiceTimeout: number;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.authServiceBaseUrl = this.configService.get<string>('AUTH_SERVICE_BASE_URL', 'http://localhost:3000');
        this.authServiceTimeout = this.configService.get<number>('AUTH_SERVICE_TIMEOUT', 5000);

        // Configurar interceptores para logging y manejo de errores
        this.setupHttpInterceptors();
    }

    /**
     * Realiza login a través del microservicio de autenticación
     */
    async login(email: string, password: string): Promise<AuthProviderLoginResponse> {
        try {
            this.logger.log(`Attempting login for user: ${email}`);

            const response: AxiosResponse<AuthProviderLoginResponse> = await firstValueFrom(
                this.httpService.post(`${this.authServiceBaseUrl}/auth/login`, {
                    email,
                    password,
                }, {
                    timeout: this.authServiceTimeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            this.logger.log(`Login successful for user: ${email}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Login failed for user: ${email}`, error);
            throw new UnauthorizedException('Invalid credentials');
        }
    }

    /**
     * Registra un usuario a través del microservicio de autenticación
     */
    async register(userData: {
        email: string;
        password: string;
        name?: string;
        [key: string]: any;
    }): Promise<AuthProviderRegisterResponse> {
        try {
            this.logger.log(`Attempting registration for user: ${userData.email}`);

            const response: AxiosResponse<AuthProviderRegisterResponse> = await firstValueFrom(
                this.httpService.post(`${this.authServiceBaseUrl}/auth/register`, userData, {
                    timeout: this.authServiceTimeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            this.logger.log(`Registration successful for user: ${userData.email}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Registration failed for user: ${userData.email}`, error);

            if (error.response?.status === 409) {
                throw new UnauthorizedException('User already exists');
            }

            throw new UnauthorizedException('Registration failed');
        }
    }

    /**
     * Valida un token de acceso con el microservicio de autenticación
     */
    async validateToken(accessToken: string): Promise<AuthProviderValidationResponse> {
        try {
            const response: AxiosResponse<AuthProviderValidationResponse> = await firstValueFrom(
                this.httpService.get(`${this.authServiceBaseUrl}/auth/validate`, {
                    timeout: this.authServiceTimeout,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            );

            return response.data;
        } catch (error) {
            this.logger.error('Token validation failed', error);
            throw new UnauthorizedException('Invalid token');
        }
    }

    /**
     * Refresca tokens usando el microservicio de autenticación
     */
    async refreshToken(refreshToken: string): Promise<AuthProviderTokenResponse> {
        try {
            this.logger.log('Attempting to refresh token');

            const response: AxiosResponse<AuthProviderTokenResponse> = await firstValueFrom(
                this.httpService.post(`${this.authServiceBaseUrl}/auth/refresh`, {
                    refreshToken,
                }, {
                    timeout: this.authServiceTimeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            this.logger.log('Token refresh successful');
            return response.data;
        } catch (error) {
            this.logger.error('Token refresh failed', error);
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Realiza logout a través del microservicio de autenticación
     */
    async logout(accessToken: string, refreshToken: string): Promise<void> {
        try {
            this.logger.log('Attempting logout');

            await firstValueFrom(
                this.httpService.post(`${this.authServiceBaseUrl}/auth/logout`, {
                    refreshToken,
                }, {
                    timeout: this.authServiceTimeout,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            );

            this.logger.log('Logout successful');
        } catch (error) {
            this.logger.error('Logout failed', error);
            // No lanzamos excepción para que el logout local pueda continuar
        }
    }

    /**
     * Solicita reset de contraseña
     */
    async forgotPassword(email: string): Promise<void> {
        try {
            this.logger.log(`Password reset requested for: ${email}`);

            await firstValueFrom(
                this.httpService.post(`${this.authServiceBaseUrl}/auth/forgot-password`, {
                    email,
                }, {
                    timeout: this.authServiceTimeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            this.logger.log(`Password reset email sent to: ${email}`);
        } catch (error) {
            this.logger.error(`Password reset failed for: ${email}`, error);
            // No lanzamos excepción para no revelar si el email existe
        }
    }

    /**
     * Resetea contraseña con token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        try {
            this.logger.log('Attempting password reset');

            await firstValueFrom(
                this.httpService.post(`${this.authServiceBaseUrl}/auth/reset-password`, {
                    token,
                    newPassword,
                }, {
                    timeout: this.authServiceTimeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            this.logger.log('Password reset successful');
        } catch (error) {
            this.logger.error('Password reset failed', error);
            throw new UnauthorizedException('Invalid or expired reset token');
        }
    }

    /**
     * Configura interceptores HTTP para logging y manejo de errores
     */
    private setupHttpInterceptors(): void {
        // Request interceptor
        this.httpService.axiosRef.interceptors.request.use(
            (config) => {
                this.logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                this.logger.error('HTTP Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.httpService.axiosRef.interceptors.response.use(
            (response) => {
                this.logger.debug(`HTTP Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                const status = error.response?.status;
                const url = error.config?.url;
                this.logger.error(`HTTP Response Error: ${status} ${url}`, error.response?.data);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Verifica la salud del microservicio de autenticación
     */
    async healthCheck(): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.get(`${this.authServiceBaseUrl}/health`, {
                    timeout: 3000,
                })
            );
            return true;
        } catch (error) {
            this.logger.error('Auth service health check failed', error);
            return false;
        }
    }
}