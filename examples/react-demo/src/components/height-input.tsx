import { useState } from 'react'
import { SegmentedControl, type SegmentedOption } from './segmented-control'
import { TextField } from './ui'
import {
  centimetersToInches,
  heightInchesToFeetAndInches,
  inchesToCentimeters,
} from '~/lib/height-units'

type HeightDisplayUnit = 'imperial' | 'metric'

const heightUnits: readonly SegmentedOption<HeightDisplayUnit>[] = [
  { value: 'imperial', label: 'ft + in' },
  { value: 'metric', label: 'cm' },
]

export function HeightInput({ heightInches, onHeightInchesChange, className }: {
  heightInches: number
  onHeightInchesChange(value: number): void
  className?: string
}) {
  const [displayUnit, setDisplayUnit] = useState<HeightDisplayUnit>('imperial')
  const imperial = heightInchesToFeetAndInches(heightInches)
  const centimeters = Math.round(inchesToCentimeters(heightInches) * 10) / 10

  return (
    <div aria-labelledby="height-input-label" className={className}>
      <div className="mb-3 flex items-center gap-4">
        <span className="text-sm font-semibold text-stone-700" id="height-input-label">Height</span>
        <SegmentedControl<HeightDisplayUnit>
          className="ml-auto w-44"
          label="Height units"
          name="height-units"
          onChange={setDisplayUnit}
          options={heightUnits}
          value={displayUnit}
        />
      </div>

      {displayUnit === 'imperial' ? (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            inputMode="numeric"
            label="Feet"
            max={8}
            min={3}
            onChange={(event) => {
              if (Number.isFinite(event.currentTarget.valueAsNumber)) {
                onHeightInchesChange(event.currentTarget.valueAsNumber * 12 + imperial.inches)
              }
            }}
            type="number"
            value={imperial.feet}
          />
          <TextField
            inputMode="numeric"
            label="Inches"
            max={11}
            min={0}
            onChange={(event) => {
              if (Number.isFinite(event.currentTarget.valueAsNumber)) {
                onHeightInchesChange(imperial.feet * 12 + event.currentTarget.valueAsNumber)
              }
            }}
            type="number"
            value={imperial.inches}
          />
        </div>
      ) : (
        <TextField
          inputMode="decimal"
          label="Centimeters"
          max={244}
          min={91}
          onChange={(event) => {
            if (Number.isFinite(event.currentTarget.valueAsNumber)) {
              onHeightInchesChange(centimetersToInches(event.currentTarget.valueAsNumber))
            }
          }}
          step="0.1"
          type="number"
          value={centimeters}
        />
      )}
    </div>
  )
}
