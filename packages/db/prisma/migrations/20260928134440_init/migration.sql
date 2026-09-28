-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'pending');

-- CreateEnum
CREATE TYPE "publication_state" AS ENUM ('draft', 'in_review', 'approved', 'published', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "doctoral_module_type" AS ENUM ('course', 'workshop', 'seminar', 'tutoring', 'elective', 'thesis_project', 'thesis', 'qualifying_exam');

-- CreateEnum
CREATE TYPE "doctoral_difficulty" AS ENUM ('introductorio', 'intermedio', 'avanzado', 'experto');

-- CreateEnum
CREATE TYPE "doctoral_exercise_type" AS ENUM ('mc', 'short_answer', 'case_analysis');

-- CreateEnum
CREATE TYPE "doctoral_module_enrollment_status" AS ENUM ('in_progress', 'completed', 'withdrawn');

-- CreateEnum
CREATE TYPE "doctoral_exam_attempt_status" AS ENUM ('in_progress', 'submitted', 'expired');

-- CreateEnum
CREATE TYPE "doctoral_survey_question_type" AS ENUM ('likert_1_5', 'short_answer');

-- CreateEnum
CREATE TYPE "doctoral_assignment_status" AS ENUM ('draft', 'published', 'closed');

-- CreateEnum
CREATE TYPE "doctoral_assignment_question_type" AS ENUM ('mc', 'short_answer', 'essay', 'file_upload');

-- CreateEnum
CREATE TYPE "doctoral_assignment_submission_status" AS ENUM ('draft', 'submitted', 'graded');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'pending',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "ipHash" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "ipHash" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_programs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "totalSemesters" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_cohorts" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_student_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_professor_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_professor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_cohort_students" (
    "id" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctoral_cohort_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_cohort_professors" (
    "id" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "doctoralProfessorProfileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctoral_cohort_professors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_modules" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "type" "doctoral_module_type" NOT NULL DEFAULT 'course',
    "order" INTEGER NOT NULL,
    "hasRealContent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "program_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_topics" (
    "id" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "module_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_concept_contents" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "publication_state" NOT NULL DEFAULT 'draft',
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keyIdeas" JSONB NOT NULL,
    "createdBy" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_concept_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exercises" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" "doctoral_exercise_type" NOT NULL,
    "difficulty" "doctoral_difficulty" NOT NULL,
    "order" INTEGER NOT NULL,
    "scenario" TEXT,
    "statement" TEXT NOT NULL,
    "modelAnswer" JSONB,
    "status" "publication_state" NOT NULL DEFAULT 'draft',
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctoral_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exercise_options" (
    "id" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "optionKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "doctoral_exercise_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exercise_hints" (
    "id" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "doctoral_exercise_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exercise_attempts" (
    "id" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "responseText" TEXT,
    "selectedOptionKey" TEXT,
    "isCorrect" BOOLEAN,
    "semanticScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctoral_exercise_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_module_enrollments" (
    "id" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "status" "doctoral_module_enrollment_status" NOT NULL DEFAULT 'in_progress',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_module_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_areas" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competency_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_competency_weights" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "competencyAreaId" UUID NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "topic_competency_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_competency_weights" (
    "id" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "competencyAreaId" UUID NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "exercise_competency_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_attempt_competency_results" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "competencyAreaId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "doctoral_attempt_competency_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_student_competency_scores" (
    "id" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,
    "competencyAreaId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctoral_student_competency_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exams" (
    "id" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "timeLimitMinutes" INTEGER NOT NULL DEFAULT 60,
    "minScore" INTEGER NOT NULL DEFAULT 10,
    "maxScore" INTEGER NOT NULL DEFAULT 70,
    "passScore" INTEGER NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctoral_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exam_questions" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "doctoral_exercise_type" NOT NULL,
    "statement" TEXT NOT NULL,
    "scenario" TEXT,
    "modelAnswer" JSONB,

    CONSTRAINT "doctoral_exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exam_question_options" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "optionKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "doctoral_exam_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exam_question_competency_weights" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "competencyAreaId" UUID NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "doctoral_exam_question_competency_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exam_attempts" (
    "id" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "seed" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" "doctoral_exam_attempt_status" NOT NULL DEFAULT 'in_progress',
    "score" INTEGER,
    "passed" BOOLEAN,

    CONSTRAINT "doctoral_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_exam_answers" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "selectedOptionKey" TEXT,
    "responseText" TEXT,
    "isCorrect" BOOLEAN,
    "semanticScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctoral_exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_module_surveys" (
    "id" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Encuesta de cierre de módulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctoral_module_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_survey_questions" (
    "id" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "doctoral_survey_question_type" NOT NULL,
    "prompt" TEXT NOT NULL,

    CONSTRAINT "doctoral_survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_module_survey_responses" (
    "id" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctoral_module_survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_survey_answers" (
    "id" UUID NOT NULL,
    "responseId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "likertValue" INTEGER,
    "textValue" TEXT,

    CONSTRAINT "doctoral_survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_student_groups" (
    "id" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_student_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_student_group_members" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,

    CONSTRAINT "doctoral_student_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_files" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctoral_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_assignments" (
    "id" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "moduleId" UUID,
    "doctoralProfessorProfileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "templateFileId" UUID,
    "dueAt" TIMESTAMP(3),
    "status" "doctoral_assignment_status" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_assignment_targets" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,

    CONSTRAINT "doctoral_assignment_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_assignment_target_groups" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "doctoral_assignment_target_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_assignment_questions" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "doctoral_assignment_question_type" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctOptionKey" TEXT,
    "maxScore" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "doctoral_assignment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_assignment_submissions" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "doctoralStudentProfileId" UUID NOT NULL,
    "status" "doctoral_assignment_submission_status" NOT NULL DEFAULT 'draft',
    "fileId" UUID,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "totalScore" INTEGER,
    "feedback" TEXT,

    CONSTRAINT "doctoral_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctoral_assignment_answers" (
    "id" UUID NOT NULL,
    "assignmentSubmissionId" UUID NOT NULL,
    "assignmentQuestionId" UUID NOT NULL,
    "responseText" TEXT,
    "selectedOptionKey" TEXT,
    "score" INTEGER,
    "feedback" TEXT,
    "gradedByUserId" UUID,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "doctoral_assignment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "user_roles_organizationId_idx" ON "user_roles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_organizationId_key" ON "user_roles"("userId", "roleId", "organizationId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_occurredAt_idx" ON "audit_logs"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "security_events_userId_occurredAt_idx" ON "security_events"("userId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_tokenHash_key" ON "email_verifications"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verifications_userId_idx" ON "email_verifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_programs_key_key" ON "doctoral_programs"("key");

-- CreateIndex
CREATE INDEX "doctoral_programs_organizationId_idx" ON "doctoral_programs"("organizationId");

-- CreateIndex
CREATE INDEX "doctoral_cohorts_programId_idx" ON "doctoral_cohorts"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_student_profiles_userId_key" ON "doctoral_student_profiles"("userId");

-- CreateIndex
CREATE INDEX "doctoral_student_profiles_organizationId_idx" ON "doctoral_student_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_professor_profiles_userId_key" ON "doctoral_professor_profiles"("userId");

-- CreateIndex
CREATE INDEX "doctoral_professor_profiles_organizationId_idx" ON "doctoral_professor_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_cohort_students_cohortId_doctoralStudentProfileId_key" ON "doctoral_cohort_students"("cohortId", "doctoralStudentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_cohort_professors_cohortId_doctoralProfessorProfil_key" ON "doctoral_cohort_professors"("cohortId", "doctoralProfessorProfileId");

-- CreateIndex
CREATE INDEX "program_modules_programId_semester_idx" ON "program_modules"("programId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "program_modules_programId_order_key" ON "program_modules"("programId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "module_topics_moduleId_key_key" ON "module_topics"("moduleId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "module_concept_contents_topicId_key" ON "module_concept_contents"("topicId");

-- CreateIndex
CREATE INDEX "doctoral_exercises_topicId_difficulty_idx" ON "doctoral_exercises"("topicId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_exercises_topicId_key_key" ON "doctoral_exercises"("topicId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_exercise_hints_exerciseId_order_key" ON "doctoral_exercise_hints"("exerciseId", "order");

-- CreateIndex
CREATE INDEX "doctoral_exercise_attempts_doctoralStudentProfileId_exercis_idx" ON "doctoral_exercise_attempts"("doctoralStudentProfileId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_module_enrollments_doctoralStudentProfileId_module_key" ON "doctoral_module_enrollments"("doctoralStudentProfileId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "competency_areas_programId_key_key" ON "competency_areas"("programId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "topic_competency_weights_topicId_competencyAreaId_key" ON "topic_competency_weights"("topicId", "competencyAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_competency_weights_exerciseId_competencyAreaId_key" ON "exercise_competency_weights"("exerciseId", "competencyAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_attempt_competency_results_attemptId_competencyAre_key" ON "doctoral_attempt_competency_results"("attemptId", "competencyAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_student_competency_scores_doctoralStudentProfileId_key" ON "doctoral_student_competency_scores"("doctoralStudentProfileId", "competencyAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_exams_moduleId_key" ON "doctoral_exams"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_exam_questions_examId_order_key" ON "doctoral_exam_questions"("examId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_exam_question_competency_weights_questionId_compet_key" ON "doctoral_exam_question_competency_weights"("questionId", "competencyAreaId");

-- CreateIndex
CREATE INDEX "doctoral_exam_attempts_doctoralStudentProfileId_examId_idx" ON "doctoral_exam_attempts"("doctoralStudentProfileId", "examId");

-- CreateIndex
CREATE INDEX "doctoral_exam_attempts_status_expiresAt_idx" ON "doctoral_exam_attempts"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_exam_answers_attemptId_questionId_key" ON "doctoral_exam_answers"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_module_surveys_moduleId_key" ON "doctoral_module_surveys"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_survey_questions_surveyId_order_key" ON "doctoral_survey_questions"("surveyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_module_survey_responses_surveyId_doctoralStudentPr_key" ON "doctoral_module_survey_responses"("surveyId", "doctoralStudentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_survey_answers_responseId_questionId_key" ON "doctoral_survey_answers"("responseId", "questionId");

-- CreateIndex
CREATE INDEX "doctoral_student_groups_cohortId_idx" ON "doctoral_student_groups"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_student_group_members_groupId_doctoralStudentProfi_key" ON "doctoral_student_group_members"("groupId", "doctoralStudentProfileId");

-- CreateIndex
CREATE INDEX "doctoral_assignments_cohortId_idx" ON "doctoral_assignments"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_assignment_targets_assignmentId_doctoralStudentPro_key" ON "doctoral_assignment_targets"("assignmentId", "doctoralStudentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_assignment_target_groups_assignmentId_groupId_key" ON "doctoral_assignment_target_groups"("assignmentId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_assignment_questions_assignmentId_order_key" ON "doctoral_assignment_questions"("assignmentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_assignment_submissions_assignmentId_doctoralStuden_key" ON "doctoral_assignment_submissions"("assignmentId", "doctoralStudentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "doctoral_assignment_answers_assignmentSubmissionId_assignme_key" ON "doctoral_assignment_answers"("assignmentSubmissionId", "assignmentQuestionId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_programs" ADD CONSTRAINT "doctoral_programs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_cohorts" ADD CONSTRAINT "doctoral_cohorts_programId_fkey" FOREIGN KEY ("programId") REFERENCES "doctoral_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_student_profiles" ADD CONSTRAINT "doctoral_student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_student_profiles" ADD CONSTRAINT "doctoral_student_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_professor_profiles" ADD CONSTRAINT "doctoral_professor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_professor_profiles" ADD CONSTRAINT "doctoral_professor_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_cohort_students" ADD CONSTRAINT "doctoral_cohort_students_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "doctoral_cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_cohort_students" ADD CONSTRAINT "doctoral_cohort_students_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_cohort_professors" ADD CONSTRAINT "doctoral_cohort_professors_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "doctoral_cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_cohort_professors" ADD CONSTRAINT "doctoral_cohort_professors_doctoralProfessorProfileId_fkey" FOREIGN KEY ("doctoralProfessorProfileId") REFERENCES "doctoral_professor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_programId_fkey" FOREIGN KEY ("programId") REFERENCES "doctoral_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_topics" ADD CONSTRAINT "module_topics_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "program_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_concept_contents" ADD CONSTRAINT "module_concept_contents_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "module_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exercises" ADD CONSTRAINT "doctoral_exercises_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "module_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exercise_options" ADD CONSTRAINT "doctoral_exercise_options_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "doctoral_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exercise_hints" ADD CONSTRAINT "doctoral_exercise_hints_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "doctoral_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exercise_attempts" ADD CONSTRAINT "doctoral_exercise_attempts_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exercise_attempts" ADD CONSTRAINT "doctoral_exercise_attempts_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "doctoral_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_module_enrollments" ADD CONSTRAINT "doctoral_module_enrollments_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_module_enrollments" ADD CONSTRAINT "doctoral_module_enrollments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "program_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_areas" ADD CONSTRAINT "competency_areas_programId_fkey" FOREIGN KEY ("programId") REFERENCES "doctoral_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_competency_weights" ADD CONSTRAINT "topic_competency_weights_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "module_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_competency_weights" ADD CONSTRAINT "topic_competency_weights_competencyAreaId_fkey" FOREIGN KEY ("competencyAreaId") REFERENCES "competency_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_competency_weights" ADD CONSTRAINT "exercise_competency_weights_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "doctoral_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_competency_weights" ADD CONSTRAINT "exercise_competency_weights_competencyAreaId_fkey" FOREIGN KEY ("competencyAreaId") REFERENCES "competency_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_attempt_competency_results" ADD CONSTRAINT "doctoral_attempt_competency_results_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "doctoral_exercise_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_attempt_competency_results" ADD CONSTRAINT "doctoral_attempt_competency_results_competencyAreaId_fkey" FOREIGN KEY ("competencyAreaId") REFERENCES "competency_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_student_competency_scores" ADD CONSTRAINT "doctoral_student_competency_scores_doctoralStudentProfileI_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_student_competency_scores" ADD CONSTRAINT "doctoral_student_competency_scores_competencyAreaId_fkey" FOREIGN KEY ("competencyAreaId") REFERENCES "competency_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exams" ADD CONSTRAINT "doctoral_exams_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "program_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_questions" ADD CONSTRAINT "doctoral_exam_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "doctoral_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_question_options" ADD CONSTRAINT "doctoral_exam_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "doctoral_exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_question_competency_weights" ADD CONSTRAINT "doctoral_exam_question_competency_weights_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "doctoral_exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_question_competency_weights" ADD CONSTRAINT "doctoral_exam_question_competency_weights_competencyAreaId_fkey" FOREIGN KEY ("competencyAreaId") REFERENCES "competency_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_attempts" ADD CONSTRAINT "doctoral_exam_attempts_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_attempts" ADD CONSTRAINT "doctoral_exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "doctoral_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_answers" ADD CONSTRAINT "doctoral_exam_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "doctoral_exam_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_exam_answers" ADD CONSTRAINT "doctoral_exam_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "doctoral_exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_module_surveys" ADD CONSTRAINT "doctoral_module_surveys_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "program_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_survey_questions" ADD CONSTRAINT "doctoral_survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "doctoral_module_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_module_survey_responses" ADD CONSTRAINT "doctoral_module_survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "doctoral_module_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_module_survey_responses" ADD CONSTRAINT "doctoral_module_survey_responses_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_survey_answers" ADD CONSTRAINT "doctoral_survey_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "doctoral_module_survey_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_survey_answers" ADD CONSTRAINT "doctoral_survey_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "doctoral_survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_student_groups" ADD CONSTRAINT "doctoral_student_groups_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "doctoral_cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_student_group_members" ADD CONSTRAINT "doctoral_student_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "doctoral_student_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_student_group_members" ADD CONSTRAINT "doctoral_student_group_members_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignments" ADD CONSTRAINT "doctoral_assignments_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "doctoral_cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignments" ADD CONSTRAINT "doctoral_assignments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "program_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignments" ADD CONSTRAINT "doctoral_assignments_doctoralProfessorProfileId_fkey" FOREIGN KEY ("doctoralProfessorProfileId") REFERENCES "doctoral_professor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignments" ADD CONSTRAINT "doctoral_assignments_templateFileId_fkey" FOREIGN KEY ("templateFileId") REFERENCES "doctoral_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_targets" ADD CONSTRAINT "doctoral_assignment_targets_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "doctoral_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_targets" ADD CONSTRAINT "doctoral_assignment_targets_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_target_groups" ADD CONSTRAINT "doctoral_assignment_target_groups_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "doctoral_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_target_groups" ADD CONSTRAINT "doctoral_assignment_target_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "doctoral_student_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_questions" ADD CONSTRAINT "doctoral_assignment_questions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "doctoral_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_submissions" ADD CONSTRAINT "doctoral_assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "doctoral_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_submissions" ADD CONSTRAINT "doctoral_assignment_submissions_doctoralStudentProfileId_fkey" FOREIGN KEY ("doctoralStudentProfileId") REFERENCES "doctoral_student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_submissions" ADD CONSTRAINT "doctoral_assignment_submissions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "doctoral_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_answers" ADD CONSTRAINT "doctoral_assignment_answers_assignmentSubmissionId_fkey" FOREIGN KEY ("assignmentSubmissionId") REFERENCES "doctoral_assignment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctoral_assignment_answers" ADD CONSTRAINT "doctoral_assignment_answers_assignmentQuestionId_fkey" FOREIGN KEY ("assignmentQuestionId") REFERENCES "doctoral_assignment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
