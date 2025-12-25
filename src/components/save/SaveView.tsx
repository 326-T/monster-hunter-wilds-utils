import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { allTables, ATTRIBUTES, formatDate, WEAPONS } from '../../lib/skills'
import type { CursorState, TableState } from '../../lib/skills'
import { cn } from '../../lib/utils'
import { useSkillVisibility } from '../../hooks/useSkillVisibility'

const HIDDEN_SKILL_LABEL = '非表示スキル'

type SaveViewProps = {
  tables: TableState
  cursor: CursorState
  groupOptions: string[]
  seriesOptions: string[]
  isLoadingOptions: boolean
  optionsError: string
  onAddEntry: (tableKey: string, groupSkill: string, seriesSkill: string) => void
  onToggleFavorite: (tableKey: string, entryId: string, favorite: boolean) => void
  onUpdateEntry: (
    tableKey: string,
    entryId: string,
    updates: { groupSkill?: string; seriesSkill?: string },
  ) => void
}

export function SaveView({
  tables,
  cursor,
  groupOptions,
  seriesOptions,
  isLoadingOptions,
  optionsError,
  onAddEntry,
  onToggleFavorite,
  onUpdateEntry,
}: SaveViewProps) {
  const [selectedTableKey, setSelectedTableKey] = useState(allTables[0]?.key ?? '')
  const [weaponFilter, setWeaponFilter] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState('all')
  const [showPassed, setShowPassed] = useState(false)
  const [groupSkill, setGroupSkill] = useState('')
  const [seriesSkill, setSeriesSkill] = useState('')
  const {
    visibleGroupOptions,
    visibleSeriesOptions,
    visibleGroupSet,
    visibleSeriesSet,
    hiddenGroupCount,
    hiddenSeriesCount,
    toggleGroupVisibility,
    toggleSeriesVisibility,
    showAllGroup,
    showAllSeries,
    hideAllGroup,
    hideAllSeries,
  } = useSkillVisibility(groupOptions, seriesOptions)

  const filterTables = (weapon: string, attribute: string) =>
    allTables.filter((table) => {
      if (weapon !== 'all' && table.weapon !== weapon) return false
      if (attribute !== 'all' && table.attribute !== attribute) return false
      return true
    })

  const filteredTables = useMemo(
    () => filterTables(weaponFilter, attributeFilter),
    [weaponFilter, attributeFilter],
  )

  const updateFilters = (next: { weapon?: string; attribute?: string }) => {
    const nextWeapon = next.weapon ?? weaponFilter
    const nextAttribute = next.attribute ?? attributeFilter
    const nextFiltered = filterTables(nextWeapon, nextAttribute)
    setWeaponFilter(nextWeapon)
    setAttributeFilter(nextAttribute)
    setSelectedTableKey((prev) =>
      nextFiltered.find((table) => table.key === prev)?.key ?? nextFiltered[0]?.key ?? '',
    )
  }

  const selectedTable = allTables.find((table) => table.key === selectedTableKey) ?? allTables[0]
  const entries = tables[selectedTableKey] ?? []
  const sortedEntries = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const currentCursor = selectedTable ? cursor : 0
  const visibleEntries = showPassed
    ? sortedEntries
    : sortedEntries.filter((entry) => entry.cursorId >= currentCursor)
  const seriesSelectOptions = useMemo(() => {
    return [HIDDEN_SKILL_LABEL, ...visibleSeriesOptions]
  }, [visibleSeriesOptions])
  const groupSelectOptions = useMemo(() => {
    return [HIDDEN_SKILL_LABEL, ...visibleGroupOptions]
  }, [visibleGroupOptions])

  const pickDefaultSkill = (hiddenCount: number, options: string[]) => {
    if (hiddenCount > 0) return HIDDEN_SKILL_LABEL
    if (options.includes('不明')) return '不明'
    return options[0] ?? ''
  }

  useEffect(() => {
    if (seriesSkill || seriesOptions.length === 0) return
    setSeriesSkill(pickDefaultSkill(hiddenSeriesCount, seriesOptions))
  }, [seriesSkill, seriesOptions, hiddenSeriesCount])

  useEffect(() => {
    if (groupSkill || groupOptions.length === 0) return
    setGroupSkill(pickDefaultSkill(hiddenGroupCount, groupOptions))
  }, [groupSkill, groupOptions, hiddenGroupCount])

  useEffect(() => {
    if (!seriesSkill || seriesSkill === HIDDEN_SKILL_LABEL) return
    if (!visibleSeriesSet.has(seriesSkill)) {
      setSeriesSkill(HIDDEN_SKILL_LABEL)
    }
  }, [seriesSkill, visibleSeriesSet])

  useEffect(() => {
    if (!groupSkill || groupSkill === HIDDEN_SKILL_LABEL) return
    if (!visibleGroupSet.has(groupSkill)) {
      setGroupSkill(HIDDEN_SKILL_LABEL)
    }
  }, [groupSkill, visibleGroupSet])

  const handleAddEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTableKey || !groupSkill || !seriesSkill) return
    onAddEntry(selectedTableKey, groupSkill, seriesSkill)
    setGroupSkill('')
    setSeriesSkill('')
  }

  return (
    <div className="flex flex-col gap-8">
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="heading-serif">テーブル一覧</CardTitle>
          <CardDescription>武器×属性のリンクから移動</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 rounded-2xl border border-border/40 bg-background p-4">
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
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>一致: {filteredTables.length} 件</span>
            <span>全体: {allTables.length} 件</span>
          </div>
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1 sm:max-h-[360px]">
            {filteredTables.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
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
                    'h-auto w-full justify-between rounded-2xl px-4 py-3 text-left',
                    active ? 'shadow-none' : 'text-foreground',
                  )}
                  onClick={() => setSelectedTableKey(table.key)}
                >
                  <div>
                    <div className="text-sm font-semibold">{table.weapon}</div>
                    <div className="text-xs text-muted-foreground">{table.attribute}</div>
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
        <CardContent className="space-y-8">
          <div className="rounded-2xl border border-border/40 bg-background p-4">
            <div className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground">選択中のテーブル</div>
              <div className="text-lg font-semibold">{selectedTable?.label}</div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>カーソル位置: {currentCursor}</span>
                <span>記録数: {sortedEntries.length}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-border/40 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">表示スキル設定</div>
              <span className="text-xs text-muted-foreground">
                非表示は「{HIDDEN_SKILL_LABEL}」で記録
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">シリーズスキル</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={showAllSeries}
                    >
                      すべて表示
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={hideAllSeries}
                    >
                      すべて非表示
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>表示: {visibleSeriesOptions.length} 件</span>
                  <span>全体: {seriesOptions.length} 件</span>
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {seriesOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">選択肢がありません</div>
                  )}
                  {seriesOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={visibleSeriesSet.has(option)}
                        onChange={() => toggleSeriesVisibility(option)}
                      />
                      <span className="truncate">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">グループスキル</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={showAllGroup}
                    >
                      すべて表示
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={hideAllGroup}
                    >
                      すべて非表示
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>表示: {visibleGroupOptions.length} 件</span>
                  <span>全体: {groupOptions.length} 件</span>
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {groupOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">選択肢がありません</div>
                  )}
                  {groupOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={visibleGroupSet.has(option)}
                        onChange={() => toggleGroupVisibility(option)}
                      />
                      <span className="truncate">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddEntry} className="grid gap-4">
            <div className="grid gap-2">
              <Label>シリーズスキル</Label>
              <Select
                value={seriesSkill}
                onChange={(event) => setSeriesSkill(event.target.value)}
                disabled={Boolean(optionsError)}
              >
                <option value="">選択してください</option>
                {seriesSelectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>グループスキル</Label>
              <Select
                value={groupSkill}
                onChange={(event) => setGroupSkill(event.target.value)}
                disabled={Boolean(optionsError)}
              >
                <option value="">選択してください</option>
                {groupSelectOptions.map((option) => (
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
              <div className="rounded-lg border border-dashed border-border/60 bg-background p-3 text-xs text-muted-foreground">
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

          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">シリーズ</th>
                  <th className="px-4 py-3">グループ</th>
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
                  const seriesValue = seriesSelectOptions.includes(entry.seriesSkill)
                    ? entry.seriesSkill
                    : HIDDEN_SKILL_LABEL
                  const groupValue = groupSelectOptions.includes(entry.groupSkill)
                    ? entry.groupSkill
                    : HIDDEN_SKILL_LABEL
                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        'border-t border-border/50 bg-background',
                        isPassed && 'text-muted-foreground',
                      )}
                    >
                      <td className="px-4 py-3">{entry.cursorId + 1}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={seriesValue}
                          onChange={(event) =>
                            onUpdateEntry(selectedTableKey, entry.id, {
                              seriesSkill: event.target.value,
                            })
                          }
                          disabled={Boolean(optionsError)}
                          className="h-9 text-xs"
                        >
                          {seriesSelectOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={groupValue}
                          onChange={(event) =>
                            onUpdateEntry(selectedTableKey, entry.id, {
                              groupSkill: event.target.value,
                            })
                          }
                          disabled={Boolean(optionsError)}
                          className="h-9 text-xs"
                        >
                          {groupSelectOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </td>
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
        </CardContent>
      </Card>
    </div>
  )
}
