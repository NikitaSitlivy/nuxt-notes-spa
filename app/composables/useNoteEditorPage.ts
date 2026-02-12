import type { Note, Todo } from '~/utils/types'
import { createId } from '~/utils/id'
import { deepClone } from '~/utils/clone'
import { isEqual } from '~/utils/equal'
import { storageGet, storageSet } from '~/utils/storage'

const INPUT_MERGE_MS = 500
const SAVED_MESSAGE_MS = 1700
const HISTORY_LIMIT = 150
const UNSAVED_DRAFTS_KEY = 'nebus_note_unsaved_drafts_v1'

type UnsavedDraftEntry = {
  draft: Note
  baseUpdatedAt: number | null
}

type UnsavedDraftMap = Record<string, UnsavedDraftEntry>

export const useNoteEditorPage = () => {
  const store = useNotesStore()
  const router = useRouter()
  const route = useRoute()
  const id = computed(() => String(route.params.id || ''))

  const isNew = computed(() => id.value === 'new')
  const note = computed(() => (isNew.value ? null : store.getById(id.value)))
  const isReady = computed(() => isNew.value || !!note.value)
  const draftStorageId = computed(() => (isNew.value ? 'new' : id.value))

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
  const todoDeleteOpen = ref(false)
  const todoDeleteId = ref<string | null>(null)
  const undoDeleteOpen = ref(false)
  const undoDeleteCount = ref(0)
  const pendingHistoryAction = ref<'undo' | 'redo' | null>(null)
  const pendingRoute = ref<string | null>(null)
  const allowRouteLeaveOnce = ref(false)
  const preserveHistoryOnNextLoad = ref(false)

  const past = ref<Note[]>([])
  const future = ref<Note[]>([])

  const lastInputKey = ref<string | null>(null)
  const lastInputAt = ref(0)

  const saveMessage = ref('')
  const saveMessageVisible = ref(false)
  const lastSavedAt = ref('')
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const footerRef = ref<HTMLElement | null>(null)
  const mobileFooterHeight = ref(0)
  let footerResizeObserver: ResizeObserver | null = null

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  const getUnsavedDraftMap = () => storageGet<UnsavedDraftMap>(UNSAVED_DRAFTS_KEY, {})
  const setUnsavedDraftMap = (next: UnsavedDraftMap) => storageSet(UNSAVED_DRAFTS_KEY, next)

  const clearUnsavedDraft = (storageId: string) => {
    const map = getUnsavedDraftMap()
    if (!(storageId in map)) return
    delete map[storageId]
    setUnsavedDraftMap(map)
  }

  const persistUnsavedDraft = () => {
    const storageId = draftStorageId.value
    if (!storageId) return

    if (!hasUnsaved.value) {
      clearUnsavedDraft(storageId)
      return
    }

    const map = getUnsavedDraftMap()
    map[storageId] = {
      draft: deepClone(draft.value),
      baseUpdatedAt: isNew.value ? null : baseline.value?.updatedAt ?? null
    }
    setUnsavedDraftMap(map)
  }

  const pluralizeTodos = (count: number) => {
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod10 === 1 && mod100 !== 11) return 'пункт'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'пункта'
    return 'пунктов'
  }

  const hasUnsaved = computed(() => {
    if (!baseline.value) return false
    return !isEqual(draft.value, baseline.value)
  })

  watch(hasUnsaved, (value) => {
    if (value) saveMessageVisible.value = false
  })

  const showSavedMessage = () => {
    lastSavedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    saveMessage.value = `Изменения сохранены • ${lastSavedAt.value}`
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

  const getRemovedTodos = (from: Note, to: Note) => {
    const toIds = new Set(to.todos.map((t) => t.id))
    return from.todos.filter((t) => !toIds.has(t.id))
  }

  const applyUndo = () => {
    const prev = past.value.pop()
    if (!prev) return
    future.value.push(deepClone(draft.value))
    draft.value = prev
    resetInputGrouping()
  }

  const undo = () => {
    const prev = past.value[past.value.length - 1]
    if (!prev) return

    const removedTodos = getRemovedTodos(draft.value, prev)
    const shouldAskConfirm = removedTodos.some((todo) => shouldConfirmTodoDelete(todo))
    if (shouldAskConfirm) {
      pendingHistoryAction.value = 'undo'
      undoDeleteCount.value = removedTodos.length
      undoDeleteOpen.value = true
      return
    }

    applyUndo()
  }

  const applyRedo = () => {
    const next = future.value.pop()
    if (!next) return
    past.value.push(deepClone(draft.value))
    draft.value = next
    resetInputGrouping()
  }

  const redo = () => {
    const next = future.value[future.value.length - 1]
    if (!next) return

    const removedTodos = getRemovedTodos(draft.value, next)
    const shouldAskConfirm = removedTodos.some((todo) => shouldConfirmTodoDelete(todo))
    if (shouldAskConfirm) {
      pendingHistoryAction.value = 'redo'
      undoDeleteCount.value = removedTodos.length
      undoDeleteOpen.value = true
      return
    }

    applyRedo()
  }

  const onUndoDeleteClose = () => {
    undoDeleteOpen.value = false
    undoDeleteCount.value = 0
    pendingHistoryAction.value = null
  }

  const confirmUndoDelete = () => {
    const action = pendingHistoryAction.value
    onUndoDeleteClose()
    if (action === 'redo') {
      applyRedo()
      return
    }
    applyUndo()
  }

  const loadDraft = () => {
    if (
      preserveHistoryOnNextLoad.value &&
      !isNew.value &&
      !!note.value &&
      !!baseline.value &&
      isEqual(draft.value, note.value)
    ) {
      preserveHistoryOnNextLoad.value = false
      return
    }

    if (preserveHistoryOnNextLoad.value) {
      preserveHistoryOnNextLoad.value = false
    } else {
      past.value = []
      future.value = []
      resetInputGrouping()
    }

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

      const unsaved = getUnsavedDraftMap()[draftStorageId.value]
      if (unsaved) {
        draft.value = deepClone(unsaved.draft)
      }
      return
    }

    if (!note.value) return
    draft.value = deepClone(note.value)
    baseline.value = deepClone(note.value)

    const unsaved = getUnsavedDraftMap()[draftStorageId.value]
    if (!unsaved) return

    if (unsaved.baseUpdatedAt === note.value.updatedAt) {
      draft.value = deepClone(unsaved.draft)
      return
    }

    clearUnsavedDraft(draftStorageId.value)
  }

  watch([id, note], loadDraft, { immediate: true })

  const setTitle = (title: string) => {
    if (title === draft.value.title) return
    recordInputHistory('title')
    draft.value.title = title
  }

  const getStickyFooterHeight = () => {
    const footer = document.querySelector<HTMLElement>('.footer--sticky')
    return footer?.offsetHeight ?? 0
  }

  const scrollTodoIntoView = (todoId: string) => {
    const todoEl = document.querySelector<HTMLElement>(`.todo[data-todo-id="${todoId}"]`)
    if (!todoEl) return

    const footerHeight = getStickyFooterHeight()
    const bottomSafeLine = window.innerHeight - footerHeight - 12
    const topSafeLine = 12
    const rect = todoEl.getBoundingClientRect()

    if (rect.bottom > bottomSafeLine) {
      window.scrollBy({ top: rect.bottom - bottomSafeLine, behavior: 'smooth' })
    } else if (rect.top < topSafeLine) {
      window.scrollBy({ top: rect.top - topSafeLine, behavior: 'smooth' })
    }
  }

  const addTodo = () => {
    const hadVerticalScrollbar = document.documentElement.scrollHeight > window.innerHeight + 1
    const newTodoId = createId()

    resetInputGrouping()
    recordHistory()
    draft.value.todos.push({ id: newTodoId, text: '', done: false })

    if (!hadVerticalScrollbar) return
    nextTick(() => scrollTodoIntoView(newTodoId))
  }

  const todoExistsInBaseline = (todoId: string) => {
    if (!baseline.value) return false
    return baseline.value.todos.some((t) => t.id === todoId)
  }

  const shouldConfirmTodoDelete = (todo: Todo) => {
    if (todoExistsInBaseline(todo.id)) return true
    if (todo.text.trim().length > 0) return true
    if (todo.done) return true
    return false
  }

  const removeTodoById = (todoId: string) => {
    const idx = draft.value.todos.findIndex((t) => t.id === todoId)
    if (idx === -1) return false
    resetInputGrouping()
    recordHistory()
    draft.value.todos.splice(idx, 1)
    return true
  }

  const askRemoveTodo = (todoId: string) => {
    const todo = draft.value.todos.find((t) => t.id === todoId)
    if (!todo) return

    if (!shouldConfirmTodoDelete(todo)) {
      removeTodoById(todoId)
      return
    }

    todoDeleteId.value = todoId
    todoDeleteOpen.value = true
  }

  const onTodoDeleteClose = () => {
    todoDeleteOpen.value = false
    todoDeleteId.value = null
  }

  const confirmRemoveTodo = () => {
    if (!todoDeleteId.value) return
    const todoId = todoDeleteId.value
    const removed = removeTodoById(todoId)
    if (!removed) {
      onTodoDeleteClose()
      return
    }
    onTodoDeleteClose()
  }

  const setTodoText = (todoId: string, text: string) => {
    const todo = draft.value.todos.find((x) => x.id === todoId)
    if (!todo || todo.text === text) return
    recordInputHistory(`todo-text:${todoId}`)
    todo.text = text
  }

  const autoGrowTodoTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const onTodoTextareaFocus = (e: FocusEvent) => {
    autoGrowTodoTextarea(e.target as HTMLTextAreaElement)
  }

  const onTodoInput = (todoId: string, e: Event) => {
    const el = e.target as HTMLTextAreaElement
    autoGrowTodoTextarea(el)
    setTodoText(todoId, el.value)
  }

  const setTodoDone = (todoId: string, done: boolean) => {
    const todo = draft.value.todos.find((x) => x.id === todoId)
    if (!todo || todo.done === done) return
    resetInputGrouping()
    recordHistory()
    todo.done = done
  }

  const persistSave = async () => {
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

      showSavedMessage()
      preserveHistoryOnNextLoad.value = true
      clearUnsavedDraft('new')
      await router.replace(`/notes/${newId}`)
      return
    }

    const saved = {
      ...deepClone(draft.value),
      updatedAt: Date.now()
    }

    preserveHistoryOnNextLoad.value = true
    store.updateNote(saved)
    draft.value = deepClone(saved)
    baseline.value = deepClone(saved)
    clearUnsavedDraft(draftStorageId.value)
    showSavedMessage()
  }

  const save = async () => {
    if (!isReady.value) return
    await persistSave()
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
    clearUnsavedDraft(draftStorageId.value)
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
    clearUnsavedDraft(draftStorageId.value)
    if (!isNew.value) store.deleteNote(id.value)
    deleteOpen.value = false
    allowRouteLeaveOnce.value = true
    navigateTo('/')
  }

  const updateMobileFooterHeight = () => {
    if (typeof window === 'undefined') return
    if (window.innerWidth > 680 || !footerRef.value) {
      mobileFooterHeight.value = 0
      return
    }

    mobileFooterHeight.value = footerRef.value.offsetHeight + 8
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

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', updateMobileFooterHeight)

    nextTick(() => {
      updateMobileFooterHeight()
      if (typeof ResizeObserver === 'undefined' || !footerRef.value) return
      footerResizeObserver = new ResizeObserver(() => updateMobileFooterHeight())
      footerResizeObserver.observe(footerRef.value)
    })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', updateMobileFooterHeight)
    if (saveTimer) clearTimeout(saveTimer)
    footerResizeObserver?.disconnect()
    footerResizeObserver = null
  })

  watch([isNew, hasUnsaved, saveMessageVisible], async () => {
    await nextTick()
    updateMobileFooterHeight()
  })

  watch(draft, persistUnsavedDraft, { deep: true })

  watch(
    () => draft.value.todos.map((t) => `${t.id}:${t.text}`).join('|'),
    async () => {
      await nextTick()
      const nodes = document.querySelectorAll<HTMLTextAreaElement>('.todoTextArea')
      nodes.forEach(autoGrowTodoTextarea)
    },
    { immediate: true }
  )

  return {
    isNew,
    isReady,
    draft,
    canUndo,
    canRedo,
    saveMessage,
    saveMessageVisible,
    hasUnsaved,
    cancelOpen,
    deleteOpen,
    todoDeleteOpen,
    undoDeleteOpen,
    undoDeleteCount,
    footerRef,
    mobileFooterHeight,
    pluralizeTodos,
    undo,
    redo,
    setTitle,
    addTodo,
    setTodoDone,
    onTodoTextareaFocus,
    onTodoInput,
    askRemoveTodo,
    askCancel,
    save,
    onCancelModalClose,
    confirmCancel,
    askDelete,
    confirmDelete,
    onTodoDeleteClose,
    confirmRemoveTodo,
    onUndoDeleteClose,
    confirmUndoDelete,
    onBack
  }
}
