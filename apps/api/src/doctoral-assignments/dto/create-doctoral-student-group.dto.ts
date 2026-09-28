import { IsArray, IsUUID, Length } from 'class-validator';

export class CreateDoctoralStudentGroupDto {
  @Length(1, 200, {
    message: 'El nombre del grupo debe tener entre 1 y 200 caracteres',
  })
  name!: string;

  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'Uno de los ids de estudiante no es válido',
  })
  studentIds!: string[];
}
