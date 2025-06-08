import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { KyxModule } from './kyx/kyx.module';
import { PrismaModule } from './prisma/prisma.module';
import { GcpModule } from './gcp/gcp.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import oauthConfig from './config/oauth.config';

@Module({
  imports: [
    UserModule,
    KyxModule,
    PrismaModule,
    GcpModule,
    AuthModule,
    ConfigModule.forRoot({
      load: [oauthConfig],
      isGlobal: true
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
