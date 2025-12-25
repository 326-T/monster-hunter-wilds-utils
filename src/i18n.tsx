import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type DictionaryEntry = {
  ja: string
  en: string
}

type Dictionary = Record<string, DictionaryEntry>

export type Language = 'ja' | 'en'

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const dictionary = {
  'app.title': {
    ja: '巨戟アーティア スキル抽選メモ',
    en: 'Giant Halberd Artia Skill Draw Log',
  },
  'tab.record': { ja: '記録する', en: 'Record' },
  'tab.verify': { ja: '確認する', en: 'Review' },
  'tab.advance': { ja: '進める', en: 'Advance' },
  'language.ja': { ja: '日本語', en: 'Japanese' },
  'language.en': { ja: '英語', en: 'English' },
  'common.all': { ja: 'すべて', en: 'All' },
  'common.select': { ja: '選択してください', en: 'Select' },
  'common.open': { ja: '移動', en: 'Open' },
  'common.favorite': { ja: 'お気に入り', en: 'Favorite' },
  'common.hiddenSkill': { ja: '非表示スキル', en: 'Hidden Skill' },
  'common.unknown': { ja: '不明', en: 'Unknown' },
  'common.matches': { ja: '一致: {count} 件', en: 'Matches: {count}' },
  'common.total': { ja: '全体: {count} 件', en: 'Total: {count}' },
  'common.visible': { ja: '表示: {count} 件', en: 'Visible: {count}' },
  'common.noOptions': { ja: '選択肢がありません', en: 'No options' },
  'common.noEntries': { ja: 'まだ記録がありません', en: 'No entries yet' },
  'common.loadingOptions': { ja: '選択肢を読み込み中...', en: 'Loading options...' },
  'save.tableList.title': { ja: 'テーブル一覧', en: 'Table List' },
  'save.tableList.description': { ja: '武器×属性のリンクから移動', en: 'Navigate by weapon and attribute' },
  'save.noTables': { ja: '該当するテーブルがありません', en: 'No matching tables' },
  'save.record.title': { ja: '抽選結果を保存', en: 'Save Draw Results' },
  'save.record.description': { ja: 'テーブルごとに記録してお気に入りを管理', en: 'Record per table and manage favorites' },
  'save.selectedTable': { ja: '選択中のテーブル', en: 'Selected Table' },
  'save.cursorPosition': { ja: 'カーソル位置: {value}', en: 'Cursor: {value}' },
  'save.entryCount': { ja: '記録数: {count}', en: 'Entries: {count}' },
  'save.visibility.title': { ja: '表示スキル設定', en: 'Visible Skills' },
  'save.visibility.note': {
    ja: '非表示は「{label}」で記録',
    en: 'Hidden items are recorded as "{label}"',
  },
  'save.seriesSkill': { ja: 'シリーズスキル', en: 'Series Skill' },
  'save.groupSkill': { ja: 'グループスキル', en: 'Group Skill' },
  'save.showAll': { ja: 'すべて表示', en: 'Show all' },
  'save.hideAll': { ja: 'すべて非表示', en: 'Hide all' },
  'save.addEntry': { ja: 'このテーブルに追記する', en: 'Add to this table' },
  'save.passedNote': {
    ja: '通過済みはデフォルト非表示。必要なら表示を切り替えます。',
    en: 'Passed entries are hidden by default. Toggle to show them.',
  },
  'save.showPassed': { ja: '通過済みを表示', en: 'Show passed' },
  'save.hidePassed': { ja: '通過済みを非表示', en: 'Hide passed' },
  'save.headers.series': { ja: 'シリーズ', en: 'Series' },
  'save.headers.group': { ja: 'グループ', en: 'Group' },
  'save.headers.favorite': { ja: 'お気に入り', en: 'Favorite' },
  'save.headers.createdAt': { ja: '登録日時', en: 'Created' },
  'cursor.title': { ja: 'カーソル {value}', en: 'Cursor {value}' },
  'cursor.description': {
    ja: 'NULL でない候補のみ表示。お気に入りを優先表示します。',
    en: 'Only non-NULL entries are shown. Favorites are prioritized.',
  },
  'cursor.candidates': { ja: '表示候補: {count} 件', en: 'Candidates: {count}' },
  'cursor.nullCount': { ja: 'NULL: {count} 件', en: 'NULL: {count}' },
  'cursor.noCandidates': { ja: 'このカーソルで表示できる候補がありません', en: 'No candidates for this cursor.' },
  'cursor.addedAt': { ja: '登録: {value}', en: 'Added: {value}' },
  'cursor.advanceButton': { ja: 'この結果でカーソルを進める', en: 'Advance with this result' },
  'cursor.advanceNote': {
    ja: 'カーソルを進めると、NULL なテーブルはシリーズ/グループともに「{label}」で埋めます。',
    en: 'When advancing, NULL tables are filled with "{label}" for both series and group.',
  },
  'verify.title': { ja: '確認', en: 'Review' },
  'verify.description': {
    ja: '保存済みの抽選結果を一覧で確認します。',
    en: 'Review saved draw results.',
  },
  'verify.export': { ja: 'エクスポート', en: 'Export' },
  'verify.import': { ja: 'インポート', en: 'Import' },
  'verify.importSuccess': { ja: 'インポートしました。', en: 'Imported.' },
  'verify.importError': { ja: 'インポートに失敗しました。', en: 'Import failed.' },
  'verify.invalidFile': { ja: '不正なファイル形式です。', en: 'Invalid file format.' },
  'verify.cursors': { ja: 'カーソル数: {count} 件', en: 'Cursors: {count}' },
  'verify.columns': { ja: '列数: {count} 件', en: 'Columns: {count}' },
  'verify.header.cursor': { ja: 'カーソル', en: 'Cursor' },
  'verify.favorite.add': { ja: 'お気に入りにする', en: 'Add favorite' },
  'verify.favorite.remove': { ja: 'お気に入りを外す', en: 'Remove favorite' },
  'filter.weapon': { ja: '武器', en: 'Weapon' },
  'filter.attribute': { ja: '属性', en: 'Attribute' },
  'error.loadOptions': { ja: '選択肢の読み込みに失敗しました。', en: 'Failed to load options.' },
} satisfies Dictionary

const LANGUAGE_STORAGE_KEY = 'mhwu.language.v1'

const replaceParams = (template: string, params?: Record<string, string | number>) => {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`))
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'ja'
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return stored === 'en' ? 'en' : 'ja'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  const t = useCallback<I18nContextValue['t']>(
    (key, params) => {
      const entry = dictionary[key]
      const template = entry ? entry[language] : String(key)
      return replaceParams(template, params)
    },
    [language],
  )

  const value = useMemo<I18nContextValue>(() => ({ language, setLanguage, t }), [language, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
