import { Global, Module } from '@nestjs/common';
import { DoctoralFilesService } from './doctoral-files.service.js';
import { SemanticGradingService } from './semantic-grading.service.js';
import { CompetencyRollupService } from './competency-rollup.service.js';

@Global()
@Module({
  providers: [
    DoctoralFilesService,
    SemanticGradingService,
    CompetencyRollupService,
  ],
  exports: [
    DoctoralFilesService,
    SemanticGradingService,
    CompetencyRollupService,
  ],
})
export class DoctoralCommonModule {}
