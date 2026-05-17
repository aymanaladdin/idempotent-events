import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
  basicAuthUser: process.env.BASIC_AUTH_USER,
  basicAuthPass: process.env.BASIC_AUTH_PASS,
}));

export type AppConfig = ReturnType<typeof appConfig>;
