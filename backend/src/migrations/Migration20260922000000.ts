import { Migration } from '@mikro-orm/migrations';

export class Migration20260922000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "document_stages" (
        "id" uuid not null,
        "document_id" uuid not null,
        "position" int not null,
        "name" varchar(255) not null,
        "approver_id" uuid not null,
        constraint "document_stages_pkey" primary key ("id")
      );
    `);
    this.addSql(`
      alter table "document_stages"
        add constraint "document_stages_document_id_foreign"
        foreign key ("document_id") references "documents" ("id")
        on update cascade on delete cascade;
    `);
    this.addSql(`
      alter table "document_stages"
        add constraint "document_stages_approver_id_foreign"
        foreign key ("approver_id") references "users" ("id")
        on update cascade;
    `);

    this.addSql(`
      create table "document_events" (
        "id" uuid not null,
        "document_id" uuid not null,
        "actor_id" uuid null,
        "action" text check ("action" in ('CREATED', 'APPROVED', 'REJECTED', 'REOPENED', 'UPDATED', 'STAGES_UPDATED')) not null,
        "stage_name" varchar(255) null,
        "reason" text null,
        "created_at" timestamptz not null,
        constraint "document_events_pkey" primary key ("id")
      );
    `);
    this.addSql(`
      alter table "document_events"
        add constraint "document_events_document_id_foreign"
        foreign key ("document_id") references "documents" ("id")
        on update cascade on delete cascade;
    `);
    this.addSql(`
      alter table "document_events"
        add constraint "document_events_actor_id_foreign"
        foreign key ("actor_id") references "users" ("id")
        on update cascade;
    `);

    this.addSql(
      `alter table "documents" add column "current_stage_index" int not null default 0;`,
    );
    this.addSql(
      `alter table "documents" add column "decline_reason" text null;`,
    );
    this.addSql(
      `alter table "documents" add column "created_by_id" uuid null;`,
    );
    this.addSql(`
      alter table "documents"
        add constraint "documents_created_by_id_foreign"
        foreign key ("created_by_id") references "users" ("id")
        on update cascade;
    `);

    // Data-migrate the old fixed 3-stage columns into per-document stage rows.
    this.addSql(`
      insert into "document_stages" ("id", "document_id", "position", "name", "approver_id")
      select gen_random_uuid(), "id", 0, 'Draft Review', "draft_review_approver_id"
      from "documents";
    `);
    this.addSql(`
      insert into "document_stages" ("id", "document_id", "position", "name", "approver_id")
      select gen_random_uuid(), "id", 1, 'Legal Review', "legal_review_approver_id"
      from "documents";
    `);
    this.addSql(`
      insert into "document_stages" ("id", "document_id", "position", "name", "approver_id")
      select gen_random_uuid(), "id", 2, 'Final Approval', "final_approval_approver_id"
      from "documents";
    `);
    this.addSql(`
      update "documents" set "current_stage_index" =
        case "current_stage"
          when 'DRAFT_REVIEW' then 0
          when 'LEGAL_REVIEW' then 1
          when 'FINAL_APPROVAL' then 2
          else 0
        end;
    `);

    // Drop the old fixed-stage columns (dropping current_stage also drops its
    // check constraint).
    this.addSql(
      `alter table "documents" drop constraint "documents_draft_review_approver_id_foreign";`,
    );
    this.addSql(
      `alter table "documents" drop constraint "documents_legal_review_approver_id_foreign";`,
    );
    this.addSql(
      `alter table "documents" drop constraint "documents_final_approval_approver_id_foreign";`,
    );
    this.addSql(
      `alter table "documents" drop column "draft_review_approver_id";`,
    );
    this.addSql(
      `alter table "documents" drop column "legal_review_approver_id";`,
    );
    this.addSql(
      `alter table "documents" drop column "final_approval_approver_id";`,
    );
    this.addSql(`alter table "documents" drop column "current_stage";`);

    // Recreate the status check to include DECLINED.
    this.addSql(
      `alter table "documents" drop constraint if exists "documents_status_check";`,
    );
    this.addSql(`
      alter table "documents"
        add constraint "documents_status_check"
        check ("status" in ('IN_PROGRESS', 'APPROVED', 'DECLINED'));
    `);
  }

  override async down(): Promise<void> {
    // NOTE: this migration is not fully reversible. The old fixed enum columns
    // (current_stage, draft/legal/final approver ids) were dropped after their
    // data was migrated into document_stages rows; rolling back cannot restore
    // their data, so only the new schema artifacts are removed.
    this.addSql(`drop table if exists "document_events" cascade;`);
    this.addSql(`drop table if exists "document_stages" cascade;`);

    this.addSql(
      `alter table "documents" drop constraint if exists "documents_created_by_id_foreign";`,
    );
    this.addSql(`alter table "documents" drop column if exists "created_by_id";`);
    this.addSql(`alter table "documents" drop column if exists "decline_reason";`);
    this.addSql(
      `alter table "documents" drop column if exists "current_stage_index";`,
    );

    this.addSql(
      `alter table "documents" drop constraint if exists "documents_status_check";`,
    );
    this.addSql(`
      alter table "documents"
        add constraint "documents_status_check"
        check ("status" in ('IN_PROGRESS', 'APPROVED'));
    `);
  }
}
