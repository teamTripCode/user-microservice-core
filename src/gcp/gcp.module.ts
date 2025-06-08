import { Module } from '@nestjs/common';
import { GcpService } from './gcp.service';
import { GcpController } from './gcp.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GcpController],
  providers: [GcpService],
})
export class GcpModule {}
