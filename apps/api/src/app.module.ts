import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { DoctoralCommonModule } from './doctoral-common/doctoral-common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DoctoralAdminModule } from './doctoral-admin/doctoral-admin.module.js';
import { DoctoralAnalyticsModule } from './doctoral-analytics/doctoral-analytics.module.js';
import { DoctoralLearningModule } from './doctoral-learning/doctoral-learning.module.js';
import { DoctoralAssignmentsModule } from './doctoral-assignments/doctoral-assignments.module.js';
import { DoctoralSyllabusModule } from './doctoral-syllabus/doctoral-syllabus.module.js';
import { SessionAuthGuard } from './common/guards/session-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Monorepo: un único .env vive en la raíz del workspace, no por app.
      envFilePath: ['../../.env'],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    CommonModule,
    DoctoralCommonModule,
    AuthModule,
    DoctoralAdminModule,
    DoctoralAnalyticsModule,
    DoctoralLearningModule,
    DoctoralAssignmentsModule,
    DoctoralSyllabusModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
