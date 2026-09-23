import { randomUUID } from 'crypto';
import {
  Entity,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Document } from './document.entity';
import { User } from '../users/user.entity';

@Entity({ tableName: 'document_stages' })
export class DocumentStage {
  [OptionalProps]?: 'id';

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Document)
  document!: Document;

  @Property()
  position!: number;

  @Property()
  name!: string;

  @ManyToOne(() => User)
  approver!: User;
}
