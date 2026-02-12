import { defineStore } from 'pinia'
import type { Note } from '~/utils/types'
import { createId } from '~/utils/id'
import { deepClone } from '~/utils/clone'
import { storageGet, storageSet } from '~/utils/storage'

type NotesState = {
  notes: Note[]
  past: Note[][]
  future: Note[][]
}

const STORAGE_KEY = 'nebus_notes_v1'
const HISTORY_LIMIT = 100

export const useNotesStore = defineStore('notes', {
  state: (): NotesState => ({
    notes: [],
    past: [],
    future: []
  }),
  getters: {
    getById: (state) => {
      return (id: string) => state.notes.find((n) => n.id === id) || null
    }
  },
  actions: {
    hydrate() {
      const saved = storageGet<Pick<NotesState, 'notes'>>(STORAGE_KEY, { notes: [] })
      this.notes = saved.notes || []
      this.past = []
      this.future = []
    },
    persist() {
      storageSet(STORAGE_KEY, { notes: this.notes })
    },
    commit() {
      this.past.push(deepClone(this.notes))
      if (this.past.length > HISTORY_LIMIT) this.past.shift()
      this.future = []
      this.persist()
    },
    undo() {
      const prev = this.past.pop()
      if (!prev) return
      this.future.push(deepClone(this.notes))
      this.notes = prev
      this.persist()
    },
    redo() {
      const next = this.future.pop()
      if (!next) return
      this.past.push(deepClone(this.notes))
      this.notes = next
      this.persist()
    },
    createNote() {
      const now = Date.now()
      const note: Note = {
        id: createId(),
        title: '',
        todos: [],
        createdAt: now,
        updatedAt: now
      }
      this.commit()
      this.notes.unshift(note)
      this.persist()
      return note.id
    },
    updateNote(note: Note) {
      const idx = this.notes.findIndex((n) => n.id === note.id)
      if (idx === -1) return
      this.commit()
      this.notes[idx] = { ...deepClone(note), updatedAt: Date.now() }
      this.persist()
    },
    deleteNote(id: string) {
      const idx = this.notes.findIndex((n) => n.id === id)
      if (idx === -1) return
      this.commit()
      this.notes.splice(idx, 1)
      this.persist()
    }
  }
})
