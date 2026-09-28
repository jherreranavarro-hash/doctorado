import { Module } from '@nestjs/common';
import { DoctoralSyllabusController } from './doctoral-syllabus.controller.js';
import { DoctoralSyllabusService } from './doctoral-syllabus.service.js';

@Module({
  controllers: [DoctoralSyllabusController],
  providers: [DoctoralSyllabusService],
})
export class DoctoralSyllabusModule {}
