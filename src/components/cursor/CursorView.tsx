import { useMemo, useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { allTables, ATTRIBUTES, formatDate, WEAPONS } from '../../lib/skills'
import type { CursorState, TableEntry, TableRef, TableState } from '../../lib/skills'

type CursorViewProps = {
  tables: TableState
  cursor: CursorState
  onAdvanceCursor: () => void
}

export function CursorView({ tables, cursor, onAdvanceCursor }: CursorViewProps) {
  const [weaponFilter, setWeaponFilter] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState('all')

  const filteredAttributeTables = useMemo(() => {
    return allTables.filter((table) => {
      if (weaponFilter !== 'all' && table.weapon !== weaponFilter) return false
      if (attributeFilter !== 'all' && table.attribute !== attributeFilter) return false
      return true
    })
  }, [weaponFilter, attributeFilter])
  const activeCursor = cursor

  const cursorCandidates = useMemo(() => {
    const candidates = filteredAttributeTables
      .map((table) => {
        const entry = (tables[table.key] ?? []).find((item) => item.cursorId === activeCursor)
        if (!entry) return null
        return { table, entry }
      })
      .filter((value): value is { table: TableRef; entry: TableEntry } => Boolean(value))

    return candidates.sort((a, b) => {
      if (a.entry.favorite !== b.entry.favorite) {
        return a.entry.favorite ? -1 : 1
      }
      return a.table.label.localeCompare(b.table.label, 'ja-JP')
    })
  }, [filteredAttributeTables, tables, activeCursor])

  const nullCount = filteredAttributeTables.length - cursorCandidates.length

  return (
    <div className="flex flex-col gap-8">
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="heading-serif">カーソル {activeCursor}</CardTitle>
          <CardDescription>NULL でない候補のみ表示。お気に入りを優先表示します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
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
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>表示候補: {cursorCandidates.length} 件</span>
            <span>NULL: {nullCount} 件</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cursorCandidates.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 bg-background p-6 text-center text-sm text-muted-foreground">
                このカーソルで表示できる候補がありません
              </div>
            )}
            {cursorCandidates.map(({ table, entry }) => (
              <div key={table.key} className="rounded-2xl border border-border/50 bg-background p-4">
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{table.weapon}</div>
                      <div className="text-xs text-muted-foreground">{table.attribute}</div>
                    </div>
                    {entry.favorite && <Badge>お気に入り</Badge>}
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">シリーズ</span>
                      <div className="font-medium">{entry.seriesSkill}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">グループ</span>
                      <div className="font-medium">{entry.groupSkill}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      登録: {formatDate(entry.createdAt)}
                    </span>
                    <Button size="sm" onClick={onAdvanceCursor}>
                      この結果でカーソルを進める
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-background p-4 text-xs text-muted-foreground">
            カーソルを進めると、NULL なテーブルはシリーズ/グループともに「不明」で埋めます。
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
