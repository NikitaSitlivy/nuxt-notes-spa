<template>
  <div class="page">
    <div class="hero">
      <header class="top">
        <div class="top__copy">
          <h1 class="title">Заметки</h1>
          <p class="subtitle">Список заметок с превью задач.</p>
        </div>
        <BaseButton class="createBtn" @click="onCreate">Новая заметка</BaseButton>
      </header>
    </div>

    <section v-if="notes.length === 0" class="empty">
      <h2 class="empty__title">Пока нет заметок</h2>
      <p class="empty__text">Создай первую заметку, чтобы начать работу.</p>
    </section>

    <section v-else class="grid">
      <article
        v-for="(n, idx) in notes"
        :key="n.id"
        class="card"
        :style="{ '--card-delay': `${Math.min(idx, 11) * 24}ms` }"
      >
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
          <li v-for="t in previewTodos(n)" :key="t.id" class="preview__item">
            <span class="marker" :class="{ 'marker--done': t.done }">{{ t.done ? 'Готово' : 'В работе' }}</span>
            <span class="text" :class="{ 'text--done': t.done }">{{ t.text || 'Пустой пункт' }}</span>
          </li>
          <li v-if="n.todos.length > 4" key="toggle" class="preview__more">
            <button class="preview__moreBtn" type="button" @click="openTodosModal(n.id)">
              {{ `+ ещё ${remainingTodos(n)} ${pluralizeTodos(remainingTodos(n))}` }}
            </button>
          </li>
          <li v-if="n.todos.length === 0" class="preview__item preview__item--muted">Нет задач</li>
        </ul>
      </article>
    </section>

    <BaseModal :open="todosOpen" :title="todosModalTitle" @close="closeTodosModal">
      <div v-if="selectedNote" class="todosModal">
        <p class="todosModal__meta">
          Выполнено: {{ doneCount(selectedNote.todos) }} из {{ selectedNote.todos.length }}
        </p>
        <ul v-if="selectedNote.todos.length > 0" class="todosModal__list">
          <li v-for="t in sortedTodos(selectedNote.todos)" :key="t.id" class="todosModal__item">
            <span class="marker" :class="{ 'marker--done': t.done }">{{ t.done ? 'Готово' : 'В работе' }}</span>
            <span class="todosModal__text" :class="{ 'todosModal__text--done': t.done }">
              {{ t.text || 'Пустой пункт' }}
            </span>
          </li>
        </ul>
        <p v-else class="todosModal__empty">В этой заметке пока нет задач.</p>
      </div>
      <template #actions>
        <NuxtLink
          v-if="selectedNote"
          class="action"
          :to="`/notes/${selectedNote.id}`"
          @click="closeTodosModal"
        >
          Изменить
        </NuxtLink>
        <button v-if="selectedNote" class="action action--danger" type="button" @click="askDelete(selectedNote.id)">
          Удалить
        </button>
      </template>
    </BaseModal>

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
import type { Note, Todo } from '~/utils/types'

const store = useNotesStore()
const notes = computed(() => store.notes)

const deleteOpen = ref(false)
const deleteId = ref<string | null>(null)
const todosOpen = ref(false)
const todosNoteId = ref<string | null>(null)

const selectedNote = computed(() => notes.value.find((n) => n.id === todosNoteId.value) ?? null)
const todosModalTitle = computed(() => {
  if (!selectedNote.value) return 'Все задачи'
  return `Все задачи: ${selectedNote.value.title || 'Без названия'}`
})

const sortedTodos = (todos: Todo[]) => [...todos].sort((a, b) => Number(a.done) - Number(b.done))
const previewTodos = (note: Note) => sortedTodos(note.todos).slice(0, 4)
const doneCount = (todos: Todo[]) => todos.filter((t) => t.done).length
const remainingTodos = (note: Note) => Math.max(0, note.todos.length - 4)
const pluralizeTodos = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'пункт'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'пункта'
  return 'пунктов'
}
const donePercent = (todos: Todo[]) => {
  if (todos.length === 0) return 0
  return Math.round((doneCount(todos) / todos.length) * 100)
}

const openTodosModal = (noteId: string) => {
  todosNoteId.value = noteId
  todosOpen.value = true
}

const closeTodosModal = () => {
  todosOpen.value = false
  todosNoteId.value = null
}

const onCreate = () => navigateTo('/notes/new')

const askDelete = (id: string) => {
  closeTodosModal()
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
  padding: 30px 20px 38px;
}

.hero {
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid #d9e4fb;
  background:
    radial-gradient(520px 120px at -20% 10%, rgba(71, 103, 241, 0.24), transparent),
    radial-gradient(420px 100px at 120% 30%, rgba(89, 196, 255, 0.2), transparent),
    linear-gradient(180deg, rgba(245, 249, 255, 0.9), rgba(236, 242, 255, 0.86));
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: nowrap;
  margin-bottom: 8px;
}

.top__copy {
  min-width: 0;
  animation: rise-in 0.45s ease both;
}

.createBtn {
  flex: 0 0 auto;
  min-width: 156px;
  animation: rise-in 0.45s ease both;
  animation-delay: 0.08s;
}

.title {
  margin: 0;
  font-size: clamp(28px, 4.2vw, 40px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.subtitle {
  margin: 8px 0 0;
  color: #4d5f92;
  font-size: clamp(15px, 2vw, 20px);
}

.empty {
  margin: 30px auto 0;
  width: min(680px, 100%);
  background:
    radial-gradient(420px 120px at 50% -20%, rgba(83, 124, 255, 0.12), transparent),
    linear-gradient(180deg, #ffffff, #f9fbff);
  border: 1px solid #d7e1fb;
  border-radius: 24px;
  padding: 30px 28px;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 16px;
  box-shadow: 0 20px 44px rgba(19, 39, 90, 0.1);
  animation: rise-in 0.55s ease both;
}

.empty__title {
  margin: 0;
  font-size: clamp(30px, 4.4vw, 36px);
  line-height: 1.02;
  letter-spacing: -0.02em;
}

.empty__text {
  margin: 0;
  color: #566089;
  font-size: clamp(16px, 2vw, 22px);
  max-width: 28ch;
}

.empty :deep(.btn) {
  min-width: 240px;
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
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  border: 1px solid #d4dff8;
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 10px 30px rgba(24, 37, 71, 0.07);
  transform: translateY(0);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
  animation: rise-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--card-delay, 0ms);
}

.card:hover {
  transform: translateY(-3px);
  border-color: #b7c9f9;
  box-shadow: 0 16px 34px rgba(30, 50, 105, 0.14);
}

.card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.card__title {
  margin: 0;
  font-size: 17px;
  line-height: 1.25;
  word-break: break-word;
}

.card__meta {
  margin: 8px 0 0;
  font-size: 13px;
  color: #556187;
}

.progress {
  margin-top: 10px;
  width: 100%;
  height: 7px;
  background: #e5ebff;
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
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: nowrap;
}

.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ccd8f5;
  border-radius: 11px;
  background: #f5f8ff;
  color: #213772;
  text-decoration: none;
  cursor: pointer;
  padding: 7px 12px;
  min-height: 34px;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    transform 0.14s ease;
}

.action:hover {
  background: #eaf1ff;
  border-color: #b8c8f5;
  transform: translateY(-1px);
}

.action:focus-visible,
.action:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 85, 245, 0.22);
}

.action--danger {
  color: #a33333;
  border-color: #efcccc;
  background: #fff6f6;
}

.action--danger:hover {
  background: #fff0f0;
  border-color: #e8b7b7;
  color: #952525;
}

.preview {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
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

.preview__more {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #2f448b;
}

.preview__moreBtn {
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 0;
  border-radius: 8px;
  transition: color 0.16s ease;
}

.preview__moreBtn:hover {
  color: #243a84;
}

.preview__moreBtn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 85, 245, 0.18);
}

.todosModal {
  display: grid;
  gap: 12px;
}

.todosModal__meta {
  margin: 0;
  color: #556187;
  font-size: 14px;
}

.todosModal__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  max-height: min(52vh, 420px);
  overflow: auto;
  padding-right: 4px;
}

.todosModal__item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
  border: 1px solid #e4eafc;
  border-radius: 12px;
  background: #f9fbff;
  padding: 8px;
}

.todosModal__text {
  line-height: 1.4;
  font-size: 14px;
  word-break: break-word;
}

.todosModal__text--done {
  color: #6a759a;
}

.todosModal__empty {
  margin: 0;
  color: #687498;
}

.marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  border-radius: 999px;
  border: 1px solid #d7dff8;
  background: #f5f8ff;
  color: #3e4f86;
  padding: 3px 8px;
  font-size: 13px;
  flex: 0 0 auto;
  text-align: center;
  white-space: nowrap;
}

.marker--done {
  background: #e8fff2;
  border-color: #b8e8cb;
  color: #256e44;
}

.text {
  overflow: hidden;
  white-space: normal;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  font-size: 14px;
}

.text--done {
  color: #6a759a;
}

@media (max-width: 700px) {
  .page {
    padding: 20px 14px 28px;
  }

  .hero {
    padding: 14px;
    border-radius: 18px;
  }

  .empty {
    margin-top: 24px;
    padding: 24px 16px;
    border-radius: 18px;
  }

  .empty :deep(.btn) {
    width: 100%;
    min-width: 0;
  }

  .top {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .createBtn {
    width: 100%;
    min-width: 0;
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
    align-items: stretch;
  }
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
