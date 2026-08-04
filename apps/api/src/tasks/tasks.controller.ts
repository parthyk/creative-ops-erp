import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AddCommentDto, CreateTaskDto, ReassignTaskDto, UpdateTaskDto } from './dto/tasks.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.tasksService.findAll(query, user.sub, user.role);
  }

  @Get('kanban')
  kanban(@Query() query: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.tasksService.kanban(query, user.sub, user.role);
  }

  @Get('my-day')
  myDay(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.tasksService.myDay(user.sub, date);
  }

  @Get('calendar')
  calendar(@Query() query: { from?: string; to?: string; userId?: string }, @CurrentUser() user: AuthUser) {
    return this.tasksService.calendarEvents(query, user.sub, user.role);
  }

  @Get('overdue')
  overdue(@CurrentUser() user: AuthUser) {
    return this.tasksService.overdueSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.findOne(id, user.sub, user.role);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.create(dto, user.sub, user.name, user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.update(id, dto, user.sub, user.name);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body('status') status: TaskStatus, @CurrentUser() user: AuthUser) {
    return this.tasksService.changeStatus(id, status, user.sub, user.name);
  }

  @Post(':id/reassign')
  reassign(@Param('id') id: string, @Body() dto: ReassignTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.reassign(id, dto, user.sub, user.name);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() dto: AddCommentDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.addComment(id, dto, user.sub, user.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.remove(id, user.sub, user.role, user.sub);
  }
}