import { useEffect, useState } from 'react'

type SkillOptionsState = {
  groupOptions: string[]
  seriesOptions: string[]
  isLoading: boolean
  error: string
}

export function useSkillOptions(): SkillOptionsState {
  const [state, setState] = useState<SkillOptionsState>({
    groupOptions: [],
    seriesOptions: [],
    isLoading: true,
    error: '',
  })

  useEffect(() => {
    let active = true
    const loadOptions = async () => {
      try {
        const [groupRes, seriesRes] = await Promise.all([
          fetch('/data/group_skills.json'),
          fetch('/data/series_skills.json'),
        ])
        if (!groupRes.ok || !seriesRes.ok) {
          throw new Error('Failed to load')
        }
        const [groupData, seriesData] = await Promise.all([groupRes.json(), seriesRes.json()])
        if (!active) return
        setState({
          groupOptions: groupData,
          seriesOptions: seriesData,
          isLoading: false,
          error: '',
        })
      } catch {
        if (!active) return
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: '選択肢の読み込みに失敗しました。',
        }))
      }
    }
    loadOptions()
    return () => {
      active = false
    }
  }, [])

  return state
}
