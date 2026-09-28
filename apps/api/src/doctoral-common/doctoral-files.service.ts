import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Guardado como bytea en Postgres, no en disco local: Railway no garantiza
// disco persistente entre despliegues y este proyecto no tiene un bucket
// S3/GCS configurado (ver comentario en schema.prisma sobre DoctoralFile).
// Límite aplicado aquí, no en el schema.
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface StoredDoctoralFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class DoctoralFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async saveFile(input: {
    fileName: string;
    mimeType: string;
    base64Data: string;
    uploadedByUserId: string;
  }): Promise<StoredDoctoralFile> {
    let data: Uint8Array<ArrayBuffer>;
    try {
      const decoded = Buffer.from(input.base64Data, 'base64');
      const arrayBuffer = new ArrayBuffer(decoded.length);
      new Uint8Array(arrayBuffer).set(decoded);
      data = new Uint8Array(arrayBuffer);
    } catch {
      throw new BadRequestException(
        'El archivo no tiene un formato base64 válido',
      );
    }
    if (data.length === 0) {
      throw new BadRequestException('El archivo está vacío');
    }
    if (data.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`,
      );
    }

    const file = await this.prisma.doctoralFile.create({
      data: {
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: data.length,
        data,
        uploadedByUserId: input.uploadedByUserId,
      },
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
    });
    return file;
  }

  async getFile(
    id: string,
  ): Promise<{ id: string; fileName: string; mimeType: string; data: Buffer }> {
    const file = await this.prisma.doctoralFile.findUnique({ where: { id } });
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return { ...file, data: Buffer.from(file.data) };
  }
}
