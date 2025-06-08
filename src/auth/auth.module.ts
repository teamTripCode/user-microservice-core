import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthProviderService } from './services/AuthProvider.service';
import { TokenBlacklistService } from './services/TokenBlacklist.service';
import { OAuth2Strategy } from './strategies/oauth2.strategy';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth.controller';
import { EnhancedAuthProviderService } from './services/enhanced-auth-provider.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('AUTH_SERVICE_TIMEOUT', 5000),
        maxRedirects: 5,
        retries: 3,
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthProviderService,
    TokenBlacklistService,
    OAuth2Strategy,
    // JwtStrategy,
    JwtAuthGuard,
    {
      provide: AuthProviderService,
      useClass: EnhancedAuthProviderService,
    }
  ],
  exports: [
    AuthService,
    AuthProviderService,
    TokenBlacklistService,
    JwtAuthGuard,
  ]
})
export class AuthModule { }
