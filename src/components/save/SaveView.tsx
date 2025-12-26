import { useCallback, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { ResponsiveSelect } from '../ui/responsive-select'
import { Select } from '../ui/select'
import { OcrCapture } from '../ocr/OcrCapture'
import {
  ATTRIBUTES,
  formatDate,
  getAttributeLabel,
  getSkillLabel,
  getTableLabel,
  getWeaponLabel,
  HIDDEN_SKILL_LABEL,
  makeTableKey,
  UNKNOWN_SKILL_LABEL,
  WEAPONS,
} from '../../lib/skills'
import type { CursorState, TableState } from '../../lib/skills'
import { cn } from '../../lib/utils'
import { useSkillVisibility } from '../../hooks/useSkillVisibility'
import { useTranslation } from 'react-i18next'
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride'

type SaveViewProps = {
  tables: TableState
  cursor: CursorState
  groupOptions: string[]
  seriesOptions: string[]
  isLoadingOptions: boolean
  optionsError: '' | 'loadOptions'
  onAddEntry: (tableKey: string, groupSkill: string, seriesSkill: string) => string
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
  const [runTour, setRunTour] = useState(false)
  const [selectedWeapon, setSelectedWeapon] = useState(WEAPONS[0] ?? '')
  const [selectedAttribute, setSelectedAttribute] = useState(ATTRIBUTES[0] ?? '')
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

  const selectedTableKey = useMemo(() => {
    if (!selectedWeapon || !selectedAttribute) return ''
    return makeTableKey(selectedWeapon, selectedAttribute)
  }, [selectedWeapon, selectedAttribute])

  const selectedTable =
    selectedWeapon && selectedAttribute
      ? { weapon: selectedWeapon, attribute: selectedAttribute }
      : null
  const entries = tables[selectedTableKey] ?? []
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.cursorId !== b.cursorId) return b.cursorId - a.cursorId
    return b.createdAt.localeCompare(a.createdAt)
  })
  const currentCursor = selectedTableKey ? cursor : 0
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

  const defaultSeriesSkill = useMemo(() => {
    if (seriesOptions.length === 0) return ''
    return pickDefaultSkill(hiddenSeriesCount, seriesOptions)
  }, [hiddenSeriesCount, seriesOptions])

  const defaultGroupSkill = useMemo(() => {
    if (groupOptions.length === 0) return ''
    return pickDefaultSkill(hiddenGroupCount, groupOptions)
  }, [groupOptions, hiddenGroupCount])

  const resolvedSeriesSkill = seriesSkill || defaultSeriesSkill
  const resolvedGroupSkill = groupSkill || defaultGroupSkill
  const seriesSelectValue =
    resolvedSeriesSkill &&
    resolvedSeriesSkill !== HIDDEN_SKILL_LABEL &&
    !visibleSeriesSet.has(resolvedSeriesSkill)
      ? HIDDEN_SKILL_LABEL
      : resolvedSeriesSkill
  const groupSelectValue =
    resolvedGroupSkill &&
    resolvedGroupSkill !== HIDDEN_SKILL_LABEL &&
    !visibleGroupSet.has(resolvedGroupSkill)
      ? HIDDEN_SKILL_LABEL
      : resolvedGroupSkill

  const tourSteps = useMemo<Step[]>(
    () => [
      { target: "[data-tour='save-select']", content: t('tour.save.select') },
      { target: "[data-tour='save-current']", content: t('tour.save.current') },
      { target: "[data-tour='save-visibility']", content: t('tour.save.visibility') },
      { target: "[data-tour='save-form']", content: t('tour.save.form') },
      { target: "[data-tour='save-toggle']", content: t('tour.save.toggle') },
      { target: "[data-tour='save-table']", content: t('tour.save.table') },
    ],
    [t],
  )

  const handleTour = useCallback((data: CallBackProps) => {
    const finished = data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED
    if (finished) setRunTour(false)
  }, [])

  const handleAddEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTableKey || !resolvedGroupSkill || !resolvedSeriesSkill) return
    onAddEntry(selectedTableKey, resolvedGroupSkill, resolvedSeriesSkill)
    setGroupSkill('')
    setSeriesSkill('')
  }

  return (
    <div className="flex flex-col gap-8">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        disableOverlayClose
        scrollOffset={160}
        callback={handleTour}
        locale={{
          back: t('tour.back'),
          close: t('tour.close'),
          last: t('tour.last'),
          next: t('tour.next'),
          skip: t('tour.skip'),
        }}
      />
      <Card className="animate-fade-up">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="heading-serif">{t('save.record.title')}</CardTitle>
              <CardDescription>{t('save.record.description')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setRunTour(true)}>
              {t('tour.start')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div
            className="grid gap-3 rounded-2xl border border-border/40 bg-background p-4 sm:grid-cols-2"
            data-tour="save-select"
          >
            <div className="space-y-2">
              <Label>{t('filter.weapon')}</Label>
              <ResponsiveSelect
                name="selected-weapon"
                value={selectedWeapon}
                onChange={setSelectedWeapon}
                options={WEAPONS.map((weapon) => ({
                  value: weapon,
                  label: getWeaponLabel(weapon, language),
                }))}
                gridClassName="sm:grid-cols-3 lg:grid-cols-4"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>{t('filter.attribute')}</Label>
              <ResponsiveSelect
                name="selected-attribute"
                value={selectedAttribute}
                onChange={setSelectedAttribute}
                options={ATTRIBUTES.map((attribute) => ({
                  value: attribute,
                  label: getAttributeLabel(attribute, language),
                }))}
                gridClassName="sm:grid-cols-3 lg:grid-cols-4"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border/40 bg-background p-4" data-tour="save-current">
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

          <OcrCapture
            selectedTableKey={selectedTableKey}
            seriesOptions={seriesOptions}
            groupOptions={groupOptions}
            disabled={!selectedTableKey || isLoadingOptions || Boolean(optionsError)}
            language={language}
            onAddEntry={onAddEntry}
            onUpdateEntry={onUpdateEntry}
          />

          <details className="group rounded-2xl border border-border/40 bg-background p-4" data-tour="save-visibility">
            <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
              <div className="text-sm font-semibold">{t('save.visibility.title')}</div>
              <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="grid gap-4 pt-4">
              <div className="text-xs text-muted-foreground">
                {t('save.visibility.note', {
                  label: getSkillLabel(HIDDEN_SKILL_LABEL, language),
                })}
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
          </details>

          <form onSubmit={handleAddEntry} className="grid gap-4" data-tour="save-form">
            <div className="grid gap-2">
              <Label>{t('save.seriesSkill')}</Label>
              <ResponsiveSelect
                name="series-skill"
                value={seriesSelectValue}
                onChange={setSeriesSkill}
                disabled={Boolean(optionsError)}
                placeholder={t('common.select')}
                options={seriesSelectOptions.map((option) => ({
                  value: option,
                  label: getSkillLabel(option, language),
                }))}
                gridClassName="sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('save.groupSkill')}</Label>
              <ResponsiveSelect
                name="group-skill"
                value={groupSelectValue}
                onChange={setGroupSkill}
                disabled={Boolean(optionsError)}
                placeholder={t('common.select')}
                options={groupSelectOptions.map((option) => ({
                  value: option,
                  label: getSkillLabel(option, language),
                }))}
                gridClassName="sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              />
            </div>
            {!optionsError && isLoadingOptions && (
              <div className="text-xs text-muted-foreground">{t('common.loadingOptions')}</div>
            )}
            {optionsError && (
              <div className="rounded-lg border border-dashed border-border/60 bg-background p-3 text-xs text-muted-foreground">
                {optionsErrorMessage}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={!resolvedGroupSkill || !resolvedSeriesSkill}
            >
              {t('save.addEntry')}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3" data-tour="save-toggle">
            <div className="text-sm text-muted-foreground">
              {t('save.passedNote')}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPassed((prev) => !prev)}>
              {showPassed ? t('save.hidePassed') : t('save.showPassed')}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/60" data-tour="save-table">
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
