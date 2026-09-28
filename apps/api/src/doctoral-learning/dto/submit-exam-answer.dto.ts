import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Respuesta a UNA pregunta del examen final ("prueba sin ayuda") — a
 * diferencia de topic-mastery (donde la pregunta va en la URL), aquí el
 * questionId viaja en el body porque el examen no tiene pistas ni
 * navegación por pregunta individual vía ruta propia (ver encargo, endpoint 7).
 */
export class SubmitExamAnswerDto {
  @IsUUID(undefined, { message: 'ID de pregunta inválido' })
  questionId!: string;

  /** Para type=mc: la clave de la alternativa elegida. */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La alternativa seleccionada no es válida' })
  selectedOptionKey?: string;

  /** Para type=short_answer/case_analysis: la respuesta libre del alumno. */
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'La respuesta es demasiado larga' })
  responseText?: string;
}
