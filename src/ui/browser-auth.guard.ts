import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppConfig } from '../config/app.config';

@Injectable()
export class BrowserAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse<Response>();

    const authHeader = request.headers['authorization'];

    if (authHeader?.startsWith('Basic ')) {
      const base64 = authHeader.slice(6);
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');
      const [user, ...passParts] = decoded.split(':');
      const pass = passParts.join(':');

      const cfg = this.config.getOrThrow<AppConfig>('app');
      if (user === cfg.basicAuthUser && pass === cfg.basicAuthPass) {
        return true;
      }
    }

    response.setHeader('WWW-Authenticate', 'Basic realm="Idempotent Events Dashboard"');
    response.status(401).send('Unauthorized');
    return false;
  }
}
