import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppConfig } from '../../config/app.config';
import { parseBasicAuth } from '../../common/parse-basic-auth';

@Injectable()
export class BrowserAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse<Response>();

    const credentials = parseBasicAuth(request.headers['authorization']);
    if (credentials) {
      const appConfig = this.config.getOrThrow<AppConfig>('app');
      if (credentials.user === appConfig.basicAuthUser && credentials.password === appConfig.basicAuthPass) {
        return true;
      }
    }

    response.setHeader('WWW-Authenticate', 'Basic realm="Idempotent Events Dashboard"');
    response.status(401).send('Unauthorized');
    return false;
  }
}
