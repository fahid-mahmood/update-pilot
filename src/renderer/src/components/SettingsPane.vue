<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Settings } from '../../../main/types'

const settings = ref<Settings | null>(null)
const scanPathsText = ref('')
const saved = ref(false)

onMounted(async () => {
  settings.value = await window.api.getSettings()
  scanPathsText.value = (settings.value.scanPaths || []).join('\n')
})

async function save(): Promise<void> {
  if (!settings.value) return
  const paths = scanPathsText.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  settings.value.scanPaths = paths
  await window.api.setSettings(settings.value)
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}

async function clearCache(): Promise<void> {
  await window.api.clearCaskCache()
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}
</script>

<template>
  <div class="settings">
    <h2>Settings</h2>

    <section>
      <h3>Scan folders</h3>
      <p class="hint">
        One folder per line. Leave empty to use the defaults:
        <code>/Applications</code> and <code>~/Applications</code>.
      </p>
      <textarea v-model="scanPathsText" rows="4" placeholder="/Applications" />
    </section>

    <section>
      <h3>Update sources</h3>
      <p class="hint">
        Update Pilot only uses official channels: the app's own Sparkle feed,
        the public Homebrew cask index, and vendor websites. The Homebrew
        index is cached locally for a week.
      </p>
      <button class="btn" @click="clearCache">Refresh Homebrew index now</button>
    </section>

    <div class="footer">
      <button class="btn primary" @click="save">Save</button>
      <span v-if="saved" class="saved">Saved ✓</span>
    </div>
  </div>
</template>

<style scoped>
.settings {
  max-width: 640px;
  overflow: auto;
}
h2 {
  margin: 4px 0 16px;
  font-size: 20px;
}
section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
}
h3 {
  margin: 0 0 6px;
  font-size: 14px;
}
.hint {
  color: var(--muted);
  font-size: 12.5px;
  margin: 0 0 10px;
  line-height: 1.5;
}
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  resize: vertical;
  outline: none;
}
textarea:focus {
  border-color: var(--accent);
}
.btn {
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
}
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.footer {
  display: flex;
  align-items: center;
  gap: 10px;
}
.saved {
  color: var(--ok);
  font-size: 13px;
}
</style>
