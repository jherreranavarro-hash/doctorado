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

class SurveyAnswerInput {
  @IsUUID(undefined, { message: 'ID de pregunta inválido' })
  questionId!: string;

  /** Para preguntas type=likert_1_5. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  likertValue?: number;

  /** Para preguntas type=short_answer. */
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'La respuesta es demasiado larga' })
  textValue?: string;
}

export class SubmitSurveyResponsesDto {
  @IsArray()
  @ArrayMaxSize(50, { message: 'Demasiadas respuestas en un solo envío' })
  @ValidateNested({ each: true })
  @Type(() => SurveyAnswerInput)
  answers!: SurveyAnswerInput[];
}
