import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Document } from './document.entity';
import { DocumentStage } from './document-stage.entity';
import { DocumentEvent } from './document-event.entity';
import { DocumentEventAction } from './document-event-action.enum';
import { DocumentStatus } from './document-status.enum';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

export interface DocumentListFilters {
  currentApproverId?: string;
  createdById?: string;
}

export interface DocumentListItem {
  id: string;
  title: string;
  status: DocumentStatus;
  currentStageIndex: number;
  currentStageName: string;
  currentApproverName: string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedDocuments {
  items: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly em: EntityManager,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    filters: DocumentListFilters = {},
  ): Promise<PaginatedDocuments> {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 10));

    const documents = await this.em.find(
      Document,
      {},
      {
        populate: ['stages.approver', 'createdBy'],
        orderBy: { createdAt: 'DESC' },
      },
    );

    let items = documents;
    if (filters.createdById) {
      items = items.filter((doc) => doc.createdBy?.id === filters.createdById);
    }
    if (filters.currentApproverId) {
      items = items.filter(
        (doc) =>
          this.sortedStages(doc)[doc.currentStageIndex]?.approver.id ===
          filters.currentApproverId,
      );
    }

    const total = items.length;
    const paged = items.slice(
      (safePage - 1) * safeLimit,
      safePage * safeLimit,
    );

    return {
      items: paged.map((doc) => this.toListItem(doc)),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.em.findOne(
      Document,
      { id },
      { populate: ['stages.approver', 'createdBy'] },
    );
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    this.sortStages(document);
    return document;
  }

  async create(dto: CreateDocumentDto): Promise<Document> {
    const createdBy = await this.requireUser(dto.createdById);
    const approvers: User[] = [];
    for (const stageInput of dto.stages) {
      approvers.push(await this.requireUser(stageInput.approverId));
    }

    const document = this.em.create(Document, {
      title: dto.title,
      body: dto.body,
      currentStageIndex: 0,
      status: DocumentStatus.IN_PROGRESS,
      createdBy,
    });
    this.em.persist(document);

    dto.stages.forEach((stageInput, index) => {
      const stage = this.em.create(DocumentStage, {
        document,
        position: index,
        name: stageInput.name,
        approver: approvers[index],
      });
      this.em.persist(stage);
      document.stages.add(stage);
    });

    this.logEvent(document, createdBy, DocumentEventAction.CREATED);

    await this.em.flush();
    return this.findOne(document.id);
  }

  async approve(id: string, userId: string): Promise<Document> {
    const actor = await this.requireUser(userId);
    const document = await this.findOne(id);
    this.assertInProgress(document);
    this.assertCurrentApprover(document, actor.id);

    const stages = this.sortedStages(document);
    const currentStage = this.getCurrentStage(document);
    if (document.currentStageIndex >= stages.length - 1) {
      document.status = DocumentStatus.APPROVED;
    } else {
      document.currentStageIndex += 1;
    }

    this.logEvent(
      document,
      actor,
      DocumentEventAction.APPROVED,
      currentStage.name,
    );

    await this.em.flush();
    return this.findOne(id);
  }

  async reject(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<Document> {
    const actor = await this.requireUser(userId);
    const document = await this.findOne(id);
    this.assertInProgress(document);
    this.assertCurrentApprover(document, actor.id);

    const currentStage = this.getCurrentStage(document);
    document.status = DocumentStatus.DECLINED;
    document.declineReason = reason ?? null;

    this.logEvent(
      document,
      actor,
      DocumentEventAction.REJECTED,
      currentStage.name,
      reason ?? null,
    );

    await this.em.flush();
    return this.findOne(id);
  }

  async reopen(id: string, userId: string): Promise<Document> {
    const document = await this.findOne(id);
    if (document.status !== DocumentStatus.DECLINED) {
      throw new BadRequestException(
        'Only a document with status DECLINED can be reopened',
      );
    }

    const actor = await this.requireUser(userId);
    const isCreator = document.createdBy?.id === actor.id;
    const isStageZeroApprover =
      this.sortedStages(document)[0]?.approver.id === actor.id;
    if (!isCreator && !isStageZeroApprover) {
      throw new ForbiddenException(
        'Only the document creator or the first-stage approver may reopen a declined document',
      );
    }

    document.status = DocumentStatus.IN_PROGRESS;
    document.currentStageIndex = 0;
    document.declineReason = null;

    this.logEvent(document, actor, DocumentEventAction.REOPENED);

    await this.em.flush();
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findOne(id);
    if (document.status === DocumentStatus.APPROVED) {
      throw new BadRequestException('Cannot update a document that is APPROVED');
    }

    const actor = await this.requireUser(dto.userId);
    if (document.createdBy && document.createdBy.id !== actor.id) {
      throw new ForbiddenException(
        'Only the document creator may update a document',
      );
    }

    let contentChanged = false;
    if (dto.title !== undefined) {
      document.title = dto.title;
      contentChanged = true;
    }
    if (dto.body !== undefined) {
      document.body = dto.body;
      contentChanged = true;
    }

    let stagesChanged = false;
    if (dto.stages !== undefined) {
      if (dto.stages.length === 0) {
        throw new BadRequestException(
          'A document must have at least one stage',
        );
      }
      const approvers: User[] = [];
      for (const stageInput of dto.stages) {
        approvers.push(await this.requireUser(stageInput.approverId));
      }

      const oldStages = document.stages.getItems();
      this.em.remove(oldStages);
      document.stages.remove(oldStages);

      dto.stages.forEach((stageInput, index) => {
        const stage = this.em.create(DocumentStage, {
          document,
          position: index,
          name: stageInput.name,
          approver: approvers[index],
        });
        this.em.persist(stage);
        document.stages.add(stage);
      });

      document.currentStageIndex = 0;
      document.status = DocumentStatus.IN_PROGRESS;
      document.declineReason = null;
      stagesChanged = true;
    }

    if (contentChanged) {
      this.logEvent(document, actor, DocumentEventAction.UPDATED);
    }
    if (stagesChanged) {
      this.logEvent(document, actor, DocumentEventAction.STAGES_UPDATED);
    }

    await this.em.flush();
    return this.findOne(id);
  }

  private toListItem(document: Document): DocumentListItem {
    const currentStage =
      this.sortedStages(document)[document.currentStageIndex];
    return {
      id: document.id,
      title: document.title,
      status: document.status,
      currentStageIndex: document.currentStageIndex,
      currentStageName: currentStage?.name ?? '',
      currentApproverName: currentStage?.approver.name ?? '',
      createdById: document.createdBy?.id ?? null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /** Stages in ascending position order (never mutates entity state). */
  private sortedStages(document: Document): DocumentStage[] {
    return [...document.stages.getItems()].sort(
      (a, b) => a.position - b.position,
    );
  }

  /** Rewrite the loaded collection in position order so serialized output is stable. */
  private sortStages(document: Document): void {
    document.stages.set(this.sortedStages(document));
  }

  private getCurrentStage(document: Document): DocumentStage {
    const stage = this.sortedStages(document)[document.currentStageIndex];
    if (!stage) {
      throw new BadRequestException('Document has no stages');
    }
    return stage;
  }

  private assertInProgress(document: Document): void {
    if (document.status !== DocumentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot act on a document with status ${document.status}`,
      );
    }
  }

  private assertCurrentApprover(document: Document, userId: string): void {
    const stage = this.getCurrentStage(document);
    if (stage.approver.id !== userId) {
      throw new ForbiddenException(
        'Only the assigned approver for the current stage may act on this document',
      );
    }
  }

  private logEvent(
    document: Document,
    actor: User | null,
    action: DocumentEventAction,
    stageName: string | null = null,
    reason: string | null = null,
  ): void {
    const event = this.em.create(DocumentEvent, {
      document,
      actor,
      action,
      stageName,
      reason,
    });
    this.em.persist(event);
  }

  private async requireUser(id: string): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new BadRequestException(`User ${id} not found`);
    }
    return user;
  }
}
