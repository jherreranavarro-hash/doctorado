import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import {
  DOCTORAL_MODULE_TYPES,
  type DoctoralModuleType,
} from '@doctorado/shared';

export class CreateProgramModuleDto {
  @IsOptional()
  @IsString()
  @Length(1, 40, { message: 'El código debe tener entre 1 y 40 caracteres' })
  code?: string;

  @IsString()
  @Length(1, 200, { message: 'El título debe tener entre 1 y 200 caracteres' })
  title!: string;

  @IsInt()
  @Min(1, { message: 'El semestre debe ser al menos 1' })
  semester!: number;

  @IsInt()
  @Min(0, { message: 'Los créditos no pueden ser negativos' })
  credits!: number;

  @IsIn(DOCTORAL_MODULE_TYPES, {
    message: 'Selecciona un tipo de módulo válido',
  })
  type!: DoctoralModuleType;

  @IsInt()
  @Min(0, { message: 'El orden no puede ser negativo' })
  order!: number;
}
