import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Ingresa un correo válido' })
  @MaxLength(255, { message: 'El correo es demasiado largo' })
  email!: string;

  @IsString()
  @MaxLength(128, { message: 'La contraseña es demasiado larga' })
  password!: string;
}
