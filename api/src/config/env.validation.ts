import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Matches,
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
  @Matches(/^mongodb(\+srv)?:\/\/\S+$/, {
    message: 'MONGODB_URI deve começar com mongodb:// ou mongodb+srv://',
  })
  MONGODB_URI!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  // 15 minutos
  @IsInt()
  @Min(1)
  ACCESS_TOKEN_TTL_SECONDS: number = 15 * 60;

  // 7 dias: cada renovação estende a sessão por este prazo (janela deslizante)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_SECONDS: number = 7 * 24 * 60 * 60;

  // 30 dias: teto da sessão desde o login, mesmo que ela seja renovada sempre
  @IsInt()
  @Min(1)
  SESSION_MAX_LIFETIME_SECONDS: number = 30 * 24 * 60 * 60;

  // Endereço(s) do front que podem chamar a API pelo navegador (CORS),
  // separados por vírgula. Padrão: o Vite em desenvolvimento, que o navegador
  // trata como duas origens diferentes conforme se digite localhost ou 127.0.0.1.
  @Matches(/^https?:\/\/[^\s,/]+(,https?:\/\/[^\s,/]+)*$/, {
    message:
      'CORS_ORIGIN deve ter uma ou mais origens separadas por vírgula, como http://localhost:5173 (sem caminho nem barra no fim)',
  })
  CORS_ORIGIN: string = 'http://localhost:5173,http://127.0.0.1:5173';
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    // As mensagens de cada regra (ex.: "PORT must not be greater than 65535"),
    // em vez do toString(), que só lista os nomes das regras quebradas.
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    throw new Error(`.env inválido: ${messages.join('; ')}`);
  }
  return validated;
}
