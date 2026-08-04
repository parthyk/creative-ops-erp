import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { FilesService } from './files.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Get()
  findAll(@Query() query: Record<string, any>) {
    return this.filesService.findAll(query);
  }

  @Get('folders')
  folders() {
    return this.filesService.folders();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folder?: string; clientId?: string; taskId?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.upload(file, body, userId);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.filesService.remove(id);
  }
}