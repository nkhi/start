-- -------------------------------------------------------------
-- TablePlus 6.8.0(654)
--
-- https://tableplus.com/
--
-- Database: start
-- Generation Time: 2026-01-10 03:19:15.9660
-- -------------------------------------------------------------


DROP TABLE IF EXISTS "public"."vlogs";
-- Table Definition
CREATE TABLE "public"."vlogs" (
    "week_start_date" date NOT NULL,
    "video_url" text NOT NULL,
    "embed_html" text NOT NULL,
    PRIMARY KEY ("week_start_date")
);

DROP TABLE IF EXISTS "public"."habits";
-- Table Definition
CREATE TABLE "public"."habits" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    "order" int8,
    "default_time" text,
    "active" bool,
    "created_date" date,
    "comment" text,
    "deadline_time" text DEFAULT ''::text,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."entries";
-- Table Definition
CREATE TABLE "public"."entries" (
    "entry_id" text NOT NULL,
    "date" date NOT NULL,
    "habit_id" text NOT NULL,
    "state" int8,
    "timestamp" timestamptz,
    "comment" text,
    PRIMARY KEY ("entry_id")
);

DROP TABLE IF EXISTS "public"."questions";
-- Table Definition
CREATE TABLE "public"."questions" (
    "id" text NOT NULL,
    "text" text NOT NULL,
    "order" int8,
    "active" bool,
    "date" text,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tasks";
-- Table Definition
CREATE TABLE "public"."tasks" (
    "id" text NOT NULL,
    "text" text NOT NULL,
    "completed" bool,
    "date" date,
    "created_at" timestamptz,
    "category" text,
    "state" text,
    "order" varchar(255),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."next_items";
-- Table Definition
CREATE TABLE "public"."next_items" (
    "id" text NOT NULL,
    "title" text NOT NULL,
    "content" text,
    "color" text,
    "size" text,
    "created_at" timestamptz,
    "deleted_at" timestamptz,
    "started_at" timestamptz,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."lists";
-- Table Definition
CREATE TABLE "public"."lists" (
    "id" text NOT NULL,
    "title" text NOT NULL,
    "color" text,
    "created_at" timestamptz,
    "order" varchar(255),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."list_items";
-- Table Definition
CREATE TABLE "public"."list_items" (
    "id" text NOT NULL,
    "list_id" text NOT NULL,
    "text" text NOT NULL,
    "completed" bool,
    "created_at" timestamptz,
    "position" int8,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."diary_entries";
-- Table Definition
CREATE TABLE "public"."diary_entries" (
    "id" text NOT NULL,
    "date" date NOT NULL,
    "question_id" text NOT NULL,
    "answer" text,
    "created_at" timestamptz,
    "created_at" timestamptz,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."calendar_events";
-- Table Definition
CREATE TABLE "public"."calendar_events" (
    "id" text NOT NULL,
    "summary" text,
    "description" text,
    "start_time" timestamptz,
    "end_time" timestamptz,
    "all_day" bool,
    "status" text,
    "html_link" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."memories";
-- Table Definition
CREATE TABLE "public"."memories" (
    "id" text NOT NULL,
    "text" text NOT NULL,
    "date" date NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."landmarks";
-- Table Definition
CREATE TABLE "public"."landmarks" (
    "id" text NOT NULL,
    "category" text NOT NULL,
    "text" text NOT NULL,
    "date" date,
    "position" int4,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Indices
CREATE INDEX idx_landmarks_category ON public.landmarks USING btree (category);
CREATE INDEX idx_landmarks_position ON public.landmarks USING btree (category, "position");
