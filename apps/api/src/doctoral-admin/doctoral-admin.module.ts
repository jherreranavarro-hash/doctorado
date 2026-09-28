import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DoctoralAdminController } from './doctoral-admin.controller.js';
import { DoctoralAdminService } from './doctoral-admin.service.js';
import { DoctoralAdminUsersController } from './doctoral-admin-users.controller.js';
import { DoctoralAdminUsersService } from './doctoral-admin-users.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DoctoralAdminController, DoctoralAdminUsersController],
  providers: [DoctoralAdminService, DoctoralAdminUsersService],
})
export class DoctoralAdminModule {}
