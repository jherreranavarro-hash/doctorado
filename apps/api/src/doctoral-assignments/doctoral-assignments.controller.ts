import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types.js';
import { DoctoralAssignmentsService } from './doctoral-assignments.service.js';
import { CreateDoctoralAssignmentDto } from './dto/create-doctoral-assignment.dto.js';
import { UpdateDoctoralAssignmentDto } from './dto/update-doctoral-assignment.dto.js';
import { UploadDoctoralFileDto } from './dto/upload-doctoral-file.dto.js';
import { GradeDoctoralSubmissionDto } from './dto/grade-doctoral-submission.dto.js';
import { CreateDoctoralStudentGroupDto } from './dto/create-doctoral-student-group.dto.js';
import { UpdateDoctoralStudentGroupDto } from './dto/update-doctoral-student-group.dto.js';

/** Lado docente de "Dominio Doctorado" — autoría de tareas, envío a la
 * cohorte (individual/grupal/todos), revisión y calificación de entregas.
 * Ver DoctoralAssignmentsStudentController para el lado alumno y
 * DoctoralAssignmentFilesController para la descarga de archivos, ambos
 * compartiendo este mismo service. */
@Controller('doctoral-assignments')
@Roles('doctoral_professor')
export class DoctoralAssignmentsController {
  constructor(private readonly assignments: DoctoralAssignmentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDoctoralAssignmentDto,
  ) {
    return this.assignments.createAssignment(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctoralAssignmentDto,
  ) {
    return this.assignments.updateAssignment(user.id, id, dto);
  }

  @Post('files')
  uploadTemplateFile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDoctoralFileDto,
  ) {
    return this.assignments.uploadTemplateFile(user.id, dto);
  }

  @Get('cohorts/:cohortId')
  listForCohort(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ) {
    return this.assignments.listForCohort(user.id, cohortId);
  }

  @Get(':id/submissions')
  listSubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignments.listSubmissions(user.id, id);
  }

  @Get(':id/submissions/:submissionId')
  getSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    return this.assignments.getSubmissionForProfessor(
      user.id,
      id,
      submissionId,
    );
  }

  @Post(':id/submissions/:submissionId/grade')
  gradeSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeDoctoralSubmissionDto,
  ) {
    return this.assignments.gradeSubmission(user.id, id, submissionId, dto);
  }

  @Post('cohorts/:cohortId/groups')
  createGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
    @Body() dto: CreateDoctoralStudentGroupDto,
  ) {
    return this.assignments.createGroup(user.id, cohortId, dto);
  }

  @Get('cohorts/:cohortId/groups')
  listGroups(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ) {
    return this.assignments.listGroups(user.id, cohortId);
  }

  @Patch('groups/:groupId')
  updateGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateDoctoralStudentGroupDto,
  ) {
    return this.assignments.updateGroup(user.id, groupId, dto);
  }

  @Delete('groups/:groupId')
  deleteGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.assignments.deleteGroup(user.id, groupId);
  }
}
