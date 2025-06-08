import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthProviderService } from './AuthProvider.service';
import { TokenBlacklistService } from './TokenBlacklist.service';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    services: {
        authProvider: {
            status: 'up' | 'down';
            responseTime?: number;
            lastCheck: number;
        };
        tokenBlacklist: {
            status: 'up' | 'down';
            stats?: {
                totalTokens: number;
                activeTokens: number;
                expiredTokens: number;
            };
            lastCheck: number;
        };
    };
}

@Injectable()
export class AuthHealthService {
    private readonly logger = new Logger(AuthHealthService.name);
    private healthStatus: HealthStatus;

    constructor(
        private readonly authProviderService: AuthProviderService,
        private readonly tokenBlacklistService: TokenBlacklistService,
        private readonly configService: ConfigService,
    ) {
        this.initializeHealthStatus();
    }

    /**
     * Obtiene el estado de salud actual
     */
    getHealthStatus(): HealthStatus {
        return this.healthStatus;
    }

    /**
     * Realiza un chequeo completo de salud
     */
    async performHealthCheck(): Promise<HealthStatus> {
        const startTime = Date.now();
        this.logger.log('Performing health check');

        try {
            // Check auth provider service
            const authProviderStart = Date.now();
            const authProviderHealthy = await this.authProviderService.healthCheck();
            const authProviderResponseTime = Date.now() - authProviderStart;

            // Check token blacklist service
            const blacklistStats = this.tokenBlacklistService.getBlacklistStats();

            // Update health status
            this.healthStatus = {
                status: this.calculateOverallStatus(authProviderHealthy),
                timestamp: Date.now(),
                services: {
                    authProvider: {
                        status: authProviderHealthy ? 'up' : 'down',
                        responseTime: authProviderResponseTime,
                        lastCheck: Date.now(),
                    },
                    tokenBlacklist: {
                        status: 'up', // Blacklist service is always up as it's in-memory
                        stats: blacklistStats,
                        lastCheck: Date.now(),
                    },
                },
            };

            const totalTime = Date.now() - startTime;
            this.logger.log(`Health check completed in ${totalTime}ms. Status: ${this.healthStatus.status}`);

            return this.healthStatus;
        } catch (error) {
            this.logger.error('Health check failed', error);

            this.healthStatus = {
                status: 'unhealthy',
                timestamp: Date.now(),
                services: {
                    authProvider: {
                        status: 'down',
                        lastCheck: Date.now(),
                    },
                    tokenBlacklist: {
                        status: 'down',
                        lastCheck: Date.now(),
                    },
                },
            };

            return this.healthStatus;
        }
    }

    /**
     * Chequeo de salud automático cada 5 minutos
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async scheduledHealthCheck(): Promise<void> {
        await this.performHealthCheck();
    }

    private initializeHealthStatus(): void {
        this.healthStatus = {
            status: 'healthy',
            timestamp: Date.now(),
            services: {
                authProvider: {
                    status: 'up',
                    lastCheck: Date.now(),
                },
                tokenBlacklist: {
                    status: 'up',
                    lastCheck: Date.now(),
                },
            },
        };
    }

    private calculateOverallStatus(authProviderHealthy: boolean): 'healthy' | 'degraded' | 'unhealthy' {
        if (authProviderHealthy) {
            return 'healthy';
        } else {
            // Si el auth provider está down pero el blacklist funciona, el servicio está degradado
            return 'degraded';
        }
    }
}