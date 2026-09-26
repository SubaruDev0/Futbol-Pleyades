import { eq, like, or } from 'drizzle-orm'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Los partidos se juegan en Chile; el slug nombra el horario local de inicio, no el del servidor.
const LOCAL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Santiago',
  day: 'numeric',
  month: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** "fushipelota-29-sep-18h", o "...-18h30" cuando el inicio no es en punto. */
export function matchSlugBase(groupName: string, kickoffAt: Date): string {
  const part = (type: string) =>
    Number(LOCAL.formatToParts(kickoffAt).find(p => p.type === type)?.value ?? 0)
  const minute = part('minute')
  const time = `${part('hour')}h${minute ? String(minute).padStart(2, '0') : ''}`
  return [slugify(groupName), part('day'), MONTHS[part('month') - 1], time]
    .filter(Boolean)
    .join('-')
}

/** El slug base, o el primer "-2", "-3"... libre después de él. */
export async function uniqueMatchSlug(groupName: string, kickoffAt: Date): Promise<string> {
  const base = matchSlugBase(groupName, kickoffAt)
  const taken = new Set(
    (
      await useDb()
        .select({ slug: schema.matches.slug })
        .from(schema.matches)
        .where(or(eq(schema.matches.slug, base), like(schema.matches.slug, `${base}-%`)))
    ).map(r => r.slug),
  )
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** Una ruta de partido acepta su slug o su id; todo lo que sigue funciona con el id. */
export async function resolveMatchId(ref: string): Promise<string> {
  if (UUID.test(ref)) return ref
  const [row] = await useDb()
    .select({ id: schema.matches.id })
    .from(schema.matches)
    .where(eq(schema.matches.slug, ref.toLowerCase()))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Partido no encontrado' })
  return row.id
}

export const matchIdParam = (event: Parameters<typeof getRouterParam>[0]) =>
  resolveMatchId(getRouterParam(event, 'id') ?? '')
