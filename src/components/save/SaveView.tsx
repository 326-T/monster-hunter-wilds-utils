import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
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
  HIDDEN_SKILL_LABEL,
  UNKNOWN_SKILL_LABEL,
  WEAPONS,
} from '../../lib/skills'
import type { CursorState, TableState } from '../../lib/skills'
import { cn } from '../../lib/utils'
import { useSkillVisibility } from '../../hooks/useSkillVisibility'
import { useTranslation } from 'react-i18next'

type SaveViewProps = {
  tables: TableState
  cursor: CursorState
  groupOptions: string[]
  seriesOptions: string[]
  isLoadingOptions: boolean
  optionsError: '' | 'loadOptions'
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
  const { t, i18n } = useTranslation()
  const language = i18n.language === 'en' ? 'en' : 'ja'
  const optionsErrorMessage = optionsError ? t('error.loadOptions') : ''
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
    if (options.includes(UNKNOWN_SKILL_LABEL)) return UNKNOWN_SKILL_LABEL
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
          <CardTitle className="heading-serif">{t('save.tableList.title')}</CardTitle>
          <CardDescription>{t('save.tableList.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 rounded-2xl border border-border/40 bg-background p-4">
            <div className="space-y-2">
              <Label>{t('filter.weapon')}</Label>
              <Select
                value={weaponFilter}
                onChange={(event) => updateFilters({ weapon: event.target.value })}
              >
                <option value="all">{t('common.all')}</option>
                {WEAPONS.map((weapon) => (
                  <option key={weapon} value={weapon}>
                    {getWeaponLabel(weapon, language)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('filter.attribute')}</Label>
              <Select
                value={attributeFilter}
                onChange={(event) => updateFilters({ attribute: event.target.value })}
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
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('common.matches', { count: filteredTables.length })}</span>
            <span>{t('common.total', { count: allTables.length })}</span>
          </div>
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1 sm:max-h-[360px]">
            {filteredTables.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                {t('save.noTables')}
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
                    <div className="text-sm font-semibold">
                      {getWeaponLabel(table.weapon, language)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getAttributeLabel(table.attribute, language)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('common.open')}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="heading-serif">{t('save.record.title')}</CardTitle>
          <CardDescription>{t('save.record.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="rounded-2xl border border-border/40 bg-background p-4">
            <div className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground">{t('save.selectedTable')}</div>
              <div className="text-lg font-semibold">
                {selectedTable ? getTableLabel(selectedTable, language) : ''}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{t('save.cursorPosition', { value: currentCursor })}</span>
                <span>{t('save.entryCount', { count: sortedEntries.length })}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-border/40 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">{t('save.visibility.title')}</div>
              <span className="text-xs text-muted-foreground">
                {t('save.visibility.note', {
                  label: getSkillLabel(HIDDEN_SKILL_LABEL, language),
                })}
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{t('save.seriesSkill')}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={showAllSeries}
                    >
                      {t('save.showAll')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={hideAllSeries}
                    >
                      {t('save.hideAll')}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{t('common.visible', { count: visibleSeriesOptions.length })}</span>
                  <span>{t('common.total', { count: seriesOptions.length })}</span>
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {seriesOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">{t('common.noOptions')}</div>
                  )}
                  {seriesOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={visibleSeriesSet.has(option)}
                        onChange={() => toggleSeriesVisibility(option)}
                      />
                      <span className="truncate">{getSkillLabel(option, language)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{t('save.groupSkill')}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={showAllGroup}
                    >
                      {t('save.showAll')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={hideAllGroup}
                    >
                      {t('save.hideAll')}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{t('common.visible', { count: visibleGroupOptions.length })}</span>
                  <span>{t('common.total', { count: groupOptions.length })}</span>
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {groupOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">{t('common.noOptions')}</div>
                  )}
                  {groupOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={visibleGroupSet.has(option)}
                        onChange={() => toggleGroupVisibility(option)}
                      />
                      <span className="truncate">{getSkillLabel(option, language)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddEntry} className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t('save.seriesSkill')}</Label>
              <Select
                value={seriesSkill}
                onChange={(event) => setSeriesSkill(event.target.value)}
                disabled={Boolean(optionsError)}
              >
                <option value="">{t('common.select')}</option>
                {seriesSelectOptions.map((option) => (
                  <option key={option} value={option}>
                    {getSkillLabel(option, language)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('save.groupSkill')}</Label>
              <Select
                value={groupSkill}
                onChange={(event) => setGroupSkill(event.target.value)}
                disabled={Boolean(optionsError)}
              >
                <option value="">{t('common.select')}</option>
                {groupSelectOptions.map((option) => (
                  <option key={option} value={option}>
                    {getSkillLabel(option, language)}
                  </option>
                ))}
              </Select>
            </div>
            {!optionsError && isLoadingOptions && (
              <div className="text-xs text-muted-foreground">{t('common.loadingOptions')}</div>
            )}
            {optionsError && (
              <div className="rounded-lg border border-dashed border-border/60 bg-background p-3 text-xs text-muted-foreground">
                {optionsErrorMessage}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={!groupSkill || !seriesSkill}>
              {t('save.addEntry')}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {t('save.passedNote')}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPassed((prev) => !prev)}>
              {showPassed ? t('save.hidePassed') : t('save.showPassed')}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('save.headers.series')}</th>
                  <th className="px-4 py-3">{t('save.headers.group')}</th>
                  <th className="px-4 py-3">{t('save.headers.favorite')}</th>
                  <th className="px-4 py-3">{t('save.headers.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-muted-foreground"
                    >
                      {t('common.noEntries')}
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
                              {getSkillLabel(option, language)}
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
                              {getSkillLabel(option, language)}
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
                          <span className="text-xs">{entry.favorite ? t('common.favorite') : ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(entry.createdAt, language)}
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
