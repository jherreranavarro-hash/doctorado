import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SessionService } from '../src/common/services/session.service.js';
import { CsrfService } from '../src/common/services/csrf.service.js';

interface ExerciseAttemptResponseBody {
  isCorrect: boolean;
  correctOptionKey?: string;
}

interface ExamStartResponseBody {
  attemptId: string;
  questions: Array<{ questionId: string; options?: { optionKey: string }[] }>;
}

interface ExamSubmitResponseBody {
  score: number;
  passed: boolean;
  status: string;
}

interface ModuleSurveyResponseBody {
  questions: Array<{ questionId: string }>;
}

interface DoctoralAdminOverviewResponseBody {
  programs: Array<{ programId: string }>;
}

/**
 * Pruebas de integración contra Postgres real (no mocks) para las
 * invariantes de seguridad/negocio del Dominio Doctorado exigidas
 * explícitamente por el encargo: aislamiento por cohorte/organización,
 * contenido de módulo gateado por inscripción explícita, corrección de
 * ejercicios 100% server-side, nota del examen final en escala 10-70 sin
 * fuga de respuestas antes de entregar, y anti-doble-envío de la encuesta de
 * cierre. Crea su propia organización/programa/cohorte de prueba (no
 * depende del seed de demostración) para quedar aislada de otras suites.
 */
describe('Dominio Doctorado — seguridad e integridad (integración)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sessions: SessionService;
  let csrf: CsrfService;

  let organizationId: string;
  let moduleAId: string; // módulo al que la estudiante SÍ está inscrita
  let moduleBId: string; // módulo al que NO está inscrita
  let exerciseId: string;
  let correctOptionKey: string;
  let cohortId: string;

  async function createDoctoralSession(
    roleKey: 'doctoral_student' | 'doctoral_professor' | 'doctoral_admin',
  ): Promise<{ userId: string; cookie: string; csrfToken: string }> {
    const email = `test-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: '!test-fixture-disabled', status: 'active' },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { key: roleKey },
    });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id, organizationId },
    });
    const session = await sessions.createSession(user.id, {});
    return {
      userId: user.id,
      cookie: `sid=${session.sessionId}`,
      csrfToken: csrf.computeToken(session.sessionId),
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    sessions = app.get(SessionService);
    csrf = app.get(CsrfService);

    const organization = await prisma.organization.create({
      data: {
        name: 'Org de prueba Doctorado',
        slug: `test-doctorado-${randomUUID()}`,
      },
    });
    organizationId = organization.id;

    const program = await prisma.doctoralProgram.create({
      data: {
        organizationId,
        key: `test-programa-${randomUUID()}`,
        name: 'Programa de prueba',
        totalSemesters: 8,
      },
    });

    const cohort = await prisma.doctoralCohort.create({
      data: {
        programId: program.id,
        name: 'Cohorte de prueba',
        startYear: 2026,
      },
    });
    cohortId = cohort.id;

    const moduleA = await prisma.programModule.create({
      data: {
        programId: program.id,
        title: 'Módulo A (con inscripción)',
        semester: 1,
        credits: 7,
        type: 'course',
        order: 1,
        hasRealContent: true,
      },
    });
    moduleAId = moduleA.id;

    const moduleB = await prisma.programModule.create({
      data: {
        programId: program.id,
        title: 'Módulo B (sin inscripción)',
        semester: 1,
        credits: 7,
        type: 'course',
        order: 2,
        hasRealContent: true,
      },
    });
    moduleBId = moduleB.id;

    const topic = await prisma.moduleTopic.create({
      data: { moduleId: moduleAId, key: 'tema-1', title: 'Tema 1', order: 1 },
    });

    const exercise = await prisma.doctoralExercise.create({
      data: {
        topicId: topic.id,
        key: 'ejercicio-1',
        type: 'mc',
        difficulty: 'introductorio',
        order: 1,
        statement: '¿2 + 2?',
        status: 'published',
        options: {
          create: [
            { optionKey: 'a', text: '4', isCorrect: true, order: 1 },
            { optionKey: 'b', text: '5', isCorrect: false, order: 2 },
          ],
        },
      },
    });
    exerciseId = exercise.id;
    correctOptionKey = 'a';

    await prisma.doctoralExam.create({
      data: {
        moduleId: moduleAId,
        title: 'Examen de prueba',
        questionCount: 2,
        timeLimitMinutes: 60,
        minScore: 10,
        maxScore: 70,
        passScore: 40,
        questions: {
          create: [
            {
              order: 1,
              type: 'mc',
              statement: 'Pregunta 1',
              options: {
                create: [
                  {
                    optionKey: 'a',
                    text: 'Correcta',
                    isCorrect: true,
                    order: 1,
                  },
                  {
                    optionKey: 'b',
                    text: 'Incorrecta',
                    isCorrect: false,
                    order: 2,
                  },
                ],
              },
            },
            {
              order: 2,
              type: 'mc',
              statement: 'Pregunta 2',
              options: {
                create: [
                  {
                    optionKey: 'a',
                    text: 'Correcta',
                    isCorrect: true,
                    order: 1,
                  },
                  {
                    optionKey: 'b',
                    text: 'Incorrecta',
                    isCorrect: false,
                    order: 2,
                  },
                ],
              },
            },
          ],
        },
      },
      include: { questions: true },
    });

    await prisma.doctoralModuleSurvey.create({
      data: {
        moduleId: moduleAId,
        title: 'Encuesta de prueba',
        questions: {
          create: [
            {
              order: 1,
              type: 'likert_1_5',
              prompt: '¿Qué tan claro fue el módulo?',
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Contenido de módulo requiere inscripción explícita', () => {
    it('un módulo sin DoctoralModuleEnrollment devuelve 403, no 200', async () => {
      const student = await createDoctoralSession('doctoral_student');
      await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante sin inscripción',
        },
      });

      await request(app.getHttpServer())
        .get(`/doctoral-learning/modules/${moduleBId}`)
        .set('Cookie', student.cookie)
        .expect(403);
    });

    it('un módulo CON inscripción sí es accesible', async () => {
      const student = await createDoctoralSession('doctoral_student');
      const profile = await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante inscrita',
        },
      });
      await prisma.doctoralModuleEnrollment.create({
        data: {
          doctoralStudentProfileId: profile.id,
          moduleId: moduleAId,
          status: 'in_progress',
        },
      });

      await request(app.getHttpServer())
        .get(`/doctoral-learning/modules/${moduleAId}`)
        .set('Cookie', student.cookie)
        .expect(200);
    });
  });

  describe('Corrección de ejercicios 100% server-side', () => {
    it('el DTO no declara un campo isCorrect: un intento de forzarlo desde el cliente es rechazado de plano (whitelist + forbidNonWhitelisted)', async () => {
      const student = await createDoctoralSession('doctoral_student');
      const profile = await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante',
        },
      });
      await prisma.doctoralModuleEnrollment.create({
        data: {
          doctoralStudentProfileId: profile.id,
          moduleId: moduleAId,
          status: 'in_progress',
        },
      });

      await request(app.getHttpServer())
        .post(`/doctoral-learning/exercises/${exerciseId}/attempts`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({ selectedOptionKey: 'b', isCorrect: true })
        .expect(400);
    });

    it('alternativa incorrecta da isCorrect=false (corrección real server-side, no lo que el cliente afirme)', async () => {
      const student = await createDoctoralSession('doctoral_student');
      const profile = await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante',
        },
      });
      await prisma.doctoralModuleEnrollment.create({
        data: {
          doctoralStudentProfileId: profile.id,
          moduleId: moduleAId,
          status: 'in_progress',
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/doctoral-learning/exercises/${exerciseId}/attempts`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({ selectedOptionKey: 'b' })
        .expect(201);

      const body = res.body as ExerciseAttemptResponseBody;
      expect(body.isCorrect).toBe(false);
      expect(body.correctOptionKey).toBe(correctOptionKey);
    });

    it('alternativa correcta da isCorrect=true', async () => {
      const student = await createDoctoralSession('doctoral_student');
      const profile = await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante',
        },
      });
      await prisma.doctoralModuleEnrollment.create({
        data: {
          doctoralStudentProfileId: profile.id,
          moduleId: moduleAId,
          status: 'in_progress',
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/doctoral-learning/exercises/${exerciseId}/attempts`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({ selectedOptionKey: correctOptionKey })
        .expect(201);

      expect((res.body as ExerciseAttemptResponseBody).isCorrect).toBe(true);
    });
  });

  describe('Examen final: nota en escala 10-70, sin fuga de respuestas antes de entregar', () => {
    it('todas las respuestas correctas -> nota = maxScore (70) y passed = true; nada se revela hasta el submit final', async () => {
      const student = await createDoctoralSession('doctoral_student');
      const profile = await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante',
        },
      });
      await prisma.doctoralModuleEnrollment.create({
        data: {
          doctoralStudentProfileId: profile.id,
          moduleId: moduleAId,
          status: 'in_progress',
        },
      });

      const startRes = await request(app.getHttpServer())
        .post(`/doctoral-learning/modules/${moduleAId}/exam/start`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({})
        .expect(201);

      const startBody = startRes.body as ExamStartResponseBody;
      const attemptId = startBody.attemptId;
      const questions = startBody.questions;
      expect(questions).toHaveLength(2);
      // "Sin ayuda": mientras el intento sigue en curso, isCorrect viaja
      // siempre en null (nunca el valor real) y correctOptionKey/modelAnswer
      // ni siquiera se serializan (quedan `undefined` en la vista).
      for (const q of questions as Array<Record<string, unknown>>) {
        expect(q.isCorrect).toBeNull();
        expect(q).not.toHaveProperty('correctOptionKey');
        expect(q).not.toHaveProperty('modelAnswer');
      }

      for (const q of questions) {
        const answerRes = await request(app.getHttpServer())
          .post(`/doctoral-learning/exam-attempts/${attemptId}/answers`)
          .set('Cookie', student.cookie)
          .set('X-CSRF-Token', student.csrfToken)
          .send({ questionId: q.questionId, selectedOptionKey: 'a' })
          .expect(201);
        // Tampoco se revela corrección pregunta a pregunta.
        expect(answerRes.body).not.toHaveProperty('isCorrect');
      }

      const submitRes = await request(app.getHttpServer())
        .post(`/doctoral-learning/exam-attempts/${attemptId}/submit`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({})
        .expect(201);

      const submitBody = submitRes.body as ExamSubmitResponseBody;
      expect(submitBody.score).toBe(70);
      expect(submitBody.passed).toBe(true);
      expect(submitBody.status).toBe('submitted');
    });

    it('todas las respuestas incorrectas -> nota = minScore (10) y passed = false', async () => {
      const student = await createDoctoralSession('doctoral_student');
      const profile = await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante',
        },
      });
      await prisma.doctoralModuleEnrollment.create({
        data: {
          doctoralStudentProfileId: profile.id,
          moduleId: moduleAId,
          status: 'in_progress',
        },
      });

      const startRes = await request(app.getHttpServer())
        .post(`/doctoral-learning/modules/${moduleAId}/exam/start`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({})
        .expect(201);
      const startBody = startRes.body as ExamStartResponseBody;
      const attemptId = startBody.attemptId;
      const questions = startBody.questions;

      for (const q of questions) {
        await request(app.getHttpServer())
          .post(`/doctoral-learning/exam-attempts/${attemptId}/answers`)
          .set('Cookie', student.cookie)
          .set('X-CSRF-Token', student.csrfToken)
          .send({ questionId: q.questionId, selectedOptionKey: 'b' })
          .expect(201);
      }

      const submitRes = await request(app.getHttpServer())
        .post(`/doctoral-learning/exam-attempts/${attemptId}/submit`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({})
        .expect(201);

      const submitBody = submitRes.body as ExamSubmitResponseBody;
      expect(submitBody.score).toBe(10);
      expect(submitBody.passed).toBe(false);
    });
  });

  describe('Encuesta de cierre de módulo: anti-doble-envío', () => {
    it('un segundo envío es rechazado con 409, no crea una segunda fila', async () => {
      const student = await createDoctoralSession('doctoral_student');
      const profile = await prisma.doctoralStudentProfile.create({
        data: {
          userId: student.userId,
          organizationId,
          displayName: 'Estudiante',
        },
      });
      await prisma.doctoralModuleEnrollment.create({
        data: {
          doctoralStudentProfileId: profile.id,
          moduleId: moduleAId,
          status: 'in_progress',
        },
      });

      const surveyRes = await request(app.getHttpServer())
        .get(`/doctoral-learning/modules/${moduleAId}/survey`)
        .set('Cookie', student.cookie)
        .expect(200);
      const questionId = (surveyRes.body as ModuleSurveyResponseBody)
        .questions[0].questionId;

      await request(app.getHttpServer())
        .post(`/doctoral-learning/modules/${moduleAId}/survey/responses`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({ answers: [{ questionId, likertValue: 4 }] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/doctoral-learning/modules/${moduleAId}/survey/responses`)
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrfToken)
        .send({ answers: [{ questionId, likertValue: 1 }] })
        .expect(409);

      const responseCount = await prisma.doctoralModuleSurveyResponse.count({
        where: { doctoralStudentProfileId: profile.id },
      });
      expect(responseCount).toBe(1);
    });
  });

  describe('Aislamiento por cohorte (docente)', () => {
    it('un docente no asignado a la cohorte no puede ver su mapa de calor ni sus KPIs', async () => {
      const outsiderProfessor =
        await createDoctoralSession('doctoral_professor');
      await prisma.doctoralProfessorProfile.create({
        data: {
          userId: outsiderProfessor.userId,
          organizationId,
          displayName: 'Docente sin acceso',
        },
      });

      await request(app.getHttpServer())
        .get(`/doctoral-analytics/cohorts/${cohortId}/heatmap`)
        .set('Cookie', outsiderProfessor.cookie)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/doctoral-analytics/cohorts/${cohortId}/kpis`)
        .set('Cookie', outsiderProfessor.cookie)
        .expect(403);
    });

    it('un docente SÍ asignado a la cohorte puede ver su mapa de calor', async () => {
      const professor = await createDoctoralSession('doctoral_professor');
      const professorProfile = await prisma.doctoralProfessorProfile.create({
        data: {
          userId: professor.userId,
          organizationId,
          displayName: 'Docente con acceso',
        },
      });
      await prisma.doctoralCohortProfessor.create({
        data: { cohortId, doctoralProfessorProfileId: professorProfile.id },
      });

      await request(app.getHttpServer())
        .get(`/doctoral-analytics/cohorts/${cohortId}/heatmap`)
        .set('Cookie', professor.cookie)
        .expect(200);
    });
  });

  describe('Administrador: aislamiento organizacional', () => {
    it('el overview de un admin nunca incluye programas de otra organización', async () => {
      const admin = await createDoctoralSession('doctoral_admin');

      const res = await request(app.getHttpServer())
        .get('/doctoral-admin/overview')
        .set('Cookie', admin.cookie)
        .expect(200);

      const programKeys = (
        res.body as DoctoralAdminOverviewResponseBody
      ).programs.map((p) => p.programId);
      // Este admin es de la organización de prueba recién creada — su
      // overview no puede traer el programa "psicologia" real del seed de
      // demostración (organización distinta).
      const realDemoProgram = await prisma.doctoralProgram.findUnique({
        where: { key: 'psicologia' },
      });
      if (realDemoProgram) {
        expect(programKeys).not.toContain(realDemoProgram.id);
      }
    });
  });
});
