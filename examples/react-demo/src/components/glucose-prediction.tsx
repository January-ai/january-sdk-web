import type { GlucosePrediction } from '@januaryai/partner-sdk'
import { SectionLabel } from './ui'

export function GlucoseChart({ result }: { result: GlucosePrediction }) {
  const points = result.prediction
  const width = 800
  const height = 320
  const insetY = 38
  const minMinute = points[0]?.minutes ?? 0
  const maxMinute = points.at(-1)?.minutes ?? 120
  const minValue = Math.min(result.chart.min, ...points.map((point) => point.value))
  const maxValue = Math.max(result.chart.max, ...points.map((point) => point.value))
  const x = (minutes: number) => ((minutes - minMinute) / Math.max(1, maxMinute - minMinute)) * width
  const y = (value: number) => height - insetY - ((value - minValue) / Math.max(1, maxValue - minValue)) * (height - insetY * 2)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.minutes)} ${y(point.value)}`).join(' ')
  const peak = points.reduce((best, point) => point.value > best.value ? point : best, points[0] ?? { minutes: 0, value: 0 })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <SectionLabel>Predicted response</SectionLabel>
        <span className="text-sm font-bold text-stone-500">mg/dL</span>
      </div>
      <svg aria-label="Predicted glucose response over time" className="h-auto w-full overflow-visible" role="img" viewBox={`0 0 ${width} ${height + 38}`}>
        <rect fill="#eef2e7" height={height - insetY * 2} width={width} x="0" y={insetY} />
        {[0, 40, 80, 120].map((minute) => (
          <g key={minute}>
            <line stroke="#d6d3d1" strokeWidth="1" x1={x(minute)} x2={x(minute)} y1={insetY} y2={height - insetY} />
            <text fill="#78716c" fontFamily="DM Sans, sans-serif" fontSize="16" textAnchor={minute === 0 ? 'start' : minute === 120 ? 'end' : 'middle'} x={x(minute)} y={height + 20}>{minute}</text>
          </g>
        ))}
        <path d={`${path} L ${width} ${height - insetY} L 0 ${height - insetY} Z`} fill="#b45d38" fillOpacity="0.12" />
        <path d={path} fill="none" stroke="#a8502f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        {points[0] && <circle cx={x(points[0].minutes)} cy={y(points[0].value)} fill="#f5c842" r="9" stroke="#1c1917" strokeWidth="4" />}
        <circle cx={x(peak.minutes)} cy={y(peak.value)} fill="white" r="8" stroke="#1c1917" strokeWidth="4" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-stone-600">
        <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-[#a8502f]" /> Prediction</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-full border-2 border-stone-950 bg-[#f5c842]" /> Meal</span>
        <span className="flex items-center gap-2"><span className="size-3 bg-[#eef2e7]" /> Target band</span>
      </div>
    </div>
  )
}

export function friendlyImpact(value: string) {
  return `${value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())} impact`
}

export function impactClass(value: string) {
  if (value.toLowerCase().includes('high')) return 'bg-red-100 text-red-900'
  if (value.toLowerCase().includes('medium')) return 'bg-amber-100 text-amber-950'
  return 'bg-emerald-100 text-emerald-950'
}
