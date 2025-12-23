export const WEAPONS = [
  '大剣',
  '太刀',
  '片手剣',
  '双剣',
  'ハンマー',
  '狩猟笛',
  'ランス',
  'ガンランス',
  'スラアク',
  'チャアク',
  '操虫棍',
  '弓',
  'ライトボウガン',
  'ヘビィボウガン',
]

export const ATTRIBUTES = [
  '火属性',
  '水属性',
  '雷属性',
  '氷属性',
  '龍属性',
  '麻痺属性',
  '睡眠属性',
  '爆破属性',
  '毒属性',
]

export const INTENSIFY_TYPES = ['攻撃激化タイプ', '会心激化タイプ', '属性激化タイプ']

export type TableRef = {
  key: string
  weapon: string
  attribute: string
  intensify: string
  label: string
}

export type TableEntry = {
  id: string
  groupSkill: string
  seriesSkill: string
  favorite: boolean
  createdAt: string
  cursorId: number
}

export type TableState = Record<string, TableEntry[]>

export type CursorState = Record<string, number>

export const STORAGE_KEY = 'mhwu.tableEntries.v1'
export const CURSOR_KEY = 'mhwu.attributeCursors.v1'

export const makeTableKey = (weapon: string, attribute: string, intensify: string) =>
  `${weapon}::${attribute}::${intensify}`

export const allTables: TableRef[] = WEAPONS.flatMap((weapon) =>
  ATTRIBUTES.flatMap((attribute) =>
    INTENSIFY_TYPES.map((intensify) => ({
      weapon,
      attribute,
      intensify,
      key: makeTableKey(weapon, attribute, intensify),
      label: `${weapon} / ${attribute} / ${intensify}`,
    })),
  ),
)

export const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
