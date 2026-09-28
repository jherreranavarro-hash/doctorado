import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DoctoralAssignmentQuestionInput } from './doctoral-assignment-question.input.js';

export class CreateDoctoralAssignmentDto {
  @IsUUID('4', { message: 'La cohorte indicada no es válida' })
  cohortId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'El módulo indicado no es válido' })
  moduleId?: string;

  @IsString()
  @Length(1, 200, { message: 'El título debe tener entre 1 y 200 caracteres' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: 'Las instrucciones son demasiado largas' })
  instructions?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El archivo de plantilla indicado no es válido' })
  templateFileId?: string;

  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'La fecha de entrega no es válida' },
  )
  dueAt?: string;

  /** Puede venir vacío (se agregan preguntas después con un PATCH, o la
   * tarea queda en draft sin preguntas) — la validación de "al menos una
   * pregunta" solo se exige al publicar, igual que en el lado K-12. */
  @IsArray()
  @ArrayMaxSize(200, { message: 'Demasiadas preguntas en una sola tarea' })
  @ValidateNested({ each: true })
  @Type(() => DoctoralAssignmentQuestionInput)
  questions!: DoctoralAssignmentQuestionInput[];

  /** Alumnos individuales a los que se dirige la tarea — vacío/omitido junto
   * con targetGroupIds = toda la cohorte. Puede combinarse con
   * targetGroupIds (la visibilidad es un OR, no un XOR). */
  @IsOptional()
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'Uno de los ids de estudiante no es válido',
  })
  targetStudentIds?: string[];

  /** Grupos guardados de la cohorte a los que se dirige la tarea — ver nota
   * de targetStudentIds. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'Uno de los ids de grupo no es válido',
  })
  targetGroupIds?: string[];
}
