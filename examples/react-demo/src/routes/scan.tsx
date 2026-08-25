import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Barcode, Camera, ImagePlus, Link as LinkIcon, ScanLine, Utensils } from 'lucide-react'
import { useRef, useState } from 'react'
import { getDemoConfiguration, scanMeal, searchFoodCatalog } from '~/api/january.functions'
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Page,
  PageHeader,
  SectionLabel,
  SecondaryButton,
  TextField,
} from '~/components/ui'
import { formatNumber } from '~/lib/utils'

const sampleImage = 'https://friendlysrestaurants.com/assets/live/img/production/detail/menu/lunch-dinner_999-combohs_all-american-burger-fries.jpg'

export const Route = createFileRoute('/scan')({
  loader: () => getDemoConfiguration(),
  component: ScanPage,
})

function ScanPage() {
  const configuration = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [method, setMethod] = useState<'photo' | 'upc'>('photo')
  const [image, setImage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [upc, setUpc] = useState('')
  const scan = useMutation({
    mutationFn: () => scanMeal({ data: {
      image,
      ...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {}),
    } }),
  })
  const barcodeLookup = useMutation({
    mutationFn: () => searchFoodCatalog({ data: {
      query: upc.trim(),
      mode: 'barcode',
      ...(configuration.defaultEndUserId ? { endUserId: configuration.defaultEndUserId } : {}),
    } }),
  })

  function chooseFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result)
        setImageUrl('')
        scan.reset()
      }
    })
    reader.readAsDataURL(file)
  }

  function useUrl() {
    const value = imageUrl.trim()
    if (!value) return
    setImage(value)
    scan.reset()
  }

  return (
    <Page>
      <PageHeader
        description={method === 'photo'
          ? 'Provide a public image URL or upload a file. The image is analyzed through the SDK without exposing your API key.'
          : 'Enter the UPC printed beneath a packaged food barcode to look it up through the January food database.'}
        eyebrow="Visual nutrition"
        title={method === 'photo' ? 'Scan a meal, not a label.' : 'Look up a packaged food.'}
      />

      <div aria-label="Scan method" className="mt-8 grid max-w-xl grid-cols-2 rounded-2xl bg-[#e9e2d4] p-1.5" role="tablist">
        <button
          aria-selected={method === 'photo'}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${method === 'photo' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:bg-white/70'}`}
          onClick={() => setMethod('photo')}
          role="tab"
          type="button"
        >
          <Camera aria-hidden="true" className="size-4" /> Meal photo
        </button>
        <button
          aria-selected={method === 'upc'}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${method === 'upc' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:bg-white/70'}`}
          onClick={() => setMethod('upc')}
          role="tab"
          type="button"
        >
          <Barcode aria-hidden="true" className="size-4" /> UPC code
        </button>
      </div>

      {method === 'photo' ? <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div>
          <Card className="overflow-hidden">
            <div className="scan-pattern relative grid min-h-[360px] place-items-center overflow-hidden p-8 sm:min-h-[460px]">
              {image ? (
                <img alt="Meal selected for analysis" className="absolute inset-0 size-full object-cover" src={image} />
              ) : (
                <div className="mx-auto flex max-w-md flex-col items-center text-center">
                  <div className="grid size-16 place-items-center rounded-2xl border border-stone-300 bg-white text-stone-700 shadow-sm">
                    <Camera aria-hidden="true" className="size-7" />
                  </div>
                  <h2 className="mt-6 text-balance font-serif text-4xl">Add a clear photo of the whole meal</h2>
                  <p className="mt-4 text-pretty leading-7 text-stone-600">January identifies foods, servings, and nutrition—then estimates their glucose impact.</p>
                </div>
              )}
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) => chooseFile(event.target.files?.[0])}
                ref={fileInput}
                type="file"
              />
              <Button onClick={() => fileInput.current?.click()} type="button">
                <ImagePlus aria-hidden="true" className="size-5" />
                Choose photo
              </Button>
              <SecondaryButton onClick={() => { setImage(sampleImage); setImageUrl(sampleImage); scan.reset() }} type="button">
                <Utensils aria-hidden="true" className="size-5" />
                Use sample meal
              </SecondaryButton>
            </div>
          </Card>

          <Card className="mt-5 p-5 sm:p-6">
            <TextField label="Or use a public image URL" onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/meal.jpg" type="url" value={imageUrl} />
            <SecondaryButton className="mt-3 w-full sm:w-auto" disabled={!imageUrl.trim()} onClick={useUrl} type="button">
              <LinkIcon aria-hidden="true" className="size-4" />
              Use image URL
            </SecondaryButton>
          </Card>
        </div>

        <section aria-live="polite">
          <div className="mb-4">
            <SectionLabel>Analysis</SectionLabel>
            <h2 className="mt-2 text-balance font-serif text-4xl">What January sees</h2>
          </div>
          {!image ? (
            <EmptyState description="Choose a photo or load the sample meal, then analyze it through the SDK." icon={<ScanLine aria-hidden="true" className="size-6" />} title="Waiting for a meal" />
          ) : scan.isError ? (
            <ErrorMessage error={scan.error} />
          ) : scan.data ? (
            <ScanResult result={scan.data} />
          ) : (
            <Card className="p-6">
              <h3 className="text-balance font-serif text-3xl">Photo ready</h3>
              <p className="mt-3 text-pretty leading-7 text-stone-600">Send this image to January for food detection, serving estimates, and complete nutrition.</p>
              <Button busy={scan.isPending} className="mt-6 w-full" onClick={() => scan.mutate()} type="button">
                Analyze meal
              </Button>
            </Card>
          )}
        </section>
      </div> : (
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
          <Card className="h-fit p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-stone-950 text-white">
              <Barcode aria-hidden="true" className="size-6" />
            </div>
            <h2 className="mt-6 font-serif text-4xl">Enter the UPC</h2>
            <p className="mt-3 leading-7 text-stone-600">Use the digits printed beneath the barcode. Dashes and spaces are not required.</p>
            <div className="mt-7">
              <TextField
                inputMode="numeric"
                label="UPC code"
                onChange={(event) => {
                  setUpc(event.target.value.replace(/\D/g, ''))
                  barcodeLookup.reset()
                }}
                placeholder="e.g. 012345678905"
                value={upc}
              />
            </div>
            <Button
              busy={barcodeLookup.isPending}
              className="mt-4 w-full"
              disabled={!upc.trim() || barcodeLookup.isPending}
              onClick={() => barcodeLookup.mutate()}
              type="button"
            >
              Look up UPC
            </Button>
          </Card>

          <section aria-live="polite">
            <div className="mb-4">
              <SectionLabel>Food database</SectionLabel>
              <h2 className="mt-2 text-balance font-serif text-4xl">Matching food</h2>
            </div>
            {barcodeLookup.isError ? <ErrorMessage error={barcodeLookup.error} /> : barcodeLookup.data?.items?.length ? (
              <Card className="overflow-hidden">
                {barcodeLookup.data.items.map((food) => (
                  <button
                    className="flex min-h-24 w-full items-center gap-4 border-b border-stone-200 p-5 text-left last:border-0 hover:bg-stone-50"
                    key={food.id}
                    onClick={() => navigate({
                      to: '/food/$foodId',
                      params: { foodId: String(food.id) },
                      search: { q: food.name, upc },
                    })}
                    type="button"
                  >
                    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#eee8dc]">
                      {food.photoUrl ? <img alt="" className="size-full object-cover" src={food.photoUrl} /> : <Utensils aria-hidden="true" className="size-5 text-[#557653]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-bold">{food.name}</div>
                      <div className="mt-1 text-sm text-stone-500">{[food.brandName, food.calories == null ? null : `${formatNumber(food.calories)} cal`, food.servings[0]?.unit].filter(Boolean).join(' · ')}</div>
                    </div>
                    <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-stone-400" />
                  </button>
                ))}
              </Card>
            ) : barcodeLookup.data ? (
              <EmptyState description="No food matched that UPC. Check the digits and try again." icon={<Barcode aria-hidden="true" className="size-6" />} title="No match found" />
            ) : (
              <EmptyState description="Enter a UPC to retrieve its food, servings, and nutrition through the SDK." icon={<Barcode aria-hidden="true" className="size-6" />} title="Waiting for a UPC" />
            )}
          </section>
        </div>
      )}
    </Page>
  )
}

function ScanResult({ result }: { result: Awaited<ReturnType<typeof scanMeal>> }) {
  const nutrients = result.totalNutrients
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <SectionLabel>Meal</SectionLabel>
        <h3 className="mt-3 text-balance font-serif text-4xl">{result.mealName ?? 'Detected meal'}</h3>
        {nutrients && (
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200">
            {[
              ['Calories', nutrients.calories?.value, 'cal'],
              ['Protein', nutrients.protein?.value, 'g'],
              ['Carbs', nutrients.carbohydrates?.value, 'g'],
              ['Fat', nutrients.totalFat?.value, 'g'],
            ].map(([label, value, unit]) => (
              <div className="bg-white p-4" key={String(label)}>
                <div className="text-xs font-bold uppercase text-stone-500">{label}</div>
                <div className="data-number mt-2 text-2xl font-bold">{formatNumber(value as number | undefined)} <span className="text-sm font-medium text-stone-500">{unit}</span></div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="overflow-hidden">
        {(result.detections ?? []).map((detection, index) => (
          <div className="flex items-center gap-4 border-b border-stone-200 p-5 last:border-0" key={`${detection.food.id ?? 'detected'}-${index}`}>
            <div className="grid size-12 place-items-center rounded-xl bg-[#eee8dc]"><Utensils aria-hidden="true" className="size-5 text-stone-600" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{detection.food.name}</div>
              <div className="mt-1 text-sm text-stone-500">{detection.food.servings?.[0]?.unit ?? 'Serving estimated'}{detection.confidenceScore ? ` · ${detection.confidenceScore} confidence` : ''}</div>
            </div>
          </div>
        ))}
      </Card>
      <Button className="w-full" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} type="button">Analyze another photo</Button>
    </div>
  )
}
