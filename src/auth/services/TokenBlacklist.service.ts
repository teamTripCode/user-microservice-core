import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

interface BlacklistedToken {
    token: string;
    expiresAt: number; // timestamp en milisegundos
    addedAt: number;   // timestamp cuando se agregó a la blacklist
}

@Injectable()
export class TokenBlacklistService {
    private readonly logger = new Logger(TokenBlacklistService.name);
    private readonly blacklistedTokens = new Map<string, BlacklistedToken>();
    private readonly cleanupEnabled: boolean;

    constructor(private readonly configService: ConfigService) {
        this.cleanupEnabled = this.configService.get<boolean>('TOKEN_CLEANUP_ENABLED', true);
    }

    /**
     * Agrega un token a la lista negra
     * @param token - El token a agregar a la blacklist
     * @param expiresAt - Timestamp de expiración del token en milisegundos
     */
    async addToBlacklist(token: string, expiresAt: number): Promise<void> {
        try {
            const now = Date.now();

            // Si el token ya expiró, no lo agregamos
            if (expiresAt <= now) {
                this.logger.debug(`Token already expired, not adding to blacklist`);
                return;
            }

            const blacklistedToken: BlacklistedToken = {
                token,
                expiresAt,
                addedAt: now
            };

            this.blacklistedTokens.set(token, blacklistedToken);

            this.logger.log(`Token added to blacklist. Total blacklisted tokens: ${this.blacklistedTokens.size}`);
        } catch (error) {
            this.logger.error('Error adding token to blacklist', error);
            throw error;
        }
    }

    /**
     * Verifica si un token está en la lista negra
     * @param token - El token a verificar
     * @returns true si el token está en la blacklist, false en caso contrario
     */
    async isBlacklisted(token: string): Promise<boolean> {
        try {
            const blacklistedToken = this.blacklistedTokens.get(token);

            if (!blacklistedToken) {
                return false;
            }

            const now = Date.now();

            // Si el token expiró naturalmente, lo removemos de la blacklist
            if (blacklistedToken.expiresAt <= now) {
                this.blacklistedTokens.delete(token);
                this.logger.debug('Expired token removed from blacklist during check');
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('Error checking if token is blacklisted', error);
            // En caso de error, por seguridad consideramos el token como válido
            return false;
        }
    }

    /**
     * Remueve un token específico de la lista negra
     * @param token - El token a remover
     */
    async removeFromBlacklist(token: string): Promise<void> {
        try {
            const removed = this.blacklistedTokens.delete(token);
            if (removed) {
                this.logger.log('Token removed from blacklist');
            }
        } catch (error) {
            this.logger.error('Error removing token from blacklist', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de la blacklist
     */
    getBlacklistStats(): {
        totalTokens: number;
        expiredTokens: number;
        activeTokens: number;
    } {
        const now = Date.now();
        let expiredCount = 0;
        let activeCount = 0;

        for (const blacklistedToken of this.blacklistedTokens.values()) {
            if (blacklistedToken.expiresAt <= now) {
                expiredCount++;
            } else {
                activeCount++;
            }
        }

        return {
            totalTokens: this.blacklistedTokens.size,
            expiredTokens: expiredCount,
            activeTokens: activeCount
        };
    }

    /**
     * Limpia tokens expirados de la blacklist
     * Se ejecuta automáticamente cada hora
     */
    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredTokens(): Promise<void> {
        if (!this.cleanupEnabled) {
            return;
        }

        try {
            const now = Date.now();
            let removedCount = 0;

            for (const [token, blacklistedToken] of this.blacklistedTokens.entries()) {
                if (blacklistedToken.expiresAt <= now) {
                    this.blacklistedTokens.delete(token);
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                this.logger.log(`Cleanup completed. Removed ${removedCount} expired tokens. Remaining: ${this.blacklistedTokens.size}`);
            }
        } catch (error) {
            this.logger.error('Error during token cleanup', error);
        }
    }

    /**
     * Limpia todos los tokens de la blacklist (usar con precaución)
     */
    async clearAllTokens(): Promise<void> {
        try {
            const count = this.blacklistedTokens.size;
            this.blacklistedTokens.clear();
            this.logger.warn(`All ${count} tokens cleared from blacklist`);
        } catch (error) {
            this.logger.error('Error clearing all tokens', error);
            throw error;
        }
    }

    /**
     * Verifica múltiples tokens de una vez
     * @param tokens - Array de tokens a verificar
     * @returns Map con el resultado de cada token
     */
    async checkMultipleTokens(tokens: string[]): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        for (const token of tokens) {
            results.set(token, await this.isBlacklisted(token));
        }

        return results;
    }
}