import { randomUUID } from 'crypto';
import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { DocumentStage } from './document-stage.entity';
import { DocumentEvent } from './document-event.entity';
import { DocumentStatus } from './document-status.enum';

@Entity({ tableName: 'documents' })
export class Document {
  [OptionalProps]?:
    | 'id'
    | 'currentStageIndex'
    | 'status'
    | 'declineReason'
    | 'createdBy'
    | 'createdAt'
    | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property()
  title!: string;

  @Property({ type: 'text' })
  body!: string;

  @Property()
  currentStageIndex = 0;

  @Enum(() => DocumentStatus)
  status: DocumentStatus = DocumentStatus.IN_PROGRESS;

  @Property({ nullable: true, type: 'text' })
  declineReason: string | null = null;

  @ManyToOne(() => User, { nullable: true })
  createdBy: User | null = null;

  @OneToMany(() => DocumentStage, (stage) => stage.document)
  stages = new Collection<DocumentStage>(this);

  @OneToMany(() => DocumentEvent, (event) => event.document)
  events = new Collection<DocumentEvent>(this);

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
