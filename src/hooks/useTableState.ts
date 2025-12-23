import { useCallback, useEffect, useState } from 'react'
import {
  allTables,
  createId,
  CURSOR_KEY,
  CursorState,
  STORAGE_KEY,
  TableEntry,
  TableState,
} from '../lib/skills'

type StoredTableEntry = Omit<TableEntry, 'cursorId'> & { cursorId?: number }

type StoredTableState = Record<string, StoredTableEntry[]>

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

const normalizeTableState = (state: StoredTableState): TableState => {
  const normalized: TableState = {}
  Object.entries(state).forEach(([key, entries]) => {
    const hasAllCursorIds = entries.every((entry) => typeof entry.cursorId === 'number')
    if (hasAllCursorIds) {
      normalized[key] = entries as TableEntry[]
      return
    }
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    normalized[key] = sorted.map((entry, index) => ({
      ...entry,
      cursorId: entry.cursorId ?? index,
    }))
  })
  return normalized
}

export function useTableState() {
  const [tables, setTables] = useState<TableState>(() =>
    normalizeTableState(loadFromStorage<StoredTableState>(STORAGE_KEY, {})),
  )
  const [cursorByAttribute, setCursorByAttribute] = useState<CursorState>(() =>
    loadFromStorage<CursorState>(CURSOR_KEY, {}),
  )

  useEffect(() => {
    saveToStorage(STORAGE_KEY, tables)
  }, [tables])

  useEffect(() => {
    saveToStorage(CURSOR_KEY, cursorByAttribute)
  }, [cursorByAttribute])

  const addEntry = useCallback((tableKey: string, groupSkill: string, seriesSkill: string) => {
    setTables((prev) => {
      const existing = prev[tableKey] ?? []
      const nextCursorId = existing.reduce((max, entry) => Math.max(max, entry.cursorId), -1) + 1
      const newEntry: TableEntry = {
        id: createId(),
        groupSkill,
        seriesSkill,
        favorite: false,
        createdAt: new Date().toISOString(),
        cursorId: nextCursorId,
      }
      return {
        ...prev,
        [tableKey]: [...existing, newEntry],
      }
    })
  }, [])

  const toggleFavorite = useCallback((tableKey: string, entryId: string, favorite: boolean) => {
    setTables((prev) => {
      const target = prev[tableKey] ?? []
      const nextEntries = target.map((entry) =>
        entry.id === entryId ? { ...entry, favorite } : entry,
      )
      return {
        ...prev,
        [tableKey]: nextEntries,
      }
    })
  }, [])

  const advanceCursor = useCallback(
    (attribute: string) => {
      const cursorId = cursorByAttribute[attribute] ?? 0
      const now = new Date().toISOString()
      const attributeTables = allTables.filter((table) => table.attribute === attribute)
      setTables((prev) => {
        const next: TableState = { ...prev }
        attributeTables.forEach((table) => {
          const tableEntries = [...(next[table.key] ?? [])]
          const hasCursorEntry = tableEntries.some((entry) => entry.cursorId === cursorId)
          if (!hasCursorEntry) {
            tableEntries.push({
              id: createId(),
              groupSkill: '不明',
              seriesSkill: '不明',
              favorite: false,
              createdAt: now,
              cursorId,
            })
          }
          next[table.key] = tableEntries
        })
        return next
      })
      setCursorByAttribute((prev) => ({
        ...prev,
        [attribute]: cursorId + 1,
      }))
    },
    [cursorByAttribute],
  )

  return {
    tables,
    cursorByAttribute,
    addEntry,
    toggleFavorite,
    advanceCursor,
  }
}
