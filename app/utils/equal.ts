export const stableStringify = (value: unknown) => JSON.stringify(value)

export const isEqual = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b)
