import { Module } from '@nestjs/common';
import { GcpService } from './gcp.service';
import { GcpController } from './gcp.controller';

@Module({
  controllers: [GcpController],
  providers: [GcpService],
})
export class GcpModule {}
