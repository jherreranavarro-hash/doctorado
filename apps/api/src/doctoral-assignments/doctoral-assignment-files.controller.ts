import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types.js';
import { DoctoralAssignmentsService } from './doctoral-assignments.service.js';

/** Descarga de archivos de "Dominio Doctorado" (plantilla de tarea o
 * entrega del alumno) — compartida entre docente y alumno; el chequeo de
 * pertenencia (quién puede ver cuál archivo) vive en
 * DoctoralAssignmentsService.downloadFile, no aquí. */
@Controller('doctoral-assignments/files')
@Roles('doctoral_professor', 'doctoral_student')
export class DoctoralAssignmentFilesController {
  constructor(private readonly assignments: DoctoralAssignmentsService) {}

  @Get(':id')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.assignments.downloadFile(user.id, id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': file.data.length,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
    });
    res.send(file.data);
  }
}
