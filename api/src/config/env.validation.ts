import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT!: number;

  @IsString()
  MONGODB_URI!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  // 15 minutos
  @IsInt()
  @Min(1)
  ACCESS_TOKEN_TTL_SECONDS: number = 15 * 60;

  // 7 dias
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_SECONDS: number = 7 * 24 * 60 * 60;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}
