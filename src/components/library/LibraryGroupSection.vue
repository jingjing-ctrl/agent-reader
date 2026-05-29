<script setup>
defineProps({
  tabs: { type: Array, required: true },
  activeFilter: { type: String, required: true },
  showPanel: { type: Boolean, default: false },
  groups: { type: Array, default: () => [] },
  newGroupName: { type: String, default: '' },
  editingGroupId: { type: String, default: null },
  editingGroupName: { type: String, default: '' },
  countInFilter: { type: Function, required: true },
})

const emit = defineEmits([
  'select-filter',
  'update:newGroupName',
  'update:editingGroupName',
  'create-group',
  'save-edit',
  'cancel-edit',
  'start-edit',
  'remove-group',
])
</script>

<template>
  <div class="group-bar-wrap">
    <div class="group-bar" role="tablist" aria-label="书架分组">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="group-tab"
        :class="{ active: activeFilter === tab.id }"
        type="button"
        role="tab"
        :aria-selected="activeFilter === tab.id"
        @click="emit('select-filter', tab.id)"
      >
        {{ tab.name }}
        <span class="group-tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <div v-if="showPanel" class="group-panel">
      <div class="group-panel-create">
        <input
          :value="newGroupName"
          class="group-input"
          type="text"
          maxlength="20"
          placeholder="新分组名称，如：在读、技术"
          @input="emit('update:newGroupName', $event.target.value)"
          @keydown.enter="emit('create-group')"
        />
        <button class="btn-import btn-import--sm" type="button" @click="emit('create-group')">
          创建
        </button>
      </div>
      <ul v-if="groups.length" class="group-panel-list">
        <li v-for="group in groups" :key="group.id" class="group-panel-item">
          <template v-if="editingGroupId === group.id">
            <input
              :value="editingGroupName"
              class="group-input"
              type="text"
              maxlength="20"
              @input="emit('update:editingGroupName', $event.target.value)"
              @keydown.enter="emit('save-edit')"
            />
            <button class="group-mini-btn" type="button" @click="emit('save-edit')">保存</button>
            <button class="group-mini-btn ghost" type="button" @click="emit('cancel-edit')">
              取消
            </button>
          </template>
          <template v-else>
            <span class="group-panel-name">{{ group.name }}</span>
            <span class="group-panel-count">{{ countInFilter(group.id) }} 本</span>
            <button class="group-mini-btn ghost" type="button" @click="emit('start-edit', group)">
              重命名
            </button>
            <button class="group-mini-btn danger" type="button" @click="emit('remove-group', group)">
              删除
            </button>
          </template>
        </li>
      </ul>
      <p v-else class="group-panel-empty">暂无自定义分组，在上方输入名称创建</p>
    </div>
  </div>
</template>

<style scoped>
.group-bar-wrap {
  flex-shrink: 0;
  margin-bottom: 1rem;
}

.group-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.group-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.group-tab:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.group-tab.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  box-shadow: 0 2px 10px var(--accent-glow);
}

.group-tab-count {
  font-size: 0.72rem;
  opacity: 0.85;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
}

.group-tab.active .group-tab-count {
  background: rgba(255, 255, 255, 0.22);
}

.group-panel {
  margin-top: 0.85rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.group-panel-create {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.group-input {
  flex: 1;
  min-width: 160px;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  font-size: 0.88rem;
  color: var(--text);
  outline: none;
}

.group-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.group-panel-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-panel-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.group-panel-item:last-child {
  border-bottom: none;
}

.group-panel-name {
  font-weight: 600;
  font-size: 0.88rem;
  min-width: 4rem;
}

.group-panel-count {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-right: auto;
}

.group-mini-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--accent-hover);
  background: var(--accent-soft);
  border: 1px solid var(--border);
}

.group-mini-btn.ghost {
  color: var(--text-muted);
  background: transparent;
}

.group-mini-btn.danger {
  color: var(--danger);
  background: rgba(220, 38, 38, 0.08);
}

.group-panel-empty {
  font-size: 0.82rem;
  color: var(--text-dim);
}

.btn-import {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.55rem 1.15rem;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%);
  box-shadow: 0 4px 16px var(--accent-glow), 0 1px 0 rgba(255, 255, 255, 0.15) inset;
}

.btn-import--sm {
  padding: 0.5rem 1rem;
  font-size: 0.82rem;
}
</style>
