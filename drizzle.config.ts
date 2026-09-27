import { defineConfig } from 'drizzle-kit'

// drizzle-kit corre fuera de Nuxt, así que el .env no viene cargado.
try {
  process.loadEnvFile()
}
catch {
  // Sin .env: se usa lo que ya esté en el entorno.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    // Neon deja la cadena en DATABASE_URL; Nuxt la toma de NUXT_DATABASE_URL.
    url: (process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL)!,
  },
})
