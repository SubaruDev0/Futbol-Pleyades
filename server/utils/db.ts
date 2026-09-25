import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import * as schema from '../database/schema'

type Db = NeonHttpDatabase<typeof schema>

let _db: Db | null = null

/**
 * Neon serves queries over HTTP; a plain Postgres speaks the wire protocol, so the
 * connection string decides the driver. Both expose the same Drizzle query API, which
 * is why the local one is cast to the production type instead of widening every caller.
 */
export function useDb(): Db {
  if (_db) return _db

  const url = useRuntimeConfig().databaseUrl
  if (!url) throw new Error('NUXT_DATABASE_URL is not set')

  _db = url.includes('.neon.tech')
    ? drizzleNeon(neon(url), { schema })
    : (drizzlePg(url, { schema }) as unknown as Db)

  return _db
}

export { schema }
