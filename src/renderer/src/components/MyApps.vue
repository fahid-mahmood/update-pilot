<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { AppRow } from '../../../main/types'

const emit = defineEmits<{ (e: 'updates', count: number): void }>()

const rows = ref<AppRow[]>([])
const loading = ref(false)
const checking = ref(false)
const checkDone = ref(0)
const checkTotal = ref(0)
const filter = ref<'all' | 'updates' | 'unknown'>('all')
const search = ref('')
const sortKey = ref<'name' | 'installedVersion' | 'latestVersion' | 'status'>('name')
const sortAsc = ref(true)
const downloadStates = ref(new Map<string, { progress: number; done?: boolean; error?: string }>())

const updatesCount = computed(() => rows.value.filter((r) => r.status === 'update-available').length)

const visible = computed(() => {
  let list = rows.value
  if (filter.value === 'updates') list = list.filter((r) => r.status === 'update-available')
  if (filter.value === 'unknown') list = list.filter((r) => r.status === 'unknown')
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q))

  const dir = sortAsc.value ? 1 : -1
  return [...list].sort((a, b) => {
    const va = sortKey.value === 'latestVersion' ? (a.info?.latestVersion ?? '') : String(a[sortKey.value] ?? '')
    const vb = sortKey.value === 'latestVersion' ? (b.info?.latestVersion ?? '') : String(b[sortKey.value] ?? '')
    return va.localeCompare(vb, undefined, { numeric: true }) * dir
  })
})

function setSort(key: typeof sortKey.value): void {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

async function refresh(): Promise<void> {
  loading.value = true
  try {
    rows.value = await window.api.getApps()
    emit('updates', updatesCount.value)
  } finally {
    loading.value = false
  }
}

async function rescan(): Promise<void> {
  loading.value = true
  try {
    rows.value = await window.api.scanApps()
    emit('updates', updatesCount.value)
  } finally {
    loading.value = false
  }
}

async function checkAll(): Promise<void> {
  checking.value = true
  checkDone.value = 0
  checkTotal.value = rows.value.length
  try {
    rows.value = await window.api.checkAll()
    emit('updates', updatesCount.value)
  } finally {
    checking.value = false
  }
}

async function checkOne(id: string): Promise<void> {
  rows.value = await window.api.checkOne(id)
  emit('updates', updatesCount.value)
}

function statusLabel(s: AppRow['status']): string {
  switch (s) {
    case 'uptodate':
      return 'Up to Date'
    case 'update-available':
      return 'Update Available'
    case 'checking':
      return 'Checking…'
    default:
      return 'Unknown'
  }
}

function sourceLabel(s?: string): string {
  switch (s) {
    case 'sparkle':
      return 'Sparkle'
    case 'homebrew':
      return 'Homebrew'
    case 'vendor':
      return 'Vendor'
    default:
      return '—'
  }
}

function safeName(row: AppRow): string {
  const v = row.info?.latestVersion || 'update'
  return `${row.name.replace(/[/\\?%*:|"<>\s]+/g, '')}-${v}`
}

async function download(row: AppRow): Promise<void> {
  if (!row.info?.downloadUrl) return
  const url = row.info.downloadUrl
  const states = downloadStates.value
  states.set(url, { progress: 0 })
  const res = await window.api.download(url, safeName(row))
  if (!res.success && !res.error) {
    states.delete(url) // canceled by user
  } else if (!res.success) {
    states.set(url, { progress: 0, error: res.error })
  }
}

function openVendor(row: AppRow): void {
  const url = row.info?.homepage || row.homepage
  if (url) void window.api.openUrl(url)
}

window.api?.onCheckProgress((p) => {
  checkDone.value = p.done
  checkTotal.value = p.total
})

window.api?.onDownloadProgress((p) => {
  const states = downloadStates.value
  const cur = states.get(p.url)
  if (cur) states.set(p.url, { ...cur, progress: p.progress })
})

window.api?.onDownloadComplete((p) => {
  const states = downloadStates.value
  const cur = states.get(p.url)
  if (cur) states.set(p.url, { ...cur, progress: 100, done: true })
  void window.api.reveal(p.filePath)
})

window.api?.onDownloadError((p) => {
  const states = downloadStates.value
  const cur = states.get(p.url)
  if (cur) states.set(p.url, { ...cur, error: p.error })
})

onMounted(refresh)
</script>

<template>
  <div class="my-apps">
    <div class="toolbar">
      <input v-model="search" class="search" placeholder="Search installed apps…" />
      <div class="filters">
        <button
          v-for="f in (['all', 'updates', 'unknown'] as const)"
          :key="f"
          :class="['chip', { active: filter === f }]"
          @click="filter = f"
        >
          {{ f === 'all' ? 'All' : f === 'updates' ? `Updates (${updatesCount})` : 'Unknown' }}
        </button>
      </div>
      <div class="spacer" />
      <button class="btn" :disabled="loading || checking" @click="rescan">Rescan</button>
      <button class="btn primary" :disabled="loading || checking" @click="checkAll">
        {{ checking ? `Checking ${checkDone}/${checkTotal}…` : 'Check All' }}
      </button>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th class="sortable" @click="setSort('name')">Name</th>
            <th class="sortable" @click="setSort('installedVersion')">Installed</th>
            <th class="sortable" @click="setSort('latestVersion')">Latest</th>
            <th class="sortable" @click="setSort('status')">Status</th>
            <th>Source</th>
            <th class="actions">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && rows.length === 0">
            <td colspan="6" class="empty">Scanning installed apps…</td>
          </tr>
          <tr v-else-if="visible.length === 0">
            <td colspan="6" class="empty">No apps match this filter.</td>
          </tr>
          <tr v-for="row in visible" :key="row.id">
            <td class="name" :title="row.bundleId">{{ row.name }}</td>
            <td class="mono">{{ row.installedVersion || '—' }}</td>
            <td class="mono">{{ row.info?.latestVersion || '—' }}</td>
            <td>
              <span :class="['status', row.status]">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="muted">{{ sourceLabel(row.info?.source) }}</td>
            <td class="actions">
              <template v-if="row.status === 'update-available' && row.info?.downloadUrl">
                <button
                  v-if="!downloadStates.get(row.info.downloadUrl)"
                  class="btn small primary"
                  @click="download(row)"
                >
                  Download
                </button>
                <span
                  v-else-if="downloadStates.get(row.info.downloadUrl)?.error"
                  class="muted err"
                >
                  {{ downloadStates.get(row.info.downloadUrl)?.error }}
                </span>
                <span v-else-if="downloadStates.get(row.info.downloadUrl)?.done" class="muted ok">
                  Saved ✓
                </span>
                <span v-else class="muted">
                  {{ downloadStates.get(row.info.downloadUrl)?.progress }}%
                </span>
              </template>
              <button v-else-if="row.status === 'unknown'" class="btn small" @click="checkOne(row.id)">
                Check
              </button>
              <button
                v-if="row.status !== 'update-available' && (row.info?.homepage || row.homepage)"
                class="btn small link"
                @click="openVendor(row)"
              >
                Site ↗
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.my-apps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.search {
  flex: 1 1 180px;
  min-width: 150px;
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: var(--card-bg);
}
.search:focus {
  border-color: var(--accent);
}
.filters {
  display: flex;
  gap: 6px;
}
.chip {
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--muted);
}
.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.spacer {
  flex: 1;
}
.btn {
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
}
.btn:hover:not(:disabled) {
  border-color: #c7c8cd;
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.btn.small {
  padding: 4px 10px;
  font-size: 12px;
}
.btn.link {
  border: none;
  background: none;
  color: var(--accent);
  padding: 4px 6px;
}
.table-card {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
thead th {
  position: sticky;
  top: 0;
  background: #fafafb;
  border-bottom: 1px solid var(--border);
  text-align: left;
  padding: 9px 14px;
  font-weight: 600;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}
th.sortable {
  cursor: pointer;
}
th.sortable:hover {
  color: var(--text);
}
tbody td {
  padding: 9px 14px;
  border-bottom: 1px solid #f0f0f3;
  white-space: nowrap;
}
tbody tr:hover {
  background: #f7f8fa;
}
.name {
  font-weight: 500;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.muted {
  color: var(--muted);
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 32px 0 !important;
}
.status {
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 999px;
}
.status.uptodate {
  color: var(--ok);
  background: #e7f4ea;
}
.status.update-available {
  color: #b06000;
  background: #fdf0d5;
}
.status.unknown {
  color: var(--muted);
  background: #efefef;
}
.actions {
  text-align: right;
}
.err {
  color: #c0392b;
}
.ok {
  color: var(--ok);
}
</style>
