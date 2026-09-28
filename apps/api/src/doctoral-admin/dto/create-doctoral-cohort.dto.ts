import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateDoctoralCohortDto {
  @IsString()
  @Length(1, 120, { message: 'El nombre debe tener entre 1 y 120 caracteres' })
  name!: string;

  @IsInt()
  @Min(2000, { message: 'Ingresa un año válido' })
  startYear!: number;
}
