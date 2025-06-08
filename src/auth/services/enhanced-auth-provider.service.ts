import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CircuitBreakerService } from './circuit-breaker.service';

@Injectable()
export class EnhancedAuthProviderService {
    private readonly logger = new Logger(EnhancedAuthProviderService.name);
    private readonly authServiceBaseUrl: string;
    private readonly authServiceTimeout: number;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly circuitBreaker: CircuitBreakerService,
    ) {
        this.authServiceBaseUrl = this.configService.get<string>('AUTH_SERVICE_BASE_URL', 'http://localhost:3001');
        this.authServiceTimeout = this.configService.get<number>('AUTH_SERVICE_TIMEOUT', 5000);
        this.setupHttpInterceptors();
    }

    /**
     * Login con circuit breaker y fallback
     */
    async login(email: string, password: string) {
        return await this.circuitBreaker.execute(
            'auth-login',
            async () => {
                this.logger.log(`Attempting login for user: ${email}`);

                const response = await firstValueFrom(
                    this.httpService.post(`${this.authServiceBaseUrl}/auth/login`, {
                        email,
                        password,
                    }, {
                        timeout: this.authServiceTimeout,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

                this.logger.log(`Login successful for user: ${email}`);
                return response.data;
            },
            async () => {
                // Fallback: podrías implementar autenticación local básica
                this.logger.warn('Using fallback authentication - auth service unavailable');
                throw new UnauthorizedException('Authentication service temporarily unavailable');
            }
        );
    }

    /**
     * Validación de token con circuit breaker
     */
    async validateToken(accessToken: string) {
        return await this.circuitBreaker.execute(
            'auth-validate',
            async () => {
                const response = await firstValueFrom(
                    this.httpService.get(`${this.authServiceBaseUrl}/auth/validate`, {
                        timeout: this.authServiceTimeout,
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    })
                );

                return response.data;
            },
            async () => {
                // Fallback: validación básica local (solo estructura del token)
                this.logger.warn('Using fallback token validation');
                try {
                    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
                    const now = Math.floor(Date.now() / 1000);

                    if (payload.exp && payload.exp < now) {
                        throw new UnauthorizedException('Token expired');
                    }

                    return {
                        valid: true,
                        user: {
                            sub: payload.sub,
                            email: payload.email,
                            roles: payload.roles || [],
                            permissions: payload.permissions || [],
                        }
                    };
                } catch (error) {
                    throw new UnauthorizedException('Invalid token format');
                }
            }
        );
    }

    /**
     * Refresh token con circuit breaker
     */
    async refreshToken(refreshToken: string) {
        return await this.circuitBreaker.execute(
            'auth-refresh',
            async () => {
                this.logger.log('Attempting to refresh token');

                const response = await firstValueFrom(
                    this.httpService.post(`${this.authServiceBaseUrl}/auth/refresh`, {
                        refreshToken,
                    }, {
                        timeout: this.authServiceTimeout,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

                this.logger.log('Token refresh successful');
                return response.data;
            }
        );
    }

    /**
     * Health check
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

    private setupHttpInterceptors(): void {
        this.httpService.axiosRef.interceptors.request.use(
            (config) => {
                this.logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            }
        );

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
}