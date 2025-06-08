import { Module } from '@nestjs/common';
import { KyxService } from './kyx.service';
import { KyxController } from './kyx.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [KyxController],
  providers: [KyxService],
})
export class KyxModule {}
