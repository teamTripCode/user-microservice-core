import { Module } from '@nestjs/common';
import { KyxService } from './kyx.service';
import { KyxController } from './kyx.controller';

@Module({
  controllers: [KyxController],
  providers: [KyxService],
})
export class KyxModule {}
