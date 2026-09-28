<script setup lang="ts">
import { mdiClose, mdiMagnify, mdiPencilOutline, mdiRefresh, mdiTrashCanOutline } from '@mdi/js'
import ConfirmDelete from '~/components/ConfirmDelete.vue'
import { ADMIN_TABLES } from '#shared/utils/admin-tables'
import type { AdminField, AdminTable } from '#shared/utils/admin-tables'

useHead({ title: 'Admin' })

// El servidor responde 404 a cualquier otra cuenta; esto solo evita mostrar un panel vacío.
const { data: isAdmin } = await useIsAdmin()
if (!isAdmin.value) await navigateTo('/', { replace: true })

type Row = Record<string, unknown> & { id: string }
interface TableData { rows: Row[], fields: AdminField[], limit: number }
type Counts = DeletionCounts & {
  memberships?: number
  reassignedGroups?: number
  reassignedMatches?: number
}

type ColKind = 'text' | 'date' | 'datetime' | 'money' | 'bool' | 'mono' | 'enum' | 'format'
interface Column { key: string, label: string, kind?: ColKind }

const TABLES: Record<AdminTable, { label: string, columns: Column[], name: (r: Row) => string }> = {
  users: {
    label: 'Usuarios',
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'phone', label: 'Celular', kind: 'mono' },
      { key: 'groups', label: 'Grupos' },
      { key: 'hasAvatar', label: 'Foto', kind: 'bool' },
      { key: 'createdAt', label: 'Creado', kind: 'date' },
    ],
    name: r => String(r.name),
  },
  groups: {
    label: 'Grupos',
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'inviteCode', label: 'Código', kind: 'mono' },
      { key: 'defaultFormat', label: 'Formato', kind: 'format' },
      { key: 'members', label: 'Miembros' },
      { key: 'createdByName', label: 'Creado por' },
      { key: 'createdAt', label: 'Creado', kind: 'date' },
    ],
    name: r => String(r.name),
  },
  group_members: {
    label: 'Miembros',
    columns: [
      { key: 'groupName', label: 'Grupo' },
      { key: 'userName', label: 'Persona' },
      { key: 'userPhone', label: 'Celular', kind: 'mono' },
      { key: 'role', label: 'Rol', kind: 'enum' },
      { key: 'joinedAt', label: 'Se unió', kind: 'date' },
    ],
    name: r => `${r.userName} de ${r.groupName}`,
  },
  venues: {
    label: 'Canchas',
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'address', label: 'Dirección' },
      { key: 'mapsUrl', label: 'Maps' },
      { key: 'notes', label: 'Notas' },
      { key: 'createdAt', label: 'Creada', kind: 'date' },
    ],
    name: r => String(r.name),
  },
  matches: {
    label: 'Partidos',
    columns: [
      { key: 'slug', label: 'Partido', kind: 'mono' },
      { key: 'groupName', label: 'Grupo' },
      { key: 'kickoffAt', label: 'Fecha', kind: 'datetime' },
      { key: 'venueName', label: 'Cancha' },
      { key: 'fieldLabel', label: 'Sub-cancha' },
      { key: 'format', label: 'Formato', kind: 'format' },
      { key: 'capacity', label: 'Cupos' },
      { key: 'totalCost', label: 'Costo', kind: 'money' },
      { key: 'status', label: 'Estado', kind: 'enum' },
      { key: 'createdByName', label: 'Creado por' },
    ],
    name: r => String(r.slug),
  },
  match_players: {
    label: 'Anotados',
    columns: [
      { key: 'matchSlug', label: 'Partido', kind: 'mono' },
      { key: 'playerName', label: 'Jugador' },
      { key: 'guest', label: 'Invitado', kind: 'bool' },
      { key: 'invitedByName', label: 'Lo trajo' },
      { key: 'status', label: 'Estado', kind: 'enum' },
      { key: 'kit', label: 'Camiseta', kind: 'enum' },
      { key: 'paid', label: 'Pagado', kind: 'bool' },
      { key: 'respondedAt', label: 'Respondió', kind: 'datetime' },
    ],
    name: r => String(r.playerName),
  },
  payment_accounts: {
    label: 'Datos de pago',
    columns: [
      { key: 'userName', label: 'Usuario' },
      { key: 'holderName', label: 'Titular' },
      { key: 'rut', label: 'RUT', kind: 'mono' },
      { key: 'bank', label: 'Banco', kind: 'enum' },
      { key: 'accountType', label: 'Tipo', kind: 'enum' },
      { key: 'accountNumber', label: 'Cuenta', kind: 'mono' },
      { key: 'email', label: 'Correo' },
      { key: 'updatedAt', label: 'Actualizado', kind: 'date' },
    ],
    name: r => `los datos de pago de ${r.userName}`,
  },
  payment_receipts: {
    label: 'Comprobantes',
    columns: [
      { key: 'matchSlug', label: 'Partido', kind: 'mono' },
      { key: 'playerName', label: 'Jugador' },
      { key: 'uploadedByName', label: 'Subido por' },
      { key: 'status', label: 'Estado', kind: 'enum' },
      { key: 'rejectReason', label: 'Motivo' },
      { key: 'createdAt', label: 'Subido', kind: 'datetime' },
      { key: 'reviewedAt', label: 'Revisado', kind: 'datetime' },
    ],
    name: r => `el comprobante de ${r.playerName}`,
  },
}

const FIELD_LABEL: Record<string, string> = {
  name: 'Nombre',
  defaultFormat: 'Formato por defecto',
  role: 'Rol',
  address: 'Dirección',
  mapsUrl: 'Link de Google Maps',
  notes: 'Notas',
  status: 'Estado',
  kickoffAt: 'Fecha y hora',
  fieldLabel: 'Sub-cancha',
  capacity: 'Cupos',
  totalCost: 'Costo total (CLP)',
  kit: 'Camiseta',
  paid: 'Pagado',
  rejectReason: 'Motivo de rechazo',
}

const { user } = useUserSession()
const toast = useToast()

const table = ref<AdminTable>('users')
const filter = ref('')
watch(table, () => { filter.value = '' })

// Una clave por tabla: al cambiar de pestaña no se ven filas viejas con columnas nuevas.
const { data, status, error, refresh } = useAsyncData(
  () => `pl-admin-${table.value}`,
  () => $fetch<TableData>(`/api/admin/${table.value}`),
  { server: false, immediate: isAdmin.value },
)

const config = computed(() => TABLES[table.value])
const fields = computed(() => data.value?.fields ?? [])
const loading = computed(() => status.value === 'pending')

const pad = (n: number) => String(n).padStart(2, '0')

function cell(row: Row, col: Column): string {
  const v = row[col.key]
  if (v === null || v === undefined || v === '') return '—'
  switch (col.kind) {
    case 'bool': return v ? 'Sí' : 'No'
    case 'money': return clp(Number(v))
    case 'format': return FORMAT_LABEL[String(v)] ?? String(v)
    case 'enum': return String(v).replaceAll('_', ' ')
    case 'date': {
      const d = new Date(String(v))
      return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
    }
    case 'datetime': return `${matchDay(String(v))} ${matchTime(String(v))}`
    default: return String(v)
  }
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const rows = computed(() => {
  const all = data.value?.rows ?? []
  const q = fold(filter.value.trim())
  if (!q) return all
  return all.filter(r => config.value.columns.some(c => fold(cell(r, c)).includes(q)))
})

const canDelete = (row: Row) => !(table.value === 'users' && row.id === user.value?.id)

// --- Editar -------------------------------------------------------------------
const edit = reactive({
  open: false,
  row: null as Row | null,
  draft: {} as Record<string, any>,
  initial: {} as Record<string, unknown>,
  busy: false,
  error: '',
})

function toLocalInput(value: unknown): string {
  if (!value) return ''
  const d = new Date(String(value))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Del borrador a lo que espera el PATCH; se usa también sobre el estado inicial para mandar solo lo que cambió. */
function serialize(f: AdminField, v: any): unknown {
  switch (f.kind) {
    case 'number': return v === '' || v === null || v === undefined ? null : Number(v)
    case 'datetime': return v ? new Date(v).toISOString() : null
    case 'switch': return !!v
    case 'select': return v ?? null
    default: return typeof v === 'string' ? v.trim() : ''
  }
}

function openEdit(row: Row) {
  const draft: Record<string, any> = {}
  for (const f of fields.value) {
    const v = row[f.key]
    draft[f.key] = f.kind === 'datetime' ? toLocalInput(v) : f.kind === 'number' ? (v ?? '') : f.kind === 'switch' ? !!v : (v ?? (f.kind === 'select' ? null : ''))
  }
  const initial: Record<string, unknown> = {}
  for (const f of fields.value) initial[f.key] = serialize(f, draft[f.key])
  Object.assign(edit, { open: true, row, draft, initial, busy: false, error: '' })
}

async function saveEdit() {
  const row = edit.row
  if (!row) return
  const body: Record<string, unknown> = {}
  for (const f of fields.value) {
    const v = serialize(f, edit.draft[f.key])
    if (!f.nullable && (v === null || v === '')) {
      edit.error = `Completa ${FIELD_LABEL[f.key]?.toLowerCase() ?? f.key}.`
      return
    }
    if (f.kind === 'number' && v !== null && !Number.isInteger(v)) {
      edit.error = `${FIELD_LABEL[f.key] ?? f.key} debe ser un número entero.`
      return
    }
    if (JSON.stringify(v) !== JSON.stringify(edit.initial[f.key])) body[f.key] = v
  }
  if (!Object.keys(body).length) {
    edit.open = false
    return
  }
  edit.busy = true
  edit.error = ''
  try {
    await $fetch(`/api/admin/${table.value}/${row.id}`, { method: 'PATCH', body })
    edit.open = false
    toast.success('Cambios guardados')
    await refresh()
  }
  catch (e) {
    edit.error = apiError(e)
  }
  finally {
    edit.busy = false
  }
}

// --- Borrar -------------------------------------------------------------------
const del = reactive({
  open: false,
  row: null as Row | null,
  loss: null as string | null,
  busy: false,
  error: '',
})

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function lossFor(t: AdminTable, c: Counts): string {
  if (t === 'venues') return 'Los partidos que la usan quedan sin cancha. No se puede deshacer.'
  if (t !== 'users') return lossText(c)
  const extra: string[] = []
  if (c.memberships) extra.push(`Sale de ${plural(c.memberships, 'grupo', 'grupos')}.`)
  const g = c.reassignedGroups ?? 0
  const m = c.reassignedMatches ?? 0
  if (g || m) {
    const what = [g && plural(g, 'grupo', 'grupos'), m && plural(m, 'partido', 'partidos')].filter(Boolean).join(' y ')
    extra.push(`${what} que creó pasan a tu nombre.`)
  }
  return [...extra, lossText({ players: c.players, receipts: c.receipts })].join(' ')
}

async function askDelete(row: Row) {
  const t = table.value
  Object.assign(del, { open: true, row, loss: null, busy: false, error: '' })
  try {
    const { counts } = await $fetch<{ counts: Counts }>(`/api/admin/${t}/${row.id}`, {
      method: 'DELETE',
      query: { dryRun: 1 },
    })
    if (del.row?.id === row.id) del.loss = lossFor(t, counts)
  }
  catch (e) {
    del.error = apiError(e)
  }
}

async function confirmDelete() {
  const row = del.row
  if (!row) return
  del.busy = true
  del.error = ''
  try {
    await $fetch(`/api/admin/${table.value}/${row.id}`, { method: 'DELETE' })
    del.open = false
    toast.success('Fila borrada')
    await refresh()
  }
  catch (e) {
    del.error = apiError(e)
  }
  finally {
    del.busy = false
  }
}

const typeToConfirm = computed(() =>
  del.row && (table.value === 'users' || table.value === 'groups') ? String(del.row.name) : undefined)
</script>

<template>
  <div v-if="isAdmin" class="pl-admin">
    <header class="pl-admin__head">
      <p class="pl-eyebrow">Solo tu cuenta ve esto</p>
      <h1 class="pl-display pl-admin__title">Admin</h1>
    </header>

    <nav class="pl-admin__tabs" role="tablist" aria-label="Tablas">
      <button
        v-for="key in ADMIN_TABLES"
        :key="key"
        type="button"
        role="tab"
        class="pl-admin__tab"
        :class="{ 'pl-admin__tab--active': table === key }"
        :aria-selected="table === key"
        @click="table = key"
      >
        {{ TABLES[key].label }}
      </button>
    </nav>

    <section class="pl-panel pl-admin__panel">
      <div class="pl-admin__bar">
        <v-text-field
          v-model="filter"
          :prepend-inner-icon="mdiMagnify"
          placeholder="Filtrar filas"
          density="compact"
          hide-details
          clearable
          class="pl-admin__filter"
        />
        <span class="pl-admin__count pl-numeric">
          {{ rows.length }}<template v-if="filter"> de {{ data?.rows.length ?? 0 }}</template> filas
        </span>
        <button type="button" class="pl-admin__icon" aria-label="Recargar" title="Recargar" :disabled="loading" @click="refresh()">
          <v-icon :icon="mdiRefresh" size="18" />
        </button>
      </div>

      <p v-if="error" class="pl-admin__error" role="alert">{{ apiError(error) }}</p>
      <p v-else-if="loading && !data" class="pl-admin__muted">Cargando…</p>
      <p v-else-if="!rows.length" class="pl-admin__muted">
        {{ filter ? 'Ninguna fila coincide con el filtro.' : 'Esta tabla está vacía.' }}
      </p>

      <v-table v-else density="compact" class="pl-admin__table" :class="{ 'pl-admin__table--busy': loading }">
        <thead>
          <tr>
            <th v-for="col in config.columns" :key="col.key">{{ col.label }}</th>
            <th class="pl-admin__actions-col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td
              v-for="col in config.columns"
              :key="col.key"
              :class="{ 'pl-numeric': col.kind === 'money' || col.kind === 'mono', 'pl-admin__mono': col.kind === 'mono' }"
              :title="cell(row, col)"
            >
              {{ cell(row, col) }}
            </td>
            <td class="pl-admin__actions">
              <button
                v-if="fields.length"
                type="button"
                class="pl-admin__icon"
                :aria-label="`Editar ${config.name(row)}`"
                title="Editar"
                @click="openEdit(row)"
              >
                <v-icon :icon="mdiPencilOutline" size="16" />
              </button>
              <button
                type="button"
                class="pl-admin__icon pl-admin__icon--danger"
                :aria-label="`Borrar ${config.name(row)}`"
                :title="canDelete(row) ? 'Borrar' : 'No puedes borrar tu propia cuenta'"
                :disabled="!canDelete(row)"
                @click="askDelete(row)"
              >
                <v-icon :icon="mdiTrashCanOutline" size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </v-table>

      <p v-if="data && data.rows.length >= data.limit" class="pl-admin__muted pl-admin__foot">
        Se muestran las {{ data.limit }} filas más recientes.
      </p>
    </section>

    <v-dialog v-model="edit.open" max-width="480" :persistent="edit.busy" content-class="pl-admin-edit-wrap">
      <section v-if="edit.row" class="pl-panel pl-admin__edit" role="dialog" aria-labelledby="pl-admin-edit-title">
        <header class="pl-admin__edithead">
          <div>
            <p class="pl-eyebrow">{{ config.label }}</p>
            <h2 id="pl-admin-edit-title" class="pl-display pl-admin__edittitle">Edita {{ config.name(edit.row) }}</h2>
          </div>
          <button type="button" class="pl-admin__icon" aria-label="Cerrar" :disabled="edit.busy" @click="edit.open = false">
            <v-icon :icon="mdiClose" size="18" />
          </button>
        </header>

        <form class="pl-admin__form" @submit.prevent="saveEdit">
          <template v-for="f in fields" :key="f.key">
            <v-select
              v-if="f.kind === 'select'"
              v-model="edit.draft[f.key]"
              :label="FIELD_LABEL[f.key] ?? f.key"
              :items="[...(f.options ?? [])]"
              :clearable="f.nullable"
            />
            <v-switch
              v-else-if="f.kind === 'switch'"
              v-model="edit.draft[f.key]"
              :label="FIELD_LABEL[f.key] ?? f.key"
              color="primary"
              hide-details
              inset
            />
            <v-textarea
              v-else-if="f.kind === 'textarea'"
              v-model="edit.draft[f.key]"
              :label="FIELD_LABEL[f.key] ?? f.key"
              rows="2"
              auto-grow
            />
            <v-text-field
              v-else
              v-model="edit.draft[f.key]"
              :label="FIELD_LABEL[f.key] ?? f.key"
              :type="f.kind === 'number' ? 'number' : f.kind === 'datetime' ? 'datetime-local' : 'text'"
              :inputmode="f.kind === 'number' ? 'numeric' : undefined"
            />
          </template>

          <p v-if="edit.error" class="pl-admin__error" role="alert">{{ edit.error }}</p>

          <footer class="pl-admin__editactions">
            <v-btn variant="text" :disabled="edit.busy" @click="edit.open = false">Cancelar</v-btn>
            <v-btn type="submit" color="primary" :loading="edit.busy">Guardar</v-btn>
          </footer>
        </form>
      </section>
    </v-dialog>

    <ConfirmDelete
      v-model="del.open"
      :title="del.row ? `Borrar ${config.name(del.row)}` : 'Borrar'"
      :loss="del.loss"
      confirm-label="Borrar"
      :type-to-confirm="typeToConfirm"
      :busy="del.busy"
      :error="del.error"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
:global(.pl-admin-edit-wrap:focus-visible) {
  outline: none;
}

.pl-admin {
  min-width: 0;
}

.pl-admin__head .pl-eyebrow {
  margin: 0;
}

.pl-admin__title {
  margin: 0.3rem 0 0;
  font-size: clamp(2.2rem, 8vw, 3.2rem);
}

/* --- Pestañas: una fila que se desliza dentro de sí misma, nunca la página. */

.pl-admin__tabs {
  display: flex;
  gap: 1.1rem;
  margin-top: 1.2rem;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--pl-line);
}

.pl-admin__tab {
  flex: none;
  padding: 0.55rem 0;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--pl-ink-dim);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.84rem;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 140ms ease,
    border-color 140ms ease;
}

.pl-admin__tab:hover {
  color: var(--pl-ink);
}

.pl-admin__tab--active {
  color: var(--pl-ink);
  border-bottom-color: var(--pl-accent);
}

/* --- Panel y tabla ------------------------------------------------------------ */

.pl-admin__panel {
  margin-top: 1rem;
  min-width: 0;
  border-top: 2px solid var(--pl-accent);
}

.pl-admin__bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border-bottom: 1px solid var(--pl-line);
}

.pl-admin__filter {
  flex: 1;
  min-width: 0;
  max-width: 340px;
}

.pl-admin__count {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--pl-ink-dim);
  white-space: nowrap;
}

.pl-admin__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--pl-line-strong);
  color: var(--pl-ink-dim);
  cursor: pointer;
  transition:
    border-color 140ms ease,
    color 140ms ease;
}

.pl-admin__icon:hover:not(:disabled) {
  border-color: var(--pl-accent);
  color: var(--pl-accent);
}

.pl-admin__icon--danger:hover:not(:disabled) {
  border-color: var(--pl-red);
  color: var(--pl-red);
}

.pl-admin__icon:disabled {
  opacity: 0.35;
  cursor: default;
}

.pl-admin__muted,
.pl-admin__error {
  margin: 0;
  padding: 1rem 0.9rem;
  font-size: 0.9rem;
  color: var(--pl-ink-faint);
}

.pl-admin__error {
  color: var(--pl-red);
}

.pl-admin__foot {
  border-top: 1px solid var(--pl-line);
  font-size: 0.8rem;
}

/* v-table ya envuelve la tabla en un contenedor con scroll horizontal propio. */
.pl-admin__table {
  background: transparent;
  transition: opacity 140ms ease;
}

.pl-admin__table--busy {
  opacity: 0.55;
}

.pl-admin__table :deep(th) {
  font-family: var(--font-display);
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.72rem;
  color: var(--pl-ink-dim) !important;
  white-space: nowrap;
  border-bottom: 1px solid var(--pl-line-strong) !important;
}

.pl-admin__table :deep(td) {
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.86rem;
  border-bottom: 1px solid var(--pl-line) !important;
}

.pl-admin__table :deep(tbody tr:hover) {
  background: rgba(var(--v-theme-primary), 0.05);
}

.pl-admin__mono {
  font-size: 0.8rem !important;
  letter-spacing: 0.02em;
}

.pl-admin__actions-col,
.pl-admin__actions {
  width: 1%;
}

.pl-admin__actions {
  max-width: none !important;
  overflow: visible !important;
}

.pl-admin__actions > * {
  display: inline-grid;
  vertical-align: middle;
}

.pl-admin__actions > * + * {
  margin-left: 0.35rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* --- Diálogo de edición ------------------------------------------------------- */

.pl-admin__edit {
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 1.1rem 1.2rem 1.2rem;
  border-top: 2px solid var(--pl-accent);
}

.pl-admin__edithead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.pl-admin__edithead .pl-eyebrow {
  margin: 0;
}

.pl-admin__edittitle {
  margin: 0.3rem 0 0;
  font-size: 1.6rem;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.pl-admin__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1.1rem;
}

.pl-admin__form .pl-admin__error {
  padding: 0;
}

.pl-admin__editactions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.3rem;
}

@media (max-width: 600px) {
  .pl-admin__bar {
    flex-wrap: wrap;
  }
  .pl-admin__filter {
    flex-basis: 100%;
    max-width: none;
    order: 1;
  }
}
</style>
