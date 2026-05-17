import { plainToClass } from 'class-transformer';
import { IsNumber, IsString, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  API_KEY: string;

  @IsString()
  BASIC_AUTH_USER: string;

  @IsString()
  BASIC_AUTH_PASS: string;

  @IsNumber()
  @Min(1)
  PORT: number = 3000;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors
        .map((validationError) => Object.values(validationError.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validated;
}
