import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, MaxLength } from 'class-validator';
import {
  PROFILE_COVERS,
  type ProfileCover,
} from '../../domain/profile-cover.js';

export const BIO_MAX_LENGTH = 160;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

@InputType()
export class UpdateProfileInput {
  // O trim vem antes das regras: um nome só de espaços vira vazio e é recusado.
  @Field()
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  displayName: string;

  // A bio pode ser vazia (é assim que se apaga).
  @Field()
  @Transform(trim)
  @IsString()
  @MaxLength(BIO_MAX_LENGTH)
  bio: string;

  // Só os nomes da lista fixa de capas são aceitos.
  @Field()
  @IsIn(PROFILE_COVERS, { message: 'capa desconhecida' })
  cover: ProfileCover;
}
