import { Module } from '@nestjs/common';
import { DoctoralAnalyticsController } from './doctoral-analytics.controller.js';
import { DoctoralAnalyticsService } from './doctoral-analytics.service.js';

@Module({
  controllers: [DoctoralAnalyticsController],
  providers: [DoctoralAnalyticsService],
  exports: [DoctoralAnalyticsService],
})
export class DoctoralAnalyticsModule {}
