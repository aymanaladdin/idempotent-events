import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppConfig } from '../config/app.config';
import { parseBasicAuth } from './parse-basic-auth';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (this.checkApiKey(request)) return true;
    if (this.checkBasicAuth(request)) return true;

    throw new UnauthorizedException('Invalid or missing credentials');
  }

  private checkApiKey(request: Request): boolean {
    const apiKey = request.headers['x-api-key'];
    const appConfig = this.config.getOrThrow<AppConfig>('app');
    return !!apiKey && apiKey === appConfig.apiKey;
  }

  private checkBasicAuth(request: Request): boolean {
    const credentials = parseBasicAuth(request.headers['authorization']);
    if (!credentials) return false;
    const appConfig = this.config.getOrThrow<AppConfig>('app');
    return credentials.user === appConfig.basicAuthUser && credentials.password === appConfig.basicAuthPass;
  }
}
