import { Global, Module } from '@nestjs/common';
import { TokenService } from './services/token.service.js';
import { SessionService } from './services/session.service.js';
import { CsrfService } from './services/csrf.service.js';

@Global()
@Module({
  providers: [TokenService, SessionService, CsrfService],
  exports: [TokenService, SessionService, CsrfService],
})
export class CommonModule {}
