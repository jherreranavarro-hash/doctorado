import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateDoctoralProfessorDto {
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

  @IsOptional()
  @IsString()
  @Length(1, 40, { message: 'El título debe tener entre 1 y 40 caracteres' })
  title?: string;
}
