import { IsEmail, IsOptional, IsUUID, MaxLength } from 'class-validator';

// Se acepta el docente por id de perfil (ya existente en la organización) o
// por correo (lookup) — el service exige que al menos uno esté presente
// (ver DoctoralAdminUsersService.assignProfessorToCohort).
export class AssignProfessorToCohortDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'Selecciona un docente válido' })
  doctoralProfessorProfileId?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Ingresa un correo válido' })
  @MaxLength(255, { message: 'El correo es demasiado largo' })
  email?: string;
}
