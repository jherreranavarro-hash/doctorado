import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateDoctoralStudentDto {
  @IsEmail({}, { message: 'Ingresa un correo válido' })
  @MaxLength(255, { message: 'El correo es demasiado largo' })
  email!: string;

  @IsString()
  @Length(10, 128, {
    message: 'La contraseña debe tener entre 10 y 128 caracteres',
  })
  password!: string;

  @IsString()
  @Length(1, 120, { message: 'El nombre debe tener entre 1 y 120 caracteres' })
  displayName!: string;

  // Si se indica, el estudiante queda inscrito de inmediato en esa cohorte
  // (ver DoctoralAdminUsersService.createStudent) — debe pertenecer a la
  // organización del admin.
  @IsOptional()
  @IsUUID(undefined, { message: 'Selecciona una cohorte válida' })
  cohortId?: string;
}
