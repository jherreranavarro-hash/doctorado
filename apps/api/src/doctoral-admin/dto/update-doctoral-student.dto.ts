import { IsString, Length } from 'class-validator';

export class UpdateDoctoralStudentDto {
  @IsString()
  @Length(1, 120, { message: 'El nombre debe tener entre 1 y 120 caracteres' })
  displayName!: string;
}
