-- AlterTable
ALTER TABLE "program_modules" ADD COLUMN     "syllabusFileId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "program_modules_syllabusFileId_key" ON "program_modules"("syllabusFileId");

-- AddForeignKey
ALTER TABLE "program_modules" ADD CONSTRAINT "program_modules_syllabusFileId_fkey" FOREIGN KEY ("syllabusFileId") REFERENCES "doctoral_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

