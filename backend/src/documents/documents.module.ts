import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [UsersModule, EventsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
