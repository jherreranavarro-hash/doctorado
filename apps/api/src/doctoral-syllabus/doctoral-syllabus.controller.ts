import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types.js';
import { DoctoralSyllabusService } from './doctoral-syllabus.service.js';
import { UploadSyllabusDto } from './dto/upload-syllabus.dto.js';

/** Syllabus por módulo — compartido entre los 3 roles del dominio (admin y
 * docente suben/quitan, los 3 pueden descargar). La verificación de
 * pertenencia real vive en DoctoralSyllabusService, no aquí. */
@Controller()
@Roles('doctoral_admin', 'doctoral_professor', 'doctoral_student')
export class DoctoralSyllabusController {
  constructor(private readonly syllabus: DoctoralSyllabusService) {}

  @Get('program-modules')
  listModules(
    @CurrentUser() user: AuthenticatedUser,
    @Query('programId', ParseUUIDPipe) programId: string,
  ) {
    return this.syllabus.listModulesForProgram(user, programId);
  }

  @Roles('doctoral_admin', 'doctoral_professor')
  @Post('program-modules/:moduleId/syllabus')
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UploadSyllabusDto,
  ) {
    return this.syllabus.upload(user, moduleId, dto);
  }

  @Roles('doctoral_admin', 'doctoral_professor')
  @Delete('program-modules/:moduleId/syllabus')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.syllabus.remove(user, moduleId);
  }

  @Get('program-modules/:moduleId/syllabus/meta')
  getMeta(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.syllabus.getMeta(user, moduleId);
  }

  @Get('program-modules/:moduleId/syllabus')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.syllabus.download(user, moduleId);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': file.data.length,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
    });
    res.send(file.data);
  }
}
