<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="emit('close')">
      <div ref="modalRef" class="modal" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1">
        <div class="head">
          <div class="title">{{ title }}</div>
          <button class="close" type="button" aria-label="Close" @click="emit('close')">
            <svg class="close__icon" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4 L12 12" />
              <path d="M12 4 L4 12" />
            </svg>
          </button>
        </div>

        <div class="body">
          <slot />
        </div>

        <div class="actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const modalRef = ref<HTMLElement | null>(null)
const lastFocused = ref<HTMLElement | null>(null)

type BodyScrollLockState = {
  count: number
  previousOverflow: string
  previousPaddingRight: string
}

const BODY_SCROLL_LOCK_KEY = '__baseModalBodyScrollLock__'

const getBodyScrollLockState = (): BodyScrollLockState | null => {
  if (typeof window === 'undefined') return null

  const windowWithState = window as Window & {
    [BODY_SCROLL_LOCK_KEY]?: BodyScrollLockState
  }

  if (!windowWithState[BODY_SCROLL_LOCK_KEY]) {
    windowWithState[BODY_SCROLL_LOCK_KEY] = {
      count: 0,
      previousOverflow: '',
      previousPaddingRight: ''
    }
  }

  return windowWithState[BODY_SCROLL_LOCK_KEY] ?? null
}

const getFocusableElements = () => {
  if (!modalRef.value) return []

  return Array.from(
    modalRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  )
}

const focusFirst = () => {
  const focusable = getFocusableElements()
  const firstFocusable = focusable.at(0)
  if (firstFocusable) {
    firstFocusable.focus()
    return
  }

  modalRef.value?.focus()
}

const lockBodyScroll = () => {
  const state = getBodyScrollLockState()
  if (!state) return

  if (state.count === 0) {
    state.previousOverflow = document.body.style.overflow
    state.previousPaddingRight = document.body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
  }

  state.count += 1
}

const unlockBodyScroll = () => {
  const state = getBodyScrollLockState()
  if (!state || state.count === 0) return

  state.count -= 1
  if (state.count > 0) return

  document.body.style.overflow = state.previousOverflow
  document.body.style.paddingRight = state.previousPaddingRight
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      lastFocused.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
      lockBodyScroll()
      nextTick(() => focusFirst())
      return
    }

    unlockBodyScroll()
    nextTick(() => lastFocused.value?.focus())
  },
  { immediate: true }
)

const onKeydown = (e: KeyboardEvent) => {
  if (!props.open) return

  if (e.key === 'Escape') {
    emit('close')
    return
  }

  if (e.key !== 'Tab') return

  const focusable = getFocusableElements()
  if (focusable.length === 0) {
    e.preventDefault()
    return
  }

  const first = focusable.at(0)
  const last = focusable.at(-1)
  if (!first || !last) {
    e.preventDefault()
    return
  }
  const active = document.activeElement

  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
    return
  }

  if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (props.open) unlockBodyScroll()
})
</script>

<style scoped lang="scss">
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 24, 52, 0.6);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 200;
}

@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .overlay {
    background: rgba(15, 24, 52, 0.78);
  }
}

.modal {
  width: min(540px, 100%);
  border-radius: 18px;
  border: 1px solid #e0e6fa;
  background: #fff;
  box-shadow: 0 24px 50px rgba(20, 30, 66, 0.25);
  overflow: hidden;
}

.modal:focus-visible,
.modal:focus {
  outline: none;
  box-shadow:
    0 24px 50px rgba(20, 30, 66, 0.25),
    0 0 0 3px rgba(52, 85, 245, 0.22);
}

.head {
  padding: 14px 16px;
  border-bottom: 1px solid #e5ebfb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.title {
  font-weight: 700;
  color: #1b2648;
}

.close {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #d4ddf5;
  background: #f7f9ff;
  color: #2a3b78;
  cursor: pointer;
}

.close__icon {
  width: 14px;
  height: 14px;
}

.close__icon path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.close:hover {
  background: #edf1ff;
}

.close:focus-visible,
.close:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 85, 245, 0.22);
}

.body {
  padding: 16px;
  color: #273357;
}

.actions {
  padding: 12px 16px 16px;
  border-top: 1px solid #e5ebfb;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
