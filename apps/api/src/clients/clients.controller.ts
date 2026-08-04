import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ClientsService } from './clients.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  AssignStakeholderDto,
  CreateClientDto,
  UpdateClientDto,
} from './dto/clients.dto';

@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  findAll(@Query() query: Record<string, any>) {
    return this.clientsService.findAll(query);
  }

  @Get('mine')
  findMine(@CurrentUser('sub') userId: string) {
    return this.clientsService.findMine(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Get(':id/stakeholders/history')
  stakeholderHistory(@Param('id') id: string) {
    return this.clientsService.stakeholderHistory(id);
  }

  @Post(':id/stakeholders')
  @Roles(Role.MANAGER)
  assignStakeholder(
    @Param('id') id: string,
    @Body() dto: AssignStakeholderDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientsService.assignStakeholder(id, dto, actorId);
  }

  @Post()
  @Roles(Role.MANAGER)
  create(@Body() dto: CreateClientDto, @CurrentUser('sub') actorId: string) {
    return this.clientsService.create(dto, actorId);
  }

  @Patch(':id')
  @Roles(Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser('sub') actorId: string) {
    return this.clientsService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles(Role.MANAGER)
  remove(@Param('id') id: string, @CurrentUser('sub') actorId: string) {
    return this.clientsService.remove(id, actorId);
  }
}
