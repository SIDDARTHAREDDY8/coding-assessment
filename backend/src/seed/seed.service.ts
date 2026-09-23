import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Document } from '../documents/document.entity';
import { DocumentStage } from '../documents/document-stage.entity';
import { DocumentEvent } from '../documents/document-event.entity';
import { DocumentEventAction } from '../documents/document-event-action.enum';
import { DocumentStatus } from '../documents/document-status.enum';
import { User } from '../users/user.entity';

function avatarUrlFor(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

interface StageSeed {
  name: string;
  approver: User;
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    await this.orm.getMigrator().up();
    await this.seed();
  }

  private async seed() {
    const userCount = await this.em.count(User);
    if (userCount > 0) {
      await this.backfillProfileFields();
      this.logger.log('Seed data already present, skipping create');
      return;
    }

    this.logger.log('Seeding demo data...');

    const alice = this.em.create(User, {
      name: 'Alice Chen',
      email: 'alice@example.com',
      jobTitle: 'Product Manager',
      avatarUrl: avatarUrlFor('Alice Chen'),
    });
    const bob = this.em.create(User, {
      name: 'Bob Martinez',
      email: 'bob@example.com',
      jobTitle: 'Legal Counsel',
      avatarUrl: avatarUrlFor('Bob Martinez'),
    });
    const cara = this.em.create(User, {
      name: 'Cara Nguyen',
      email: 'cara@example.com',
      jobTitle: 'Compliance Lead',
      avatarUrl: avatarUrlFor('Cara Nguyen'),
    });
    const dan = this.em.create(User, {
      name: 'Dan Patel',
      email: 'dan@example.com',
      jobTitle: 'Engineering Manager',
      avatarUrl: avatarUrlFor('Dan Patel'),
    });
    const eve = this.em.create(User, {
      name: 'Eve Brooks',
      email: 'eve@example.com',
      jobTitle: 'General Counsel',
      avatarUrl: avatarUrlFor('Eve Brooks'),
    });

    this.createDocument(
      'Vendor Onboarding Policy',
      'Draft policy covering how new vendors are evaluated and onboarded.',
      alice,
      [
        { name: 'Draft Review', approver: alice },
        { name: 'Legal Review', approver: bob },
        { name: 'Final Approval', approver: cara },
      ],
    );

    const dataRetention = this.createDocument(
      'Data Retention Guidelines',
      'Guidelines for how long customer data is retained across products.',
      dan,
      [
        { name: 'Draft Review', approver: dan },
        { name: 'Legal Review', approver: eve },
        { name: 'Final Approval', approver: alice },
      ],
      { currentStageIndex: 1 },
    );
    this.logEvent(
      dataRetention,
      dan,
      DocumentEventAction.APPROVED,
      'Draft Review',
    );

    const incidentPlaybook = this.createDocument(
      'Incident Response Playbook',
      'Fully approved playbook for responding to security incidents.',
      bob,
      [
        { name: 'Draft Review', approver: bob },
        { name: 'Legal Review', approver: cara },
        { name: 'Final Approval', approver: dan },
      ],
      { currentStageIndex: 2, status: DocumentStatus.APPROVED },
    );
    this.logEvent(
      incidentPlaybook,
      bob,
      DocumentEventAction.APPROVED,
      'Draft Review',
    );
    this.logEvent(
      incidentPlaybook,
      cara,
      DocumentEventAction.APPROVED,
      'Legal Review',
    );

    await this.em.flush();
    this.logger.log('Seed data created (5 users, 3 documents)');
  }

  private createDocument(
    title: string,
    body: string,
    createdBy: User,
    stages: StageSeed[],
    opts: { currentStageIndex?: number; status?: DocumentStatus } = {},
  ): Document {
    const document = this.em.create(Document, {
      title,
      body,
      currentStageIndex: opts.currentStageIndex ?? 0,
      status: opts.status ?? DocumentStatus.IN_PROGRESS,
      createdBy,
    });
    this.em.persist(document);

    stages.forEach((stage, index) => {
      const stageRow = this.em.create(DocumentStage, {
        document,
        position: index,
        name: stage.name,
        approver: stage.approver,
      });
      this.em.persist(stageRow);
    });

    this.logEvent(document, createdBy, DocumentEventAction.CREATED);
    return document;
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

  /** Fill profile fields if an older seed volume predates these columns. */
  private async backfillProfileFields() {
    const profiles: Record<string, { jobTitle: string; name: string }> = {
      'alice@example.com': {
        name: 'Alice Chen',
        jobTitle: 'Product Manager',
      },
      'bob@example.com': {
        name: 'Bob Martinez',
        jobTitle: 'Legal Counsel',
      },
      'cara@example.com': {
        name: 'Cara Nguyen',
        jobTitle: 'Compliance Lead',
      },
      'dan@example.com': {
        name: 'Dan Patel',
        jobTitle: 'Engineering Manager',
      },
      'eve@example.com': {
        name: 'Eve Brooks',
        jobTitle: 'General Counsel',
      },
    };

    const users = await this.em.find(User, {});
    let updated = 0;
    for (const user of users) {
      const profile = profiles[user.email];
      if (!profile) continue;
      if (user.jobTitle == null || user.avatarUrl == null) {
        user.jobTitle = user.jobTitle ?? profile.jobTitle;
        user.avatarUrl = user.avatarUrl ?? avatarUrlFor(profile.name);
        updated += 1;
      }
    }
    if (updated > 0) {
      await this.em.flush();
      this.logger.log(`Backfilled profile fields for ${updated} users`);
    }
  }
}
