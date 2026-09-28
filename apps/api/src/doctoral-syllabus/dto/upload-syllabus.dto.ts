import { IsString, MaxLength } from 'class-validator';

/** El tamaño real (<=15MB decodificado) se valida en DoctoralFilesService;
 * el MaxLength de acá es solo un tope defensivo sobre el string base64 en sí
 * (~15MB binarios ~ 20MB en base64) para no dejar pasar payloads
 * arbitrariamente grandes hasta el decode. */
export class UploadSyllabusDto {
  @IsString()
  @MaxLength(255, { message: 'El nombre del archivo es demasiado largo' })
  fileName!: string;

  @IsString()
  @MaxLength(255, {
    message: 'El tipo de archivo (mimeType) es demasiado largo',
  })
  mimeType!: string;

  @IsString()
  @MaxLength(21_000_000, { message: 'El archivo es demasiado grande' })
  base64Data!: string;
}
