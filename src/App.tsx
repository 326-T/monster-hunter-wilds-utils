import { useEffect, useMemo, useState } from 'react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Select } from './components/ui/select'
import { cn } from './lib/utils'

const WEAPONS = [
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

const ATTRIBUTES = ['火属性', '水属性', '雷属性', '氷属性', '龍属性', '麻痺属性', '睡眠属性', '爆破属性', '毒属性']

const INTENSIFY_TYPES = ['攻撃激化タイプ', '会心激化タイプ', '属性激化タイプ']

type TableRef = {
  key: string
  weapon: string
  attribute: string
  intensify: string
  label: string
}

type TableEntry = {
  id: string
  groupSkill: string
  seriesSkill: string
  favorite: boolean
  createdAt: string
}

type TableState = Record<string, TableEntry[]>

type CursorState = Record<string, number>

const STORAGE_KEY = 'mhwu.tableEntries.v1'
const CURSOR_KEY = 'mhwu.attributeCursors.v1'

const makeTableKey = (weapon: string, attribute: string, intensify: string) =>
  `${weapon}::${attribute}::${intensify}`

const allTables: TableRef[] = WEAPONS.flatMap((weapon) =>
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

const formatDate = (value: string) => {
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

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function App() {
  const [groupOptions, setGroupOptions] = useState<string[]>([])
  const [seriesOptions, setSeriesOptions] = useState<string[]>([])
  const [optionsError, setOptionsError] = useState('')

  const [tables, setTables] = useState<TableState>(() => loadFromStorage<TableState>(STORAGE_KEY, {}))
  const [cursorByAttribute] = useState<CursorState>(() => loadFromStorage<CursorState>(CURSOR_KEY, {}))

  const [selectedTableKey, setSelectedTableKey] = useState(allTables[0]?.key ?? '')
  const [weaponFilter, setWeaponFilter] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState('all')
  const [intensifyFilter, setIntensifyFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [showPassed, setShowPassed] = useState(false)

  const [groupSkill, setGroupSkill] = useState('')
  const [seriesSkill, setSeriesSkill] = useState('')

  useEffect(() => {
    saveToStorage(STORAGE_KEY, tables)
  }, [tables])

  useEffect(() => {
    let active = true
    const loadOptions = async () => {
      try {
        const [groupRes, seriesRes] = await Promise.all([
          fetch('/data/group_skills.json'),
          fetch('/data/series_skills.json'),
        ])
        if (!groupRes.ok || !seriesRes.ok) {
          throw new Error('Failed to load')
        }
        const [groupData, seriesData] = await Promise.all([groupRes.json(), seriesRes.json()])
        if (!active) return
        setGroupOptions(groupData)
        setSeriesOptions(seriesData)
      } catch {
        if (!active) return
        setOptionsError('選択肢の読み込みに失敗しました。')
      }
    }
    loadOptions()
    return () => {
      active = false
    }
  }, [])

  const filteredTables = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return allTables.filter((table) => {
      if (weaponFilter !== 'all' && table.weapon !== weaponFilter) return false
      if (attributeFilter !== 'all' && table.attribute !== attributeFilter) return false
      if (intensifyFilter !== 'all' && table.intensify !== intensifyFilter) return false
      if (normalizedQuery) {
        return table.label.toLowerCase().includes(normalizedQuery)
      }
      return true
    })
  }, [weaponFilter, attributeFilter, intensifyFilter, query])

  useEffect(() => {
    if (!filteredTables.find((table) => table.key === selectedTableKey)) {
      setSelectedTableKey(filteredTables[0]?.key ?? '')
    }
  }, [filteredTables, selectedTableKey])

  const selectedTable = allTables.find((table) => table.key === selectedTableKey) ?? allTables[0]
  const entries = tables[selectedTableKey] ?? []
  const sortedEntries = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const currentCursor = selectedTable ? cursorByAttribute[selectedTable.attribute] ?? 0 : 0
  const visibleEntries = showPassed
    ? sortedEntries
    : sortedEntries.filter((_, index) => index >= currentCursor)

  const handleAddEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTableKey || !groupSkill || !seriesSkill) return
    const newEntry: TableEntry = {
      id: createId(),
      groupSkill,
      seriesSkill,
      favorite: false,
      createdAt: new Date().toISOString(),
    }
    setTables((prev) => {
      const nextEntries = [...(prev[selectedTableKey] ?? []), newEntry]
      return {
        ...prev,
        [selectedTableKey]: nextEntries,
      }
    })
    setGroupSkill('')
    setSeriesSkill('')
  }

  const handleFavoriteChange = (entryId: string, nextValue: boolean) => {
    setTables((prev) => {
      const target = prev[selectedTableKey] ?? []
      const nextEntries = target.map((entry) =>
        entry.id === entryId ? { ...entry, favorite: nextValue } : entry,
      )
      return {
        ...prev,
        [selectedTableKey]: nextEntries,
      }
    })
  }

  return (
    <div className="min-h-screen">
      <div className="relative">
        <div className="pointer-events-none absolute -top-32 right-10 h-72 w-72 rounded-full bg-[rgba(180,120,82,0.22)] blur-3xl animate-float" />
        <div className="pointer-events-none absolute bottom-[-120px] left-[-80px] h-80 w-80 rounded-full bg-[rgba(92,77,58,0.2)] blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
          <header className="mb-10 flex flex-col gap-3">
            <Badge className="w-fit">保存画面</Badge>
            <h1 className="text-3xl font-semibold heading-serif sm:text-4xl">
              抽選結果を記録する
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              武器×属性×激化タイプのテーブルごとに抽選結果を追記します。
              お気に入りはチェックのみで管理し、並び順は常に created_at の昇順です。
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle className="heading-serif">テーブル一覧</CardTitle>
                <CardDescription>武器×属性×激化タイプのリンクから移動</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="table-search">検索</Label>
                  <Input
                    id="table-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="例: 太刀 火 攻撃"
                  />
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>武器</Label>
                    <Select value={weaponFilter} onChange={(event) => setWeaponFilter(event.target.value)}>
                      <option value="all">すべて</option>
                      {WEAPONS.map((weapon) => (
                        <option key={weapon} value={weapon}>
                          {weapon}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>属性</Label>
                    <Select
                      value={attributeFilter}
                      onChange={(event) => setAttributeFilter(event.target.value)}
                    >
                      <option value="all">すべて</option>
                      {ATTRIBUTES.map((attribute) => (
                        <option key={attribute} value={attribute}>
                          {attribute}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>激化タイプ</Label>
                    <Select
                      value={intensifyFilter}
                      onChange={(event) => setIntensifyFilter(event.target.value)}
                    >
                      <option value="all">すべて</option>
                      {INTENSIFY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>一致: {filteredTables.length} 件</span>
                  <span>全体: {allTables.length} 件</span>
                </div>
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {filteredTables.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      該当するテーブルがありません
                    </div>
                  )}
                  {filteredTables.map((table) => {
                    const active = table.key === selectedTableKey
                    return (
                      <Button
                        key={table.key}
                        variant={active ? 'default' : 'ghost'}
                        className={cn(
                          'h-auto w-full justify-between rounded-xl px-4 py-3 text-left',
                          active ? 'shadow-md' : 'text-foreground',
                        )}
                        onClick={() => setSelectedTableKey(table.key)}
                      >
                        <div>
                          <div className="text-sm font-semibold">{table.weapon}</div>
                          <div className="text-xs text-muted-foreground">
                            {table.attribute} / {table.intensify}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">移動</span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle className="heading-serif">抽選結果を保存</CardTitle>
                <CardDescription>テーブルごとに記録してお気に入りを管理</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="text-xs text-muted-foreground">選択中のテーブル</div>
                  <div className="mt-1 text-lg font-semibold">{selectedTable?.label}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>カーソル位置: {currentCursor}</span>
                    <span>記録数: {sortedEntries.length}</span>
                  </div>
                </div>

                <form onSubmit={handleAddEntry} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>グループスキル</Label>
                    <Select
                      value={groupSkill}
                      onChange={(event) => setGroupSkill(event.target.value)}
                      disabled={Boolean(optionsError)}
                    >
                      <option value="">選択してください</option>
                      {groupOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>シリーズスキル</Label>
                    <Select
                      value={seriesSkill}
                      onChange={(event) => setSeriesSkill(event.target.value)}
                      disabled={Boolean(optionsError)}
                    >
                      <option value="">選択してください</option>
                      {seriesOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!optionsError && groupOptions.length === 0 && seriesOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">選択肢を読み込み中...</div>
                  )}
                  {optionsError && (
                    <div className="rounded-lg border border-dashed border-border bg-background/70 p-3 text-xs text-muted-foreground">
                      {optionsError}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={!groupSkill || !seriesSkill}>
                    このテーブルに追記する
                  </Button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    通過済みはデフォルト非表示。必要なら表示を切り替えます。
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassed((prev) => !prev)}
                  >
                    {showPassed ? '通過済みを非表示' : '通過済みを表示'}
                  </Button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-muted/70 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">グループ</th>
                        <th className="px-4 py-3">シリーズ</th>
                        <th className="px-4 py-3">お気に入り</th>
                        <th className="px-4 py-3">登録日時</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEntries.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                          >
                            まだ記録がありません
                          </td>
                        </tr>
                      )}
                      {visibleEntries.map((entry) => {
                        const originalIndex = sortedEntries.findIndex((item) => item.id === entry.id)
                        const isPassed = originalIndex < currentCursor
                        return (
                          <tr
                            key={entry.id}
                            className={cn(
                              'border-t border-border/60 bg-background/80',
                              isPassed && 'text-muted-foreground',
                            )}
                          >
                            <td className="px-4 py-3">{originalIndex + 1}</td>
                            <td className="px-4 py-3">{entry.groupSkill}</td>
                            <td className="px-4 py-3">{entry.seriesSkill}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={entry.favorite}
                                  onChange={(event) =>
                                    handleFavoriteChange(entry.id, event.target.checked)
                                  }
                                />
                                <span className="text-xs">{entry.favorite ? 'お気に入り' : ''}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDate(entry.createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
