import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const DOCTORAL_ASSIGNMENT_QUESTION_TYPES = [
  'mc',
  'short_answer',
  'essay',
  'file_upload',
] as const;
export type DoctoralAssignmentQuestionInputType =
  (typeof DOCTORAL_ASSIGNMENT_QUESTION_TYPES)[number];

class DoctoralAssignmentQuestionOptionInput {
  @IsString()
  @MaxLength(10, { message: 'La clave de la alternativa es demasiado larga' })
  key!: string;

  @IsString()
  @MaxLength(1000, { message: 'El texto de la alternativa es demasiado largo' })
  text!: string;
}

/** Una pregunta al crear la tarea — validación semántica adicional (mc
 * requiere >=2 alternativas + correctOptionKey válido) vive en el service,
 * no aquí, porque depende de las otras preguntas del arreglo. */
export class DoctoralAssignmentQuestionInput {
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(1, { message: 'El orden debe ser mayor o igual a 1' })
  order!: number;

  @IsIn(DOCTORAL_ASSIGNMENT_QUESTION_TYPES, {
    message: `type debe ser uno de: ${DOCTORAL_ASSIGNMENT_QUESTION_TYPES.join(', ')}`,
  })
  type!: DoctoralAssignmentQuestionInputType;

  @IsString()
  @MaxLength(4000, { message: 'El enunciado es demasiado largo' })
  prompt!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Demasiadas alternativas' })
  @ValidateNested({ each: true })
  @Type(() => DoctoralAssignmentQuestionOptionInput)
  options?: DoctoralAssignmentQuestionOptionInput[];

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'La alternativa correcta no es válida' })
  correctOptionKey?: string;

  @IsOptional()
  @IsInt({ message: 'El puntaje máximo debe ser un número entero' })
  @Min(1, { message: 'El puntaje máximo debe ser mayor o igual a 1' })
  @Max(1000, { message: 'El puntaje máximo es demasiado alto' })
  maxScore?: number;
}
