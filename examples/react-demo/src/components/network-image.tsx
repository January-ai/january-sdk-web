import { ImageOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '~/lib/utils'

export function NetworkImage({ src, alt, className, imageClassName, fallback }: { src?: string | null; alt: string; className?: string; imageClassName?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return (
    <div className={cn('grid overflow-hidden bg-[var(--app-control)]', className)}>
      {src && !failed ? <img alt={alt} className={cn('size-full object-cover', imageClassName)} onError={() => setFailed(true)} src={src} /> : <div className="grid size-full place-items-center text-stone-500">{fallback ?? <ImageOff aria-hidden="true" className="size-5" />}</div>}
    </div>
  )
}
