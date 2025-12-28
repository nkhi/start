-- -------------------------------------------------------------
-- TablePlus 6.7.4(642)
--
-- https://tableplus.com/
--
-- Database: defaultdb
-- Generation Time: 2025-12-19 04:04:10.2130
-- -------------------------------------------------------------


DROP TABLE IF EXISTS "public"."vlogs";
CREATE TABLE public.vlogs (
	week_start_date DATE NOT NULL,
	video_url STRING NOT NULL,
	embed_html STRING NOT NULL,
	CONSTRAINT vlogs_pkey PRIMARY KEY (week_start_date ASC)
);

DROP TABLE IF EXISTS "public"."habits";
CREATE TABLE public.habits (
	id STRING NOT NULL,
	name STRING NOT NULL,
	"order" INT8 NULL,
	default_time STRING NULL,
	active BOOL NULL,
	created_date DATE NULL,
	comment STRING NULL,
	CONSTRAINT habits_pkey PRIMARY KEY (id ASC)
);

DROP TABLE IF EXISTS "public"."entries";
CREATE TABLE public.entries (
	entry_id STRING NOT NULL,
	date DATE NOT NULL,
	habit_id STRING NOT NULL,
	state INT8 NULL,
	"timestamp" TIMESTAMPTZ NULL,
	CONSTRAINT entries_pkey PRIMARY KEY (entry_id ASC)
);

DROP TABLE IF EXISTS "public"."questions";
CREATE TABLE public.questions (
	id STRING NOT NULL,
	text STRING NOT NULL,
	"order" INT8 NULL,
	active BOOL NULL,
	date STRING NULL,
	CONSTRAINT questions_pkey PRIMARY KEY (id ASC)
);

DROP TABLE IF EXISTS "public"."tasks";
CREATE TABLE public.tasks (
	id STRING NOT NULL,
	text STRING NOT NULL,
	completed BOOL NULL,
	date DATE NULL,
	created_at TIMESTAMPTZ NULL,
	category STRING NULL,
	state STRING NULL,
	"order" VARCHAR(255) NULL,
	CONSTRAINT tasks_pkey PRIMARY KEY (id ASC)
);

DROP TABLE IF EXISTS "public"."next_items";
CREATE TABLE public.next_items (
	id STRING NOT NULL,
	title STRING NOT NULL,
	content STRING NULL,
	color STRING NULL,
	size STRING NULL,
	created_at TIMESTAMPTZ NULL,
	deleted_at TIMESTAMPTZ NULL,
	started_at TIMESTAMPTZ NULL,
	CONSTRAINT next_items_pkey PRIMARY KEY (id ASC)
);

DROP TABLE IF EXISTS "public"."lists";
CREATE TABLE public.lists (
	id STRING NOT NULL,
	title STRING NOT NULL,
	color STRING NULL,
	created_at TIMESTAMPTZ NULL,
	"order" VARCHAR(255) NULL,
	CONSTRAINT lists_pkey PRIMARY KEY (id ASC)
);

DROP TABLE IF EXISTS "public"."list_items";
CREATE TABLE public.list_items (
	id STRING NOT NULL,
	list_id STRING NOT NULL,
	text STRING NOT NULL,
	completed BOOL NULL,
	created_at TIMESTAMPTZ NULL,
	"position" INT8 NULL,
	CONSTRAINT list_items_pkey PRIMARY KEY (id ASC)
);

DROP TABLE IF EXISTS "public"."diary_entries";
CREATE TABLE public.diary_entries (
	id STRING NOT NULL,
	date DATE NOT NULL,
	question_id STRING NOT NULL,
	answer STRING NULL,
	created_at TIMESTAMPTZ NULL,
	CONSTRAINT diary_entries_pkey PRIMARY KEY (id ASC)
);


DROP TABLE IF EXISTS "public"."calendar_events";
CREATE TABLE public.calendar_events (
	id STRING NOT NULL,
	summary STRING NULL,
	description STRING NULL,
	start_time TIMESTAMPTZ NULL,
	end_time TIMESTAMPTZ NULL,
	all_day BOOL NULL,
	status STRING NULL,
	html_link STRING NULL,
	created_at TIMESTAMPTZ NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NULL DEFAULT now(),
	CONSTRAINT calendar_events_pkey PRIMARY KEY (id ASC)
);
