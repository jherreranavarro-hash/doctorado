import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types.js';
import { DoctoralAssignmentsService } from './doctoral-assignments.service.js';
import { SubmitDoctoralAssignmentDto } from './dto/submit-doctoral-assignment.dto.js';
import { UploadDoctoralFileDto } from './dto/upload-doctoral-file.dto.js';

/** Lado alumno de "Dominio Doctorado" — ve solo las tareas que le son
 * visibles (ver DoctoralAssignmentsService.visibilityOrClause) y entrega sus
 * propias respuestas. */
@Controller('doctoral-assignments/me')
@Roles('doctoral_student')
export class DoctoralAssignmentsStudentController {
  constructor(private readonly assignments: DoctoralAssignmentsService) {}

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.assignments.listForStudent(user.id);
  }

  @Post('files')
  uploadSubmissionFile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDoctoralFileDto,
  ) {
    return this.assignments.uploadSubmissionFile(user.id, dto);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignments.getForStudent(user.id, id);
  }

  @Post(':id/submit')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitDoctoralAssignmentDto,
  ) {
    return this.assignments.submitAssignment(user.id, id, dto);
  }
}
