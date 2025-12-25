import { useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { allTables, ATTRIBUTES, WEAPONS } from '../../lib/skills'
import type { TableEntry, TableRef, TableState } from '../../lib/skills'

const tableMetaByKey = new Map(allTables.map((table) => [table.key, table]))

type VerifyViewProps = {
  tables: TableState
  onExport: () => unknown
  onImport: (payload: unknown) => { ok: boolean; message?: string }
  onToggleFavorite: (tableKey: string, entryId: string, favorite: boolean) => void
}

export function VerifyView({ tables, onExport, onImport, onToggleFavorite }: VerifyViewProps) {
  const [weaponFilter, setWeaponFilter] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState('all')
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const filteredTables = useMemo(() => {
    const keys = Object.keys(tables).filter((key) => (tables[key] ?? []).length > 0)
    const metas = keys
      .map((key) => tableMetaByKey.get(key))
      .filter((table): table is TableRef => Boolean(table))
      .filter((table) => {
        if (weaponFilter !== 'all' && table.weapon !== weaponFilter) return false
        if (attributeFilter !== 'all' && table.attribute !== attributeFilter) return false
        return true
      })
    return metas.sort((a, b) => a.label.localeCompare(b.label, 'ja-JP'))
  }, [tables, weaponFilter, attributeFilter])

  const entryMaps = useMemo(() => {
    const map = new Map<string, Map<number, TableEntry>>()
    filteredTables.forEach((table) => {
      const entries = tables[table.key] ?? []
      const cursorMap = new Map<number, TableEntry>()
      entries.forEach((entry) => cursorMap.set(entry.cursorId, entry))
      map.set(table.key, cursorMap)
    })
    return map
  }, [filteredTables, tables])

  const cursorIds = useMemo(() => {
    const set = new Set<number>()
    filteredTables.forEach((table) => {
      const entries = tables[table.key] ?? []
      entries.forEach((entry) => set.add(entry.cursorId))
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [filteredTables, tables])

  const handleExport = () => {
    const data = onExport()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    link.download = `mhwu-backup-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const result = onImport(payload)
      setImportMessage(result.ok ? 'インポートしました。' : result.message ?? 'インポートに失敗しました。')
    } catch {
      setImportMessage('インポートに失敗しました。')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle className="heading-serif">確認</CardTitle>
        <CardDescription>保存済みの抽選結果を一覧で確認します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              エクスポート
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              インポート
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
          {importMessage && <span className="text-xs text-muted-foreground">{importMessage}</span>}
        </div>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>カーソル数: {cursorIds.length} 件</span>
          <span>列数: {filteredTables.length} 件</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-max min-w-full border-collapse text-xs whitespace-nowrap">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">カーソル</th>
                {filteredTables.map((table) => (
                <th key={table.key} className="px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{table.key}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
              {cursorIds.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(1, filteredTables.length + 1)}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    まだ記録がありません
                  </td>
                </tr>
              )}
              {cursorIds.map((cursorId) => (
                <tr key={cursorId} className="border-t border-border/50 bg-background">
                  <td className="px-3 py-2">{cursorId + 1}</td>
                  {filteredTables.map((table) => {
                    const entry = entryMaps.get(table.key)?.get(cursorId)
                    return (
                      <td key={table.key} className="px-3 py-2 align-top">
                        {entry ? (
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(table.key, entry.id, !entry.favorite)}
                            className={`grid w-full gap-1 rounded-lg border p-2 text-left text-[10px] transition-colors ${
                              entry.favorite
                                ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                                : 'border-border/40 bg-background hover:border-border/70 hover:bg-muted/40'
                            }`}
                            title={entry.favorite ? 'お気に入りを外す' : 'お気に入りにする'}
                          >
                            <div className="text-[11px] text-muted-foreground">シリーズ</div>
                            <div className="text-[11px] font-medium">{entry.seriesSkill}</div>
                            <div className="text-[11px] text-muted-foreground">グループ</div>
                            <div className="text-[11px] font-medium">{entry.groupSkill}</div>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
