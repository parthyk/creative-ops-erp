import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, StorageService],
  exports: [StorageService],
})
export class FilesModule {}