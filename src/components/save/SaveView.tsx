import { useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import {
  allTables,
  ATTRIBUTES,
  CursorState,
  formatDate,
  INTENSIFY_TYPES,
  TableState,
  WEAPONS,
} from '../../lib/skills'
import { cn } from '../../lib/utils'

type SaveViewProps = {
  tables: TableState
  cursorByAttribute: CursorState
  groupOptions: string[]
  seriesOptions: string[]
  isLoadingOptions: boolean
  optionsError: string
  onAddEntry: (tableKey: string, groupSkill: string, seriesSkill: string) => void
  onToggleFavorite: (tableKey: string, entryId: string, favorite: boolean) => void
}

export function SaveView({
  tables,
  cursorByAttribute,
  groupOptions,
  seriesOptions,
  isLoadingOptions,
  optionsError,
  onAddEntry,
  onToggleFavorite,
}: SaveViewProps) {
  const [selectedTableKey, setSelectedTableKey] = useState(allTables[0]?.key ?? '')
  const [weaponFilter, setWeaponFilter] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState('all')
  const [intensifyFilter, setIntensifyFilter] = useState('all')
  const [showPassed, setShowPassed] = useState(false)
  const [groupSkill, setGroupSkill] = useState('')
  const [seriesSkill, setSeriesSkill] = useState('')

  const filterTables = (weapon: string, attribute: string, intensify: string) =>
    allTables.filter((table) => {
      if (weapon !== 'all' && table.weapon !== weapon) return false
      if (attribute !== 'all' && table.attribute !== attribute) return false
      if (intensify !== 'all' && table.intensify !== intensify) return false
      return true
    })

  const filteredTables = useMemo(
    () => filterTables(weaponFilter, attributeFilter, intensifyFilter),
    [weaponFilter, attributeFilter, intensifyFilter],
  )

  const updateFilters = (next: { weapon?: string; attribute?: string; intensify?: string }) => {
    const nextWeapon = next.weapon ?? weaponFilter
    const nextAttribute = next.attribute ?? attributeFilter
    const nextIntensify = next.intensify ?? intensifyFilter
    const nextFiltered = filterTables(nextWeapon, nextAttribute, nextIntensify)
    setWeaponFilter(nextWeapon)
    setAttributeFilter(nextAttribute)
    setIntensifyFilter(nextIntensify)
    setSelectedTableKey((prev) =>
      nextFiltered.find((table) => table.key === prev)?.key ?? nextFiltered[0]?.key ?? '',
    )
  }

  const selectedTable = allTables.find((table) => table.key === selectedTableKey) ?? allTables[0]
  const entries = tables[selectedTableKey] ?? []
  const sortedEntries = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const currentCursor = selectedTable ? cursorByAttribute[selectedTable.attribute] ?? 0 : 0
  const visibleEntries = showPassed
    ? sortedEntries
    : sortedEntries.filter((entry) => entry.cursorId >= currentCursor)

  const handleAddEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTableKey || !groupSkill || !seriesSkill) return
    onAddEntry(selectedTableKey, groupSkill, seriesSkill)
    setGroupSkill('')
    setSeriesSkill('')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="heading-serif">テーブル一覧</CardTitle>
          <CardDescription>武器×属性×激化タイプのリンクから移動</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>武器</Label>
              <Select
                value={weaponFilter}
                onChange={(event) => updateFilters({ weapon: event.target.value })}
              >
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
                onChange={(event) => updateFilters({ attribute: event.target.value })}
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
                onChange={(event) => updateFilters({ intensify: event.target.value })}
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
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1 sm:max-h-[360px]">
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
            {!optionsError && isLoadingOptions && (
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
            <Button variant="outline" size="sm" onClick={() => setShowPassed((prev) => !prev)}>
              {showPassed ? '通過済みを非表示' : '通過済みを表示'}
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="overflow-x-auto">
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
                    const isPassed = entry.cursorId < currentCursor
                    return (
                      <tr
                        key={entry.id}
                        className={cn(
                          'border-t border-border/60 bg-background/80',
                          isPassed && 'text-muted-foreground',
                        )}
                      >
                        <td className="px-4 py-3">{entry.cursorId + 1}</td>
                        <td className="px-4 py-3">{entry.groupSkill}</td>
                        <td className="px-4 py-3">{entry.seriesSkill}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={entry.favorite}
                              onChange={(event) =>
                                onToggleFavorite(selectedTableKey, entry.id, event.target.checked)
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
