import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

/**
 * Intento de práctica sobre un DoctoralExercise — reintentos ilimitados
 * (ver DoctoralLearningService.submitExerciseAttempt), así que este DTO no
 * necesita nada de "intentos restantes"; solo lo que el alumno respondió.
 */
export class SubmitExerciseAttemptDto {
  /** Para type=mc: la clave de la alternativa elegida (p. ej. "a"). */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La alternativa seleccionada no es válida' })
  selectedOptionKey?: string;

  /** Para type=short_answer/case_analysis: la respuesta libre del alumno. */
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'La respuesta es demasiado larga' })
  responseText?: string;

  /** Cuántas pistas reveló el alumno antes de responder — informativo, no cambia la corrección. */
  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number;
}
