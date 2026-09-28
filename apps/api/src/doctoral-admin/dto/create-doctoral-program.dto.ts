import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateDoctoralProgramDto {
  @IsString()
  @Length(1, 60, { message: 'La clave debe tener entre 1 y 60 caracteres' })
  key!: string;

  @IsString()
  @Length(1, 200, { message: 'El nombre debe tener entre 1 y 200 caracteres' })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200, {
    message: 'La institución debe tener entre 1 y 200 caracteres',
  })
  institution?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'El número de semestres debe ser al menos 1' })
  @Max(20, { message: 'El número de semestres es demasiado alto' })
  totalSemesters?: number;
}
