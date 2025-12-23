import { useState } from 'react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { CursorView } from './components/cursor/CursorView'
import { SaveView } from './components/save/SaveView'
import { useSkillOptions } from './hooks/useSkillOptions'
import { useTableState } from './hooks/useTableState'

function App() {
  const [activeView, setActiveView] = useState<'save' | 'cursor'>('save')
  const { groupOptions, seriesOptions, isLoading, error } = useSkillOptions()
  const { tables, cursorByAttribute, addEntry, toggleFavorite, advanceCursor } = useTableState()

  return (
    <div className="min-h-screen">
      <div className="relative">
        <div className="pointer-events-none absolute -top-32 right-10 h-72 w-72 rounded-full bg-[rgba(96,132,173,0.22)] blur-3xl animate-float" />
        <div className="pointer-events-none absolute bottom-[-120px] left-[-80px] h-80 w-80 rounded-full bg-[rgba(52,78,100,0.2)] blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
          <header className="mb-8 flex flex-col gap-4 sm:mb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant={activeView === 'save' ? 'default' : 'outline'}
                onClick={() => setActiveView('save')}
                className="w-full sm:w-auto"
              >
                保存画面
              </Button>
              <Button
                variant={activeView === 'cursor' ? 'default' : 'outline'}
                onClick={() => setActiveView('cursor')}
                className="w-full sm:w-auto"
              >
                カーソルを進める画面
              </Button>
              <Badge variant="outline" className="w-fit sm:ml-auto">
                ローカル保存
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold heading-serif sm:text-4xl">
                巨戟アーティア スキル抽選メモ
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                武器×属性×激化タイプのテーブルを管理し、属性ごとにカーソルを進めて最適な抽選結果を比較します。
              </p>
            </div>
          </header>

          {activeView === 'save' ? (
            <SaveView
              tables={tables}
              cursorByAttribute={cursorByAttribute}
              groupOptions={groupOptions}
              seriesOptions={seriesOptions}
              isLoadingOptions={isLoading}
              optionsError={error}
              onAddEntry={addEntry}
              onToggleFavorite={toggleFavorite}
            />
          ) : (
            <CursorView
              tables={tables}
              cursorByAttribute={cursorByAttribute}
              onAdvanceCursor={advanceCursor}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
