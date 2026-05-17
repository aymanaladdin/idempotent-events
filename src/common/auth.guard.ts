import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (this.checkApiKey(request)) return true;
    if (this.checkBasicAuth(request)) return true;

    throw new UnauthorizedException('Invalid or missing credentials');
  }

  private checkApiKey(request: any): boolean {
    const apiKey = request.headers['x-api-key'];
    return !!apiKey && apiKey === process.env.API_KEY;
  }

  private checkBasicAuth(request: any): boolean {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Basic ')) return false;

    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [user, ...passParts] = decoded.split(':');
    const pass = passParts.join(':');

    return (
      user === process.env.BASIC_AUTH_USER &&
      pass === process.env.BASIC_AUTH_PASS
    );
  }
}
