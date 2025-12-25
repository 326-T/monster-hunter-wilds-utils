import { useMemo, useState } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import {
  allTables,
  ATTRIBUTES,
  formatDate,
  getAttributeLabel,
  getSkillLabel,
  getTableLabel,
  getWeaponLabel,
  UNKNOWN_SKILL_LABEL,
  WEAPONS,
} from '../../lib/skills'
import type { CursorState, TableEntry, TableRef, TableState } from '../../lib/skills'
import { useTranslation } from 'react-i18next'

type CursorViewProps = {
  tables: TableState
  cursor: CursorState
  onAdvanceCursor: () => void
}

export function CursorView({ tables, cursor, onAdvanceCursor }: CursorViewProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.language === 'en' ? 'en' : 'ja'
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
      const aLabel = getTableLabel(a.table, language)
      const bLabel = getTableLabel(b.table, language)
      return aLabel.localeCompare(bLabel, language === 'en' ? 'en-US' : 'ja-JP')
    })
  }, [filteredAttributeTables, tables, activeCursor, language])

  const nullCount = filteredAttributeTables.length - cursorCandidates.length

  return (
    <div className="flex flex-col gap-8">
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="heading-serif">
            {t('cursor.title', { value: activeCursor })}
          </CardTitle>
          <CardDescription>{t('cursor.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('filter.weapon')}</Label>
              <Select value={weaponFilter} onChange={(event) => setWeaponFilter(event.target.value)}>
                <option value="all">{t('common.all')}</option>
                {WEAPONS.map((weapon) => (
                  <option key={weapon} value={weapon}>
                    {getWeaponLabel(weapon, language)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>{t('filter.attribute')}</Label>
              <Select
                value={attributeFilter}
                onChange={(event) => setAttributeFilter(event.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                {ATTRIBUTES.map((attribute) => (
                  <option key={attribute} value={attribute}>
                    {getAttributeLabel(attribute, language)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{t('cursor.candidates', { count: cursorCandidates.length })}</span>
            <span>{t('cursor.nullCount', { count: nullCount })}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cursorCandidates.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 bg-background p-6 text-center text-sm text-muted-foreground">
                {t('cursor.noCandidates')}
              </div>
            )}
            {cursorCandidates.map(({ table, entry }) => (
              <div key={table.key} className="rounded-2xl border border-border/50 bg-background p-4">
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {getWeaponLabel(table.weapon, language)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getAttributeLabel(table.attribute, language)}
                      </div>
                    </div>
                    {entry.favorite && <Badge>{t('common.favorite')}</Badge>}
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">{t('save.headers.series')}</span>
                      <div className="font-medium">
                        {getSkillLabel(entry.seriesSkill, language)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{t('save.headers.group')}</span>
                      <div className="font-medium">{getSkillLabel(entry.groupSkill, language)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t('cursor.addedAt', {
                        value: formatDate(entry.createdAt, language),
                      })}
                    </span>
                    <Button size="sm" onClick={onAdvanceCursor}>
                      {t('cursor.advanceButton')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-background p-4 text-xs text-muted-foreground">
            {t('cursor.advanceNote', {
              label: getSkillLabel(UNKNOWN_SKILL_LABEL, language),
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
