<script setup lang="ts">
import { ref, computed } from 'vue'
import MyApps from './components/MyApps.vue'
import SettingsPane from './components/SettingsPane.vue'

const tab = ref<'apps' | 'settings'>('apps')
const updatesCount = ref(0)

function onCount(n: number): void {
  updatesCount.value = n
}
const showBadge = computed(() => updatesCount.value > 0)
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="sidebar-title">Update Pilot</div>
      <nav>
        <button
          :class="['nav-item', { active: tab === 'apps' }]"
          @click="tab = 'apps'"
        >
          <span class="nav-icon">📦</span> My Apps
          <span v-if="showBadge" class="badge">{{ updatesCount }}</span>
        </button>
        <button
          :class="['nav-item', { active: tab === 'settings' }]"
          @click="tab = 'settings'"
        >
          <span class="nav-icon">⚙️</span> Settings
        </button>
      </nav>
      <div class="sidebar-footer">v0.1.0</div>
    </aside>
    <main class="content">
      <MyApps v-if="tab === 'apps'" @updates="onCount" />
      <SettingsPane v-else />
    </main>
  </div>
</template>

<style>
:root {
  --sidebar-bg: #1e1f24;
  --sidebar-fg: #c8cad0;
  --sidebar-active: #2f3138;
  --accent: #2f6fed;
  --content-bg: #f5f5f7;
  --card-bg: #ffffff;
  --border: #e2e3e8;
  --text: #1d1d1f;
  --muted: #6e6e73;
  --ok: #34a853;
  --warn: #e6a700;
}
* {
  box-sizing: border-box;
}
html,
body,
#app {
  height: 100%;
  margin: 0;
}
body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--text);
  user-select: none;
  cursor: default;
}
</style>

<style scoped>
.app {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  color: var(--sidebar-fg);
  display: flex;
  flex-direction: column;
  padding: 54px 10px 12px;
  -webkit-app-region: drag;
}
.sidebar-title {
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  padding: 0 10px 14px;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-app-region: no-drag;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.nav-item:hover {
  background: #26272d;
}
.nav-item.active {
  background: var(--sidebar-active);
  color: #fff;
}
.nav-icon {
  font-size: 14px;
}
.badge {
  margin-left: auto;
  background: var(--accent);
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  padding: 1px 7px;
}
.sidebar-footer {
  margin-top: auto;
  font-size: 11px;
  color: #7a7c84;
  padding: 0 10px;
}
.content {
  flex: 1;
  min-width: 0;
  background: var(--content-bg);
  padding: 52px 16px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
