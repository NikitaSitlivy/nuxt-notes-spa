import { toRaw } from 'vue'

export const deepClone = <T>(value: T): T => {
  const rawValue = (typeof value === 'object' && value !== null ? toRaw(value as object) : value) as T

  if (typeof structuredClone === 'function') {
    return structuredClone(rawValue)
  }

  return JSON.parse(JSON.stringify(rawValue)) as T
}
