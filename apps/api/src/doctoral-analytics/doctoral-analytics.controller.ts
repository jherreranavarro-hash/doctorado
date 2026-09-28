import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/types.js';
import { DoctoralAnalyticsService } from './doctoral-analytics.service.js';

/**
 * Reportería docente del Dominio Doctorado: mapa de calor de competencias
 * (por cohorte y por alumno), informe de debilidades/fortalezas por alumno,
 * KPIs agregados de cohorte, e historial crudo de intentos. Cada handler
 * delega en el servicio, que revalida pertenencia sobre la cohorte/alumno en
 * cada llamada — nunca se confía en un id de cliente sin ese chequeo.
 */
@Controller('doctoral-analytics')
@Roles('doctoral_professor')
export class DoctoralAnalyticsController {
  constructor(private readonly analytics: DoctoralAnalyticsService) {}

  @Get('me/cohorts')
  getMyCohorts(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.getMyCohorts(user.id);
  }

  @Get('cohorts/:cohortId/heatmap')
  getCohortHeatmap(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ) {
    return this.analytics.getCohortHeatmap(user.id, cohortId);
  }

  @Get('students/:studentId/heatmap')
  getStudentHeatmap(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.analytics.getStudentHeatmap(user.id, studentId);
  }

  @Get('students/:studentId/report')
  getStudentReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.analytics.getStudentReport(user.id, studentId);
  }

  @Get('cohorts/:cohortId/kpis')
  getCohortKpis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ) {
    return this.analytics.getCohortKpis(user.id, cohortId);
  }

  @Get('students/:studentId/attempts')
  getStudentAttempts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.analytics.getStudentAttempts(user.id, studentId);
  }
}
