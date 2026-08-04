import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.MANAGER)
  findAll(@Query() query: Record<string, any>) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get(':id')
  @Roles(Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateUserDto, @CurrentUser('sub') actorId: string) {
    return this.usersService.create(dto, actorId);
  }

  @Patch('me')
  updateMe(@CurrentUser('sub') userId: string, @Body() dto: { phone?: string; name?: string; avatar?: string }) {
    return this.usersService.updateMe(userId, dto);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser('sub') actorId: string) {
    return this.usersService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  remove(@Param('id') id: string, @CurrentUser('sub') actorId: string) {
    return this.usersService.remove(id, actorId);
  }
}
