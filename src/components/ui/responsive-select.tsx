import { Select } from './select'
import { cn } from '../../lib/utils'

export type ResponsiveSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type ResponsiveSelectProps = {
  value: string
  options: ResponsiveSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  name: string
  placeholder?: string
  gridClassName?: string
  selectClassName?: string
  radioClassName?: string
}

export function ResponsiveSelect({
  value,
  options,
  onChange,
  disabled,
  name,
  placeholder,
  gridClassName,
  selectClassName,
  radioClassName,
}: ResponsiveSelectProps) {
  return (
    <>
      <div className="sm:hidden">
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={selectClassName}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div
        className={cn(
          'hidden gap-2 sm:grid',
          gridClassName ?? 'sm:grid-cols-2 lg:grid-cols-3',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {options.map((option) => (
          <label key={option.value} className={cn('flex', option.disabled && 'opacity-60')}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled || option.disabled}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex w-full items-center justify-center rounded-lg border border-border/60 bg-background px-3 py-2 text-xs transition-colors hover:border-border peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground',
                radioClassName,
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </>
  )
}
