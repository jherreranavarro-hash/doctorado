import { IsArray, IsOptional, IsUUID, Length } from 'class-validator';

/** Renombrar y/o reemplazar la lista completa de miembros — omitir
 * studentIds deja los miembros actuales sin cambios; enviarlo (incluso
 * vacío) reemplaza la lista entera. */
export class UpdateDoctoralStudentGroupDto {
  @IsOptional()
  @Length(1, 200, {
    message: 'El nombre del grupo debe tener entre 1 y 200 caracteres',
  })
  name?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'Uno de los ids de estudiante no es válido',
  })
  studentIds?: string[];
}
