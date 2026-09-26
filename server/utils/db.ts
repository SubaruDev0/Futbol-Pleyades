import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import * as schema from '../database/schema'

type Db = NeonHttpDatabase<typeof schema>

let _db: Db | null = null

/**
 * Neon sirve las consultas sobre HTTP; un Postgres normal habla el protocolo de
 * cable, así que el connection string decide el driver. Ambos exponen la misma
 * API de consulta de Drizzle, por eso el local se castea al tipo de producción
 * en vez de ampliar cada llamador.
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

type Statement = Parameters<Db['batch']>[0][number]

/**
 * Ejecuta sentencias todo-o-nada. neon-http no tiene transacciones interactivas,
 * solo `batch` (una transacción sobre HTTP); node-postgres tiene `transaction`
 * y no tiene `batch`. Las sentencias se construyen contra el handle en el que
 * corren, así que no deben depender de los resultados de las otras — lee lo
 * que necesites antes de llamar a esto.
 */
export async function atomically(build: (db: Db) => Statement[]): Promise<void> {
  const db = useDb()
  if (useRuntimeConfig().databaseUrl.includes('.neon.tech')) {
    const [first, ...rest] = build(db)
    if (first) await db.batch([first, ...rest])
    return
  }
  const pg = db as unknown as { transaction: (fn: (tx: Db) => Promise<void>) => Promise<void> }
  await pg.transaction(async (tx) => {
    for (const statement of build(tx)) await statement
  })
}

export { schema }
