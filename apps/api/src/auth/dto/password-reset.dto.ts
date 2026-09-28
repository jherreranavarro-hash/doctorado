import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'Ingresa un correo válido' })
  @MaxLength(255, { message: 'El correo es demasiado largo' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @Length(10, 128, {
    message: 'La contraseña debe tener entre 10 y 128 caracteres',
  })
  newPassword!: string;
}
