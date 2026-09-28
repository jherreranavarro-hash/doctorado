import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types.js';
import { resolveDoctoralAdminOrganizationId } from '../doctoral-common/doctoral-common.helpers.js';
import { DoctoralAdminUsersService } from './doctoral-admin-users.service.js';
import { CreateDoctoralStudentDto } from './dto/create-doctoral-student.dto.js';
import { UpdateDoctoralStudentDto } from './dto/update-doctoral-student.dto.js';
import { CreateDoctoralProfessorDto } from './dto/create-doctoral-professor.dto.js';
import { AssignProfessorToCohortDto } from './dto/assign-professor-to-cohort.dto.js';

@Controller('doctoral-admin')
@Roles('doctoral_admin')
export class DoctoralAdminUsersController {
  constructor(private readonly doctoralAdminUsers: DoctoralAdminUsersService) {}

  @Post('students')
  createStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDoctoralStudentDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.createStudent(organizationId, user.id, dto);
  }

  @Get('students')
  listStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('query') query?: string,
    @Query('cohortId') cohortId?: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.listStudents(organizationId, {
      query,
      cohortId,
    });
  }

  @Patch('students/:studentProfileId')
  updateStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
    @Body() dto: UpdateDoctoralStudentDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.updateStudent(
      organizationId,
      user.id,
      studentProfileId,
      dto,
    );
  }

  @Post('students/:studentProfileId/suspend')
  suspendStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.setStudentSuspended(
      organizationId,
      user.id,
      studentProfileId,
      true,
    );
  }

  @Post('students/:studentProfileId/reactivate')
  reactivateStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.setStudentSuspended(
      organizationId,
      user.id,
      studentProfileId,
      false,
    );
  }

  @Delete('students/:studentProfileId')
  deleteStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.softDeleteStudent(
      organizationId,
      user.id,
      studentProfileId,
    );
  }

  @Post('students/:studentProfileId/cohorts/:cohortId')
  enrollStudentInCohort(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.enrollStudentInCohort(
      organizationId,
      user.id,
      studentProfileId,
      cohortId,
    );
  }

  @Delete('students/:studentProfileId/cohorts/:cohortId')
  removeStudentFromCohort(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.removeStudentFromCohort(
      organizationId,
      user.id,
      studentProfileId,
      cohortId,
    );
  }

  @Post('students/:studentProfileId/modules/:moduleId')
  enrollStudentInModule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.enrollStudentInModule(
      organizationId,
      user.id,
      studentProfileId,
      moduleId,
    );
  }

  @Delete('students/:studentProfileId/modules/:moduleId')
  removeModuleEnrollment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentProfileId', ParseUUIDPipe) studentProfileId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.removeModuleEnrollment(
      organizationId,
      user.id,
      studentProfileId,
      moduleId,
    );
  }

  @Post('professors')
  createProfessor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDoctoralProfessorDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.createProfessor(
      organizationId,
      user.id,
      dto,
    );
  }

  @Post('cohorts/:cohortId/professors')
  assignProfessorToCohort(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
    @Body() dto: AssignProfessorToCohortDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.assignProfessorToCohort(
      organizationId,
      user.id,
      cohortId,
      dto,
    );
  }

  @Get('professors')
  listProfessors(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.listProfessors(organizationId);
  }

  @Delete('cohorts/:cohortId/professors/:professorProfileId')
  removeProfessorFromCohort(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
    @Param('professorProfileId', ParseUUIDPipe) professorProfileId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdminUsers.removeProfessorFromCohort(
      organizationId,
      user.id,
      cohortId,
      professorProfileId,
    );
  }
}
