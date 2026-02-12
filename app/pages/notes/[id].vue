<template>
  <div class="page">
    <header class="top">
      <button class="back" type="button" @click="onBack">← К списку заметок</button>

      <div class="actions" v-if="isReady">
        <BaseButton variant="secondary" :disabled="!canUndo" @click="undo">Отменить (Ctrl+Z)</BaseButton>
        <BaseButton variant="secondary" :disabled="!canRedo" @click="redo">Повторить (Ctrl+Shift+Z)</BaseButton>
        <BaseButton v-if="!isNew" danger @click="askDelete">Удалить</BaseButton>
      </div>
    </header>

    <section v-if="!isReady" class="empty">
      <h1 class="empty__title">Заметка не найдена</h1>
      <p class="empty__text">Запрошенная заметка была удалена или отсутствует.</p>
      <BaseButton @click="navigateTo('/')">Назад</BaseButton>
    </section>

    <section v-else class="editor">
      <div class="block">
        <div class="label">Название</div>
        <BaseInput :model-value="draft.title" @update:modelValue="setTitle" placeholder="Введите название" />
      </div>

      <div class="block">
        <div class="line">
          <div class="label">Список задач</div>
          <BaseButton variant="secondary" @click="addTodo">Добавить пункт</BaseButton>
        </div>

        <div class="todoHint">Чекбокс «Готово» отмечает выполнение пункта.</div>

        <div class="todos">
          <div v-for="t in draft.todos" :key="t.id" class="todo">
            <BaseCheckbox class="todoToggle" :model-value="t.done" @update:modelValue="(v) => setTodoDone(t.id, v)">
              Готово
            </BaseCheckbox>

            <BaseInput
              class="todoTextInput"
              :model-value="t.text"
              :class="{ todoInputDone: t.done }"
              @update:modelValue="(v) => setTodoText(t.id, v)"
              placeholder="Текст задачи"
            />

            <button class="iconBtn" type="button" aria-label="Удалить пункт" @click="removeTodo(t.id)">
              ×
            </button>
          </div>
        </div>

        <p v-if="draft.todos.length === 0" class="muted">Пока нет задач.</p>
      </div>

      <footer class="footer" :class="{ 'footer--sticky': isReady }">
        <div class="saveState" :class="{ 'saveState--visible': saveMessageVisible }" aria-live="polite">{{ saveMessage }}</div>

        <div class="footer__actions">
          <BaseButton v-if="!isNew && hasUnsaved" variant="secondary" @click="askCancel">Отменить редактирование</BaseButton>
          <BaseButton :disabled="!hasUnsaved" @click="save">Сохранить изменения</BaseButton>
        </div>
      </footer>
    </section>

    <BaseModal :open="cancelOpen" title="Отменить редактирование?" @close="onCancelModalClose">
      <div>Все несохраненные изменения будут потеряны.</div>
      <template #actions>
        <BaseButton variant="secondary" @click="onCancelModalClose">Продолжить редактирование</BaseButton>
        <BaseButton danger @click="confirmCancel">Отменить</BaseButton>
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
import type { Note } from '~/utils/types'
import { createId } from '~/utils/id'
import { deepClone } from '~/utils/clone'
import { isEqual } from '~/utils/equal'

const INPUT_MERGE_MS = 500
const SAVED_MESSAGE_MS = 1700

const store = useNotesStore()
const route = useRoute()
const id = computed(() => String(route.params.id || ''))

const isNew = computed(() => id.value === 'new')
const note = computed(() => (isNew.value ? null : store.getById(id.value)))
const isReady = computed(() => isNew.value || !!note.value)

const draft = ref<Note>({
  id: '',
  title: '',
  todos: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
})

const baseline = ref<Note | null>(null)
const cancelOpen = ref(false)
const deleteOpen = ref(false)
const pendingRoute = ref<string | null>(null)
const allowRouteLeaveOnce = ref(false)

const past = ref<Note[]>([])
const future = ref<Note[]>([])
const HISTORY_LIMIT = 150

const lastInputKey = ref<string | null>(null)
const lastInputAt = ref(0)

const saveMessage = ref('')
const saveMessageVisible = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const canUndo = computed(() => past.value.length > 0)
const canRedo = computed(() => future.value.length > 0)

const hasUnsaved = computed(() => {
  if (!baseline.value) return false
  return !isEqual(draft.value, baseline.value)
})

watch(hasUnsaved, (value) => {
  if (value) {
    saveMessageVisible.value = false
  }
})

const showSavedMessage = () => {
  saveMessage.value = 'Сохранено'
  saveMessageVisible.value = true

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveMessageVisible.value = false
    saveTimer = null
  }, SAVED_MESSAGE_MS)
}

const resetInputGrouping = () => {
  lastInputKey.value = null
  lastInputAt.value = 0
}

const recordHistory = () => {
  const last = past.value[past.value.length - 1]
  if (last && isEqual(last, draft.value)) return
  past.value.push(deepClone(draft.value))
  if (past.value.length > HISTORY_LIMIT) past.value.shift()
  future.value = []
}

const recordInputHistory = (key: string) => {
  const now = Date.now()
  const shouldCreateStep =
    lastInputKey.value !== key || now - lastInputAt.value > INPUT_MERGE_MS || past.value.length === 0

  if (shouldCreateStep) recordHistory()

  lastInputKey.value = key
  lastInputAt.value = now
}

const undo = () => {
  const prev = past.value.pop()
  if (!prev) return
  future.value.push(deepClone(draft.value))
  draft.value = prev
  resetInputGrouping()
}

const redo = () => {
  const next = future.value.pop()
  if (!next) return
  past.value.push(deepClone(draft.value))
  draft.value = next
  resetInputGrouping()
}

const loadDraft = () => {
  past.value = []
  future.value = []
  resetInputGrouping()
  saveMessageVisible.value = false

  if (isNew.value) {
    const now = Date.now()
    const empty: Note = {
      id: '',
      title: '',
      todos: [],
      createdAt: now,
      updatedAt: now
    }
    draft.value = deepClone(empty)
    baseline.value = deepClone(empty)
    return
  }

  if (!note.value) return
  draft.value = deepClone(note.value)
  baseline.value = deepClone(note.value)
}

watch([id, note], loadDraft, { immediate: true })

const setTitle = (title: string) => {
  if (title === draft.value.title) return
  recordInputHistory('title')
  draft.value.title = title
}

const addTodo = () => {
  resetInputGrouping()
  recordHistory()
  draft.value.todos.push({ id: createId(), text: '', done: false })
}

const removeTodo = (todoId: string) => {
  const idx = draft.value.todos.findIndex((t) => t.id === todoId)
  if (idx === -1) return
  resetInputGrouping()
  recordHistory()
  draft.value.todos.splice(idx, 1)
}

const setTodoText = (todoId: string, text: string) => {
  const todo = draft.value.todos.find((x) => x.id === todoId)
  if (!todo || todo.text === text) return
  recordInputHistory(`todo-text:${todoId}`)
  todo.text = text
}

const setTodoDone = (todoId: string, done: boolean) => {
  const todo = draft.value.todos.find((x) => x.id === todoId)
  if (!todo || todo.done === done) return
  resetInputGrouping()
  recordHistory()
  todo.done = done
}

const save = () => {
  if (!isReady.value) return

  if (isNew.value) {
    const newId = store.createNote({
      title: draft.value.title,
      todos: draft.value.todos,
      createdAt: draft.value.createdAt
    })

    const created = store.getById(newId)
    if (created) {
      draft.value = deepClone(created)
      baseline.value = deepClone(created)
    }

    past.value = []
    future.value = []
    resetInputGrouping()
    showSavedMessage()
    navigateTo(`/notes/${newId}`)
    return
  }

  const saved = {
    ...deepClone(draft.value),
    updatedAt: Date.now()
  }

  store.updateNote(saved)
  draft.value = deepClone(saved)
  baseline.value = deepClone(saved)
  past.value = []
  future.value = []
  resetInputGrouping()
  showSavedMessage()
}

const onCancelModalClose = () => {
  cancelOpen.value = false
  pendingRoute.value = null
}

const askCancel = () => {
  pendingRoute.value = '/'
  cancelOpen.value = true
}

const onBack = () => {
  if (!hasUnsaved.value) {
    allowRouteLeaveOnce.value = true
    navigateTo('/')
    return
  }

  askCancel()
}

const confirmCancel = () => {
  const target = pendingRoute.value || '/'
  cancelOpen.value = false
  pendingRoute.value = null
  allowRouteLeaveOnce.value = true
  navigateTo(target)
}

const askDelete = () => {
  if (isNew.value) {
    allowRouteLeaveOnce.value = true
    navigateTo('/')
    return
  }
  deleteOpen.value = true
}

const confirmDelete = () => {
  if (!isNew.value) store.deleteNote(id.value)
  deleteOpen.value = false
  allowRouteLeaveOnce.value = true
  navigateTo('/')
}

onBeforeRouteLeave((to, _from, next) => {
  if (allowRouteLeaveOnce.value) {
    allowRouteLeaveOnce.value = false
    next()
    return
  }

  if (!hasUnsaved.value) {
    next()
    return
  }

  pendingRoute.value = to.fullPath
  cancelOpen.value = true
  next(false)
})

const onKeydown = (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey)) return
  const key = e.key.toLowerCase()

  if ((key === 'z' && e.shiftKey) || key === 'y') {
    e.preventDefault()
    redo()
    return
  }

  if (key === 'z') {
    e.preventDefault()
    undo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<style scoped lang="scss">
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.back {
  color: #2f448b;
  text-decoration: underline;
  text-underline-offset: 2px;
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.back:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 85, 245, 0.22);
  border-radius: 6px;
}

.actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.empty {
  margin-top: 18px;
  border: 1px dashed #ccd5ef;
  border-radius: 16px;
  background: #fff;
  padding: 22px;
  max-width: 560px;
  display: grid;
  gap: 10px;
}

.empty__title {
  margin: 0;
}

.empty__text {
  margin: 0;
  color: #5d688b;
}

.editor {
  margin-top: 16px;
  background: #fff;
  border: 1px solid #d7dff3;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 16px 36px rgba(19, 32, 68, 0.08);
}

.block + .block {
  margin-top: 18px;
}

.label {
  margin-bottom: 8px;
  font-weight: 700;
  color: #1a274a;
}

.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.todoHint {
  color: #56618a;
  font-size: 13px;
}

.todos {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.todo {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e3e9fb;
  border-radius: 14px;
  background: #fbfcff;
}

.todoToggle {
  min-width: 0;
}

.todoToggle :deep(.checkbox__label) {
  white-space: nowrap;
}

.todoInputDone :deep(.input) {
  text-decoration: line-through;
  color: #6b7494;
}

.iconBtn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #d3dcf5;
  background: #fff;
  color: #32437c;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.iconBtn:hover {
  background: #f2f6ff;
}

.iconBtn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 85, 245, 0.22);
}

.muted {
  margin: 10px 0 0;
  color: #5f6a8d;
}

.footer {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.footer__actions {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.saveState {
  color: #256e44;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.saveState--visible {
  opacity: 1;
}

@media (max-width: 680px) {
  .editor {
    padding: 14px;
    border-radius: 16px;
  }

  .top {
    align-items: stretch;
  }

  .actions {
    width: 100%;
  }

  .actions :deep(.btn) {
    flex: 1 1 calc(50% - 8px);
  }

  .line :deep(.btn) {
    width: 100%;
  }

  .todo {
    grid-template-columns: 1fr;
  }

  .iconBtn {
    justify-self: end;
  }

  .footer--sticky {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 12px 16px 12px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.95);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    border-top: 1px solid #dde4f7;
    box-shadow: 0 -8px 24px rgba(20, 31, 64, 0.08);
    z-index: 80;
  }

  .saveState {
    order: 2;
    width: 100%;
    text-align: right;
  }

  .footer__actions {
    width: 100%;
  }

  .footer__actions :deep(.btn) {
    flex: 1 1 auto;
  }
}

@media (max-width: 900px) and (min-width: 681px) {
  .todo {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "check delete"
      "input input";
  }

  .todoToggle {
    grid-area: check;
  }

  .todoTextInput {
    grid-area: input;
  }

  .iconBtn {
    grid-area: delete;
  }
}
</style>


