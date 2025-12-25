import { useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { allTables, ATTRIBUTES, formatDate, INTENSIFY_TYPES, WEAPONS } from '../../lib/skills'
import type { TableState } from '../../lib/skills'

const tableMetaByKey = new Map(allTables.map((table) => [table.key, table]))

type VerifyRow = {
  id: string
  cursorId: number
  tableLabel: string
  groupSkill: string
  seriesSkill: string
  favorite: boolean
  createdAt: string
}

type VerifyViewProps = {
  tables: TableState
  onExport: () => unknown
  onImport: (payload: unknown) => { ok: boolean; message?: string }
}

export function VerifyView({ tables, onExport, onImport }: VerifyViewProps) {
  const [weaponFilter, setWeaponFilter] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState('all')
  const [intensifyFilter, setIntensifyFilter] = useState('all')
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const rows = useMemo(() => {
    const list: VerifyRow[] = []
    Object.entries(tables).forEach(([tableKey, entries]) => {
      const tableMeta = tableMetaByKey.get(tableKey)
      if (!tableMeta) return
      if (weaponFilter !== 'all' && tableMeta.weapon !== weaponFilter) return
      if (attributeFilter !== 'all' && tableMeta.attribute !== attributeFilter) return
      if (intensifyFilter !== 'all' && tableMeta.intensify !== intensifyFilter) return
      const tableLabel = tableMeta.label
      entries.forEach((entry) => {
        list.push({
          id: entry.id,
          cursorId: entry.cursorId,
          tableLabel,
          groupSkill: entry.groupSkill,
          seriesSkill: entry.seriesSkill,
          favorite: entry.favorite,
          createdAt: entry.createdAt,
        })
      })
    })
    return list.sort((a, b) => {
      if (a.cursorId !== b.cursorId) return a.cursorId - b.cursorId
      const labelCompare = a.tableLabel.localeCompare(b.tableLabel, 'ja-JP')
      if (labelCompare !== 0) return labelCompare
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [tables, weaponFilter, attributeFilter, intensifyFilter])

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <span>件数: {rows.length} 件</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-background text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">カーソル</th>
                <th className="px-4 py-3">武器/属性/激化タイプ</th>
                <th className="px-4 py-3">シリーズ</th>
                <th className="px-4 py-3">グループ</th>
                <th className="px-4 py-3">お気に入り</th>
                <th className="px-4 py-3">登録日時</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    まだ記録がありません
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/50 bg-background">
                  <td className="px-4 py-3">{row.cursorId + 1}</td>
                  <td className="px-4 py-3">{row.tableLabel}</td>
                  <td className="px-4 py-3">{row.seriesSkill}</td>
                  <td className="px-4 py-3">{row.groupSkill}</td>
                  <td className="px-4 py-3">{row.favorite ? '✓' : ''}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
