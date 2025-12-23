import { useMemo, useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { allTables, ATTRIBUTES, formatDate } from '../../lib/skills'
import type { CursorState, TableEntry, TableRef, TableState } from '../../lib/skills'

type CursorViewProps = {
  tables: TableState
  cursorByAttribute: CursorState
  onAdvanceCursor: (attribute: string) => void
}

export function CursorView({ tables, cursorByAttribute, onAdvanceCursor }: CursorViewProps) {
  const [activeAttribute, setActiveAttribute] = useState(ATTRIBUTES[0] ?? '')

  const attributeTables = useMemo(
    () => allTables.filter((table) => table.attribute === activeAttribute),
    [activeAttribute],
  )
  const activeCursor = cursorByAttribute[activeAttribute] ?? 0

  const cursorCandidates = useMemo(() => {
    const candidates = attributeTables
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
  }, [attributeTables, tables, activeCursor])

  const nullCount = attributeTables.length - cursorCandidates.length

  return (
    <div className="flex flex-col gap-8">
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="heading-serif">属性タブ</CardTitle>
          <CardDescription>カーソルを進める属性を選択</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-1">
          {ATTRIBUTES.map((attribute) => (
            <Button
              key={attribute}
              variant={attribute === activeAttribute ? 'default' : 'ghost'}
              className="w-full justify-between"
              onClick={() => setActiveAttribute(attribute)}
            >
              <span>{attribute}</span>
              <span className="text-xs text-muted-foreground">
                cursor {cursorByAttribute[attribute] ?? 0}
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="heading-serif">カーソル {activeCursor}</CardTitle>
          <CardDescription>NULL でない候補のみ表示。お気に入りを優先表示します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
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
                      <div className="text-xs text-muted-foreground">
                        {table.attribute} / {table.intensify}
                      </div>
                    </div>
                    {entry.favorite && <Badge>お気に入り</Badge>}
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">グループ</span>
                      <div className="font-medium">{entry.groupSkill}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">シリーズ</span>
                      <div className="font-medium">{entry.seriesSkill}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      登録: {formatDate(entry.createdAt)}
                    </span>
                    <Button size="sm" onClick={() => onAdvanceCursor(activeAttribute)}>
                      この結果でカーソルを進める
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-background p-4 text-xs text-muted-foreground">
            カーソルを進めると、同じ属性の NULL なテーブルはグループ/シリーズともに「不明」で埋めます。
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
