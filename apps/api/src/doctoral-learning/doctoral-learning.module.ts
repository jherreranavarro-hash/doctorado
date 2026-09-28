import { Module } from '@nestjs/common';
import { DoctoralLearningController } from './doctoral-learning.controller.js';
import { DoctoralLearningService } from './doctoral-learning.service.js';

// Sin `imports`: PrismaModule y DoctoralCommonModule son @Global (ver
// prisma.module.ts / doctoral-common.module.ts) — SemanticGradingService y
// CompetencyRollupService quedan disponibles por inyección sin declararlos aquí.
@Module({
  controllers: [DoctoralLearningController],
  providers: [DoctoralLearningService],
})
export class DoctoralLearningModule {}
