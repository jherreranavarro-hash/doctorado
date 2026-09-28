import { Module } from '@nestjs/common';
import { DoctoralAssignmentsController } from './doctoral-assignments.controller.js';
import { DoctoralAssignmentsStudentController } from './doctoral-assignments-student.controller.js';
import { DoctoralAssignmentFilesController } from './doctoral-assignment-files.controller.js';
import { DoctoralAssignmentsService } from './doctoral-assignments.service.js';

// DoctoralFilesService (usado por el service) viene de DoctoralCommonModule,
// que es @Global() — no hace falta importarlo aquí.
@Module({
  controllers: [
    DoctoralAssignmentsController,
    DoctoralAssignmentsStudentController,
    DoctoralAssignmentFilesController,
  ],
  providers: [DoctoralAssignmentsService],
  exports: [DoctoralAssignmentsService],
})
export class DoctoralAssignmentsModule {}
