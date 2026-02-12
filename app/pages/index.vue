<template>
  <div class="page">
    <header class="top">
      <div>
        <h1 class="title">Заметки</h1>
        <p class="subtitle">Список заметок с превью задач.</p>
      </div>
      <BaseButton class="createBtn" @click="onCreate">Новая заметка</BaseButton>
    </header>

    <section v-if="notes.length === 0" class="empty">
      <h2 class="empty__title">Пока нет заметок</h2>
      <p class="empty__text">Создай первую заметку, чтобы начать работу.</p>
      <BaseButton variant="secondary" @click="onCreate">Создать заметку</BaseButton>
    </section>

    <section v-else class="grid">
      <article v-for="n in notes" :key="n.id" class="card">
        <div class="card__head">
          <div>
            <h2 class="card__title">{{ n.title || 'Без названия' }}</h2>
            <p class="card__meta">Выполнено: {{ doneCount(n.todos) }} из {{ n.todos.length }}</p>
            <div class="progress" :aria-label="`Выполнено ${doneCount(n.todos)} из ${n.todos.length}`">
              <span class="progress__fill" :style="{ width: `${donePercent(n.todos)}%` }" />
            </div>
          </div>

          <div class="card__actions">
            <NuxtLink class="action" :to="`/notes/${n.id}`">Изменить</NuxtLink>
            <button class="action action--danger" type="button" @click="askDelete(n.id)">Удалить</button>
          </div>
        </div>

        <ul class="preview">
          <li v-for="t in previewTodos(n.todos)" :key="t.id" class="preview__item">
            <span class="marker" :class="{ 'marker--done': t.done }">{{ t.done ? 'Готово' : 'Todo' }}</span>
            <span class="text" :class="{ 'text--done': t.done }">{{ t.text || 'Пустой пункт' }}</span>
          </li>
          <li v-if="n.todos.length === 0" class="preview__item preview__item--muted">Нет задач</li>
        </ul>
      </article>
    </section>

    <BaseModal :open="deleteOpen" title="Удалить заметку?" @close="deleteOpen = false">
      <div>Действие необратимо. Заметка будет удалена.</div>
      <template #actions>
        <BaseButton variant="secondary" @click="deleteOpen = false">Отмена</BaseButton>
        <BaseButton danger @click="confirmDelete">Удалить</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '~/utils/types'

const store = useNotesStore()
const notes = computed(() => store.notes)

const deleteOpen = ref(false)
const deleteId = ref<string | null>(null)

const previewTodos = (todos: Todo[]) => todos.slice(0, 4)
const doneCount = (todos: Todo[]) => todos.filter((t) => t.done).length
const donePercent = (todos: Todo[]) => {
  if (todos.length === 0) return 0
  return Math.round((doneCount(todos) / todos.length) * 100)
}

const onCreate = () => navigateTo('/notes/new')

const askDelete = (id: string) => {
  deleteId.value = id
  deleteOpen.value = true
}

const confirmDelete = () => {
  if (!deleteId.value) return
  store.deleteNote(deleteId.value)
  deleteOpen.value = false
  deleteId.value = null
}
</script>

<style scoped lang="scss">
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 16px 40px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font-size: clamp(26px, 5vw, 36px);
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 8px 0 0;
  color: #5c6788;
}

.empty {
  margin-top: 18px;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 18px;
  padding: 24px;
  display: grid;
  gap: 12px;
  max-width: 480px;
}

.empty__title {
  margin: 0;
  font-size: 22px;
}

.empty__text {
  margin: 0;
  color: #5f6a8b;
}

.grid {
  margin-top: 18px;
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 980px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 8px 24px rgba(24, 37, 71, 0.06);
}

.card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.card__title {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  word-break: break-word;
}

.card__meta {
  margin: 6px 0 0;
  font-size: 13px;
  color: #58648a;
}

.progress {
  margin-top: 8px;
  width: 100%;
  height: 6px;
  background: #e6ebfb;
  border-radius: 999px;
  overflow: hidden;
}

.progress__fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2f48de, #6d86ff);
  transition: width 0.2s ease;
}

.card__actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action {
  border: 1px solid #d2dbf4;
  border-radius: 10px;
  background: #f7f9ff;
  color: #213772;
  text-decoration: none;
  cursor: pointer;
  padding: 4px 8px;
  min-height: 30px;
  font: inherit;
  font-size: 13px;
  line-height: 1.2;
}

.action:hover {
  background: #eef3ff;
}

.action:focus-visible,
.action:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 85, 245, 0.22);
}

.action--danger {
  color: #a92a2a;
  border-color: #f0c9c9;
  background: #fff7f7;
}

.preview {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.preview__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.preview__item--muted {
  color: #687498;
}

.marker {
  border-radius: 999px;
  border: 1px solid #d8e0f7;
  background: #f5f8ff;
  color: #3e4f86;
  padding: 2px 7px;
  font-size: 12px;
  flex: 0 0 auto;
}

.marker--done {
  background: #e8fff2;
  border-color: #b8e8cb;
  color: #256e44;
}

.text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text--done {
  text-decoration: line-through;
  color: #6a759a;
}

@media (max-width: 700px) {
  .top {
    align-items: stretch;
  }

  .createBtn {
    width: 100%;
  }
}

@media (max-width: 540px) {
  .card {
    padding: 12px;
  }

  .card__head {
    flex-direction: column;
    gap: 12px;
  }

  .card__actions {
    width: 100%;
  }
}
</style>
