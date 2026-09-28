import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class GradeDoctoralAnswerInput {
  @IsUUID('4', { message: 'El id de la pregunta no es válido' })
  questionId!: string;

  @IsInt({ message: 'El puntaje debe ser un número entero' })
  @Min(0, { message: 'El puntaje no puede ser negativo' })
  @Max(1000, { message: 'El puntaje es demasiado alto' })
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'La retroalimentación es demasiado larga' })
  feedback?: string;
}

export class GradeDoctoralSubmissionDto {
  @IsArray()
  @ArrayMaxSize(200, {
    message: 'Demasiadas respuestas en una sola calificación',
  })
  @ValidateNested({ each: true })
  @Type(() => GradeDoctoralAnswerInput)
  answers!: GradeDoctoralAnswerInput[];

  /** Retroalimentación general de la entrega (distinta de la
   * retroalimentación por pregunta) — mapea a
   * DoctoralAssignmentSubmission.feedback. */
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'La retroalimentación es demasiado larga' })
  feedback?: string;
}
