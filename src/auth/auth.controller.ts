import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthHealthService } from './services/Health.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { CircuitBreakerState } from './Dto/circuit-breaker.dto';
import { HealthStatus } from './Dto/health-status.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly authHealthService: AuthHealthService,
        private readonly circuitBreakerService: CircuitBreakerService,
    ) { }

    @Get('oauth2/redirect')
    async oauth2Redirect(@Res() res: Response) {
        const redirectUrl = this.authService.getOAuth2RedirectUrl();
        res.redirect(redirectUrl);
    }

    @Get('oauth2/callback')
    async oauth2Callback(@Req() req: Request, @Res() res: Response) {
        try {
            const code = req.query.code as string;

            if (!code) {
                return res.status(400).send('Authorization code is required');
            }

            // Intercambia el código de autorización por tokens
            const oauthResult = await this.authService.exchangeCodeForTokens(code);

            // Almacena los tokens en sesión
            req.session.accessToken = oauthResult.accessToken;
            req.session.refreshToken = oauthResult.refreshToken;
            req.session.user = oauthResult.user;

            // Redirige al usuario a la aplicación
            res.redirect(this.authService.getRedirectUrl());
        } catch (error) {
            console.error('OAuth2 callback error:', error);
            res.status(401).send('Authentication failed');
        }
    }

    @Get('logout')
    async logout(@Req() req: Request, @Res() res: Response) {
        try {
            const accessToken = req.session.accessToken;
            const refreshToken = req.session.refreshToken;

            if (accessToken && refreshToken) {
                await this.authService.logout(accessToken, refreshToken);
            }

            // Destruye la sesión
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
            });

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ message: 'Logout failed' });
        }
    }

    @Get('profile')
    async getProfile(@Req() req: Request, @Res() res: Response) {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        res.json(req.session.user);
    }

    @Get()
    @ApiOperation({ summary: 'Get overall health status' })
    @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
    async getHealth(): Promise<HealthStatus> {
        return await this.authHealthService.performHealthCheck();
    }
    
    @Get('detailed')
    @ApiOperation({ summary: 'Get detailed health information' })
    @ApiResponse({ status: 200, description: 'Detailed health information retrieved successfully' })
    async getDetailedHealth(): Promise<HealthStatus & { circuitBreakers: Record<string, CircuitBreakerState> }> {
        const healthStatus = await this.authHealthService.performHealthCheck();
        const circuitStates = this.circuitBreakerService.getCircuitStates();

        return {
            ...healthStatus,
            circuitBreakers: circuitStates,
        };
    }
}