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
import { DoctoralLearningService } from './doctoral-learning.service.js';
import { SubmitExerciseAttemptDto } from './dto/submit-exercise-attempt.dto.js';
import { SubmitExamAnswerDto } from './dto/submit-exam-answer.dto.js';
import { SubmitSurveyResponsesDto } from './dto/submit-survey-responses.dto.js';

/**
 * Superficie "estudiar" del propio alumno de doctorado — nunca recibe un
 * doctoralStudentProfileId del cliente, se resuelve internamente en el
 * servicio a partir de user.id (mismo criterio que PracticeController /
 * TopicMasteryController del lado K-12).
 */
@Controller('doctoral-learning')
@Roles('doctoral_student')
export class DoctoralLearningController {
  constructor(private readonly learning: DoctoralLearningService) {}

  @Get('modules')
  listEnrolledModules(@CurrentUser() user: AuthenticatedUser) {
    return this.learning.listEnrolledModules(user.id);
  }

  @Get('modules/:moduleId')
  getModuleDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.learning.getModuleDetail(user.id, moduleId);
  }

  @Get('exercises/:exerciseId/hints')
  getExerciseHints(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.learning.getExerciseHints(user.id, exerciseId);
  }

  @Post('exercises/:exerciseId/attempts')
  submitExerciseAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: SubmitExerciseAttemptDto,
  ) {
    return this.learning.submitExerciseAttempt(user.id, exerciseId, dto);
  }

  @Post('modules/:moduleId/exam/start')
  startExamAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.learning.startExamAttempt(user.id, moduleId);
  }

  @Get('exam-attempts/:attemptId')
  getExamAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.learning.getExamAttempt(user.id, attemptId);
  }

  @Post('exam-attempts/:attemptId/answers')
  submitExamAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitExamAnswerDto,
  ) {
    return this.learning.submitExamAnswer(user.id, attemptId, dto);
  }

  @Post('exam-attempts/:attemptId/submit')
  submitExam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.learning.submitExam(user.id, attemptId);
  }

  @Get('modules/:moduleId/survey')
  getModuleSurvey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.learning.getModuleSurvey(user.id, moduleId);
  }

  @Post('modules/:moduleId/survey/responses')
  submitModuleSurvey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: SubmitSurveyResponsesDto,
  ) {
    return this.learning.submitModuleSurvey(user.id, moduleId, dto);
  }

  @Get('me/progress')
  getMyProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.learning.getMyProgress(user.id);
  }
}
