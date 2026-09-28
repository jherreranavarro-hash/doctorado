import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export const DOCTORAL_ASSIGNMENT_STATUSES = [
  'draft',
  'published',
  'closed',
] as const;
export type DoctoralAssignmentStatusInput =
  (typeof DOCTORAL_ASSIGNMENT_STATUSES)[number];

/** Todos los campos son opcionales — se envían solo los que cambian. Para
 * publicar/cerrar se manda solo { status }. */
export class UpdateDoctoralAssignmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 200, { message: 'El título debe tener entre 1 y 200 caracteres' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: 'Las instrucciones son demasiado largas' })
  instructions?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El módulo indicado no es válido' })
  moduleId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El archivo de plantilla indicado no es válido' })
  templateFileId?: string;

  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'La fecha de entrega no es válida' },
  )
  dueAt?: string;

  @IsOptional()
  @IsIn(DOCTORAL_ASSIGNMENT_STATUSES, {
    message: `status debe ser uno de: ${DOCTORAL_ASSIGNMENT_STATUSES.join(', ')}`,
  })
  status?: DoctoralAssignmentStatusInput;
}
