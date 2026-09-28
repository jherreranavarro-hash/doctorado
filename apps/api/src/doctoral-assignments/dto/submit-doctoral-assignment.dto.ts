import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class DoctoralSubmissionAnswerInput {
  @IsUUID('4', { message: 'El id de la pregunta no es válido' })
  questionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000, { message: 'La respuesta es demasiado larga' })
  responseText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'La alternativa seleccionada no es válida' })
  selectedOptionKey?: string;
}

export class SubmitDoctoralAssignmentDto {
  @IsArray()
  @ArrayMaxSize(200, { message: 'Demasiadas respuestas en un solo envío' })
  @ValidateNested({ each: true })
  @Type(() => DoctoralSubmissionAnswerInput)
  answers!: DoctoralSubmissionAnswerInput[];

  /** Archivo ya subido vía DoctoralFilesService (por ej. el ensayo/tarea
   * escaneada) que se adjunta a esta entrega. */
  @IsOptional()
  @IsUUID('4', { message: 'El id del archivo no es válido' })
  fileId?: string;
}
