import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (this.checkApiKey(request)) return true;
    if (this.checkBasicAuth(request)) return true;

    throw new UnauthorizedException('Invalid or missing credentials');
  }

  private checkApiKey(request: any): boolean {
    const apiKey = request.headers['x-api-key'];
    const appConfig = this.config.getOrThrow<AppConfig>('app');
    return !!apiKey && apiKey === appConfig.apiKey;
  }

  private checkBasicAuth(request: any): boolean {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Basic ')) return false;

    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [user, ...passParts] = decoded.split(':');
    const password = passParts.join(':');

    const appConfig = this.config.getOrThrow<AppConfig>('app');
    return user === appConfig.basicAuthUser && password === appConfig.basicAuthPass;
  }
}
