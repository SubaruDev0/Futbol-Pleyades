# Pléyades

Organiza los partidos de fútbol 5, 6 y 7 que hoy se coordinan a mano por WhatsApp:
quién juega, dónde, a qué hora, cuánto sale y quién ya transfirió.

## Qué resuelve

| Problema en el chat | Cómo lo resuelve |
| --- | --- |
| La lista numerada se reenvía y se edita a mano | Una sola planilla en base de datos |
| "¿A quién le transfiero?" | El partido define quién cobra, y sus datos solo los ven quienes juegan |
| "F", "sis puedo", "apaño" | Confirmación explícita: voy / quizás / no voy |
| El reparto de la cancha se recalcula a mano | División automática entre los confirmados |
| "Negro y el otro equipo" | Sorteo con azar criptográfico, oscuro vs claro |
| "Llevo dos compás" | Invitados sin cuenta, a cargo de quien los trae |
| "La 5 tiene hoyos" | Notas por recinto, guardadas en vez de rediscutidas |

## Stack

- **Nuxt 4** + **Vuetify 4** con tema propio (sin Material por defecto)
- **Drizzle ORM** sobre **Neon** (Postgres serverless)
- **nuxt-auth-utils** para sesiones — login con teléfono + contraseña

Solo Chile: el formulario pide los 8 dígitos y el prefijo `+56 9` es fijo. De todas formas
el servidor acepta `54971044`, `954971044`, `+56 9 5497 1044` o `56954971044` y los guarda
todos como `+56954971044`, porque la gente pega el número desde sus contactos.
- **@nuxt/fonts** — Barlow y Barlow Condensed self-hosted, sin pedirle nada a Google en runtime

Sin recursos externos en runtime: ni CDN de fuentes ni de íconos.

## Arrancar

Crea un archivo `.env` en la raíz:

```sh
# Postgres local por socket Unix: sin contraseña y sin tocar tu rol de postgres
NUXT_DATABASE_URL="postgresql://subaru@/pleyades?host=/var/run/postgresql"

# Clave para cifrar la cookie de sesión — mínimo 32 caracteres
# Genérala con: openssl rand -base64 32
NUXT_SESSION_PASSWORD=""
```

Después:

```sh
pnpm install
createdb pleyades
psql -d pleyades -f server/database/migrations/0000_init.sql
pnpm dev
```

### Pasar a Neon

Reemplaza solo la línea `NUXT_DATABASE_URL` por la cadena que entrega Neon y corre
`pnpm db:push`. No cambia nada del código: `server/utils/db.ts` elige el driver según
la cadena de conexión, porque Neon responde por HTTP y un Postgres común habla el
protocolo nativo.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm db:push` | Aplica el esquema a la base |
| `pnpm db:generate` | Genera el SQL de migración |
| `pnpm db:studio` | Explorador visual de la base |
| `pnpm exec nuxt typecheck` | Chequeo de tipos |

## Modelo de datos

```
users ──< group_members >── groups ──< matches ──< match_players
                                         │              │
                                      venues        users (opcional:
                                                    null = invitado)
```

- Un jugador no puede confirmar dos veces el mismo partido (índice único parcial).
- Un invitado no tiene cuenta: queda a nombre de quien lo trajo.
- Los datos de transferencia viven en el perfil del usuario y se exponen
  únicamente dentro de un partido donde esa persona cobra.
