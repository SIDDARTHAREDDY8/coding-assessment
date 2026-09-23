import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DocumentEvent } from '../documents/document-event.entity';

export interface EventListActor {
  id: string;
  name: string;
  email: string;
}

export interface EventListItem {
  id: string;
  action: string;
  documentId: string;
  actor: EventListActor | null;
  stageName: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface PaginatedEvents {
  items: EventListItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class EventsService {
  constructor(private readonly em: EntityManager) {}

  async list(
    documentId?: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedEvents> {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 10));

    const [events, total] = await this.em.findAndCount(
      DocumentEvent,
      documentId ? { document: documentId } : {},
      {
        populate: ['actor'],
        orderBy: { createdAt: 'DESC' },
        limit: safeLimit,
        offset: (safePage - 1) * safeLimit,
      },
    );

    return {
      items: events.map((event) => ({
        id: event.id,
        action: event.action,
        documentId: event.document.id,
        actor: event.actor
          ? { id: event.actor.id, name: event.actor.name, email: event.actor.email }
          : null,
        stageName: event.stageName,
        reason: event.reason,
        createdAt: event.createdAt,
      })),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }
}
