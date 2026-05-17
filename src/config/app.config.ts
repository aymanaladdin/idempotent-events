import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
  apiKey: process.env.API_KEY as string,
  basicAuthUser: process.env.BASIC_AUTH_USER as string,
  basicAuthPass: process.env.BASIC_AUTH_PASS as string,
}));

export type AppConfig = ReturnType<typeof appConfig>;
