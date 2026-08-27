import { useState } from 'react'
import { SegmentedControl, type SegmentedOption } from './segmented-control'
import { TextField } from './ui'
import { kilogramsToPounds, poundsToKilograms } from '~/lib/weight-units'

type WeightDisplayUnit = 'pounds' | 'kilograms'

const weightUnits: readonly SegmentedOption<WeightDisplayUnit>[] = [
  { value: 'pounds', label: 'lb' },
  { value: 'kilograms', label: 'kg' },
]

export function WeightInput({ weightPounds, onWeightPoundsChange, className }: {
  weightPounds: number
  onWeightPoundsChange(value: number): void
  className?: string
}) {
  const [displayUnit, setDisplayUnit] = useState<WeightDisplayUnit>('pounds')
  const displayedWeight = displayUnit === 'pounds' ? weightPounds : poundsToKilograms(weightPounds)
  const roundedWeight = Math.round(displayedWeight * 10) / 10

  return (
    <div aria-labelledby="weight-input-label" className={className}>
      <div className="mb-3 flex items-center gap-4">
        <span className="text-sm font-semibold text-stone-700" id="weight-input-label">Weight</span>
        <SegmentedControl<WeightDisplayUnit>
          className="ml-auto w-44"
          label="Weight units"
          name="weight-units"
          onChange={setDisplayUnit}
          options={weightUnits}
          value={displayUnit}
        />
      </div>
      <TextField
        inputMode="decimal"
        label={displayUnit === 'pounds' ? 'Pounds' : 'Kilograms'}
        max={displayUnit === 'pounds' ? 700 : 317.5}
        min={displayUnit === 'pounds' ? 60 : 27.2}
        onChange={(event) => {
          if (Number.isFinite(event.currentTarget.valueAsNumber)) {
            const value = event.currentTarget.valueAsNumber
            onWeightPoundsChange(displayUnit === 'pounds' ? value : kilogramsToPounds(value))
          }
        }}
        step="0.1"
        type="number"
        value={roundedWeight}
      />
    </div>
  )
}
