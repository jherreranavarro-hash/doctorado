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
import { resolveDoctoralAdminOrganizationId } from '../doctoral-common/doctoral-common.helpers.js';
import { DoctoralAdminService } from './doctoral-admin.service.js';
import { CreateDoctoralProgramDto } from './dto/create-doctoral-program.dto.js';
import { UpdateDoctoralProgramDto } from './dto/update-doctoral-program.dto.js';
import { CreateProgramModuleDto } from './dto/create-program-module.dto.js';
import { UpdateProgramModuleDto } from './dto/update-program-module.dto.js';
import { CreateDoctoralCohortDto } from './dto/create-doctoral-cohort.dto.js';

@Controller('doctoral-admin')
@Roles('doctoral_admin')
export class DoctoralAdminController {
  constructor(private readonly doctoralAdmin: DoctoralAdminService) {}

  @Get('programs')
  listPrograms(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.listPrograms(organizationId);
  }

  @Post('programs')
  createProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDoctoralProgramDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.createProgram(organizationId, user.id, dto);
  }

  @Patch('programs/:programId')
  updateProgram(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body() dto: UpdateDoctoralProgramDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.updateProgram(
      organizationId,
      user.id,
      programId,
      dto,
    );
  }

  @Get('programs/:programId/modules')
  listModules(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programId', ParseUUIDPipe) programId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.listModules(organizationId, programId);
  }

  @Post('programs/:programId/modules')
  createModule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body() dto: CreateProgramModuleDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.createModule(
      organizationId,
      user.id,
      programId,
      dto,
    );
  }

  @Patch('programs/:programId/modules/:moduleId')
  updateModule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programId', ParseUUIDPipe) programId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateProgramModuleDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.updateModule(
      organizationId,
      user.id,
      programId,
      moduleId,
      dto,
    );
  }

  @Delete('programs/:programId/modules/:moduleId')
  deleteModule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programId', ParseUUIDPipe) programId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.softDeleteModule(
      organizationId,
      user.id,
      programId,
      moduleId,
    );
  }

  @Get('programs/:programId/cohorts')
  listCohorts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programId', ParseUUIDPipe) programId: string,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.listCohorts(organizationId, programId);
  }

  @Post('programs/:programId/cohorts')
  createCohort(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body() dto: CreateDoctoralCohortDto,
  ) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.createCohort(
      organizationId,
      user.id,
      programId,
      dto,
    );
  }

  @Get('overview')
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    const organizationId = resolveDoctoralAdminOrganizationId(user);
    return this.doctoralAdmin.getOverview(organizationId);
  }
}
