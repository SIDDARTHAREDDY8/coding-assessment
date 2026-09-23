import { Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list(
    @Query('documentId', new ParseUUIDPipe({ optional: true }))
    documentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.list(
      documentId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}
