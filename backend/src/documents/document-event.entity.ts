import { randomUUID } from 'crypto';
import {
  Entity,
  Enum,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Document } from './document.entity';
import { User } from '../users/user.entity';
import { DocumentEventAction } from './document-event-action.enum';

@Entity({ tableName: 'document_events' })
export class DocumentEvent {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Document)
  document!: Document;

  @ManyToOne(() => User, { nullable: true })
  actor: User | null = null;

  @Enum(() => DocumentEventAction)
  action!: DocumentEventAction;

  @Property({ nullable: true })
  stageName: string | null = null;

  @Property({ nullable: true, type: 'text' })
  reason: string | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
