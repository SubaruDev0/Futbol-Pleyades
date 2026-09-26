ALTER TABLE "matches" ADD COLUMN "slug" text;--> statement-breakpoint
WITH local AS (
	SELECT
		m.id,
		m.created_at,
		m.kickoff_at AT TIME ZONE 'America/Santiago' AS at,
		trim(both '-' from regexp_replace(
			translate(lower(g.name), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
			'[^a-z0-9]+', '-', 'g'
		)) AS name_slug
	FROM "matches" m
	JOIN "groups" g ON g.id = m.group_id
), base AS (
	SELECT
		id,
		created_at,
		concat_ws('-',
			nullif(name_slug, ''),
			extract(day FROM at)::int,
			(ARRAY['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month FROM at)::int],
			extract(hour FROM at)::int || 'h' || CASE WHEN extract(minute FROM at) <> 0 THEN to_char(at, 'MI') ELSE '' END
		) AS slug
	FROM local
), numbered AS (
	SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS n
	FROM base
)
UPDATE "matches" m
SET "slug" = CASE WHEN numbered.n = 1 THEN numbered.slug ELSE numbered.slug || '-' || numbered.n END
FROM numbered
WHERE numbered.id = m.id;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_slug_unique" UNIQUE("slug");
