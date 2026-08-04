import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [UsersController, DepartmentsController],
  providers: [UsersService, DepartmentsService],
  exports: [UsersService, DepartmentsService],
})
export class UsersModule {}