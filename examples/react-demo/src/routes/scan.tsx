import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Barcode, Camera, ImagePlus, Link as LinkIcon, MessageSquareText, ScanLine, Utensils } from 'lucide-react'
import { useRef, useState } from 'react'
import { analyzeFoodDescription, analyzeFoodPhoto, searchFoodCatalog } from '~/api/january.functions'
import { BarcodeCamera } from '~/components/barcode-camera'
import { NetworkImage } from '~/components/network-image'
import { ScanResult } from '~/components/scan-result'
import { useUserSession } from '~/components/user-session'
import { VoiceSearchInput } from '~/components/search/voice-search-input'
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
import { preparePhotoScanImage } from '~/lib/photo-scan-image'

const sampleImage = 'https://friendlysrestaurants.com/assets/live/img/production/detail/menu/lunch-dinner_999-combohs_all-american-burger-fries.jpg'

export const Route = createFileRoute('/scan')({
  component: ScanPage,
})

function ScanPage() {
  const session = useUserSession()
  const navigate = Route.useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [method, setMethod] = useState<'photo' | 'description' | 'upc'>('photo')
  const [image, setImage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [upc, setUpc] = useState('')
  const scan = useMutation({
    mutationFn: () => analyzeFoodPhoto({ data: {
      image,
      ...(session.endUserId ? { endUserId: session.endUserId } : {}),
    } }),
  })
  const descriptionScan = useMutation({
    mutationFn: () => analyzeFoodDescription({ data: {
      description,
      ...(session.endUserId ? { endUserId: session.endUserId } : {}),
    } }),
  })
  const barcodeLookup = useMutation({
    mutationFn: () => searchFoodCatalog({ data: {
      query: upc.trim(),
      mode: 'barcode',
      ...(session.endUserId ? { endUserId: session.endUserId } : {}),
    } }),
  })

  async function chooseFile(file: File | undefined) {
    if (!file) return
    const preparedImage = await preparePhotoScanImage(file)
    setImage(preparedImage)
    setImageUrl('')
    scan.reset()
  }

  function useUrl() {
    const value = imageUrl.trim()
    if (!value) return
    setImage(value)
    scan.reset()
  }

  function chooseMethod(nextMethod: 'photo' | 'description' | 'upc') {
    setMethod(nextMethod)
  }

  function resetPhotoAnalysis() {
    setImage('')
    setImageUrl('')
    scan.reset()
  }

  function resetDescriptionAnalysis() {
    setDescription('')
    descriptionScan.reset()
  }

  return (
    <Page>
      <PageHeader
        description={method === 'photo'
          ? 'Provide a public image URL or upload a file. The image is analyzed through the SDK without exposing your API key.'
          : method === 'description'
            ? 'Type or dictate the complete meal. January analyzes the foods, quantities, and combined nutrition as one meal.'
            : 'Enter the UPC printed beneath a packaged food barcode to look it up through the January food database.'}
        eyebrow="Meal analysis"
        title={method === 'photo' ? 'Scan a meal photo.' : method === 'description' ? 'Describe what was eaten.' : 'Look up a packaged food.'}
      />

      <div aria-label="Scan method" className="mt-8 grid max-w-2xl grid-cols-3 rounded-2xl bg-[#e9e2d4] p-1.5" role="tablist">
        <button
          aria-selected={method === 'photo'}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${method === 'photo' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:bg-white/70'}`}
          onClick={() => chooseMethod('photo')}
          role="tab"
          type="button"
        >
          <Camera aria-hidden="true" className="size-4" /> Meal photo
        </button>
        <button
          aria-selected={method === 'description'}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${method === 'description' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:bg-white/70'}`}
          onClick={() => chooseMethod('description')}
          role="tab"
          type="button"
        >
          <MessageSquareText aria-hidden="true" className="size-4" /> Describe meal
        </button>
        <button
          aria-selected={method === 'upc'}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${method === 'upc' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:bg-white/70'}`}
          onClick={() => chooseMethod('upc')}
          role="tab"
          type="button"
        >
          <Barcode aria-hidden="true" className="size-4" /> UPC code
        </button>
      </div>

      {method === 'photo' ? <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div>
          <Card className="overflow-hidden">
            <div className="scan-pattern relative grid h-[clamp(280px,55vw,520px)] w-full place-items-center overflow-hidden p-8">
              {image ? (
                <img alt="Meal selected for analysis" className="absolute inset-0 size-full object-cover object-center" src={image} />
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
                capture="environment"
                className="sr-only"
                onChange={(event) => chooseFile(event.target.files?.[0])}
                ref={cameraInput}
                type="file"
              />
              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) => chooseFile(event.target.files?.[0])}
                ref={fileInput}
                type="file"
              />
              <Button onClick={() => cameraInput.current?.click()} type="button">
                <Camera aria-hidden="true" className="size-5" />
                Take photo
              </Button>
              <SecondaryButton onClick={() => fileInput.current?.click()} type="button">
                <ImagePlus aria-hidden="true" className="size-5" />
                Choose from library
              </SecondaryButton>
              <SecondaryButton className="sm:col-span-2" onClick={() => { setImage(sampleImage); setImageUrl(sampleImage); scan.reset() }} type="button">
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
            <ScanResult onAnalyzeAnother={resetPhotoAnalysis} result={scan.data} />
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
      </div> : method === 'description' ? (
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
          <Card className="h-fit p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-stone-950 text-white">
              <MessageSquareText aria-hidden="true" className="size-6" />
            </div>
            <h2 className="mt-6 font-serif text-4xl">Describe the whole meal</h2>
            <p className="mt-3 text-pretty leading-7 text-stone-600">Include quantities, drinks, toppings, and sides. Use the microphone to dictate instead of typing.</p>
            <div className="mt-7">
              <label className="mb-2 block text-sm font-semibold text-stone-700" htmlFor="meal-description">What did you eat?</label>
              <VoiceSearchInput
                id="meal-description"
                onChange={(value) => {
                  setDescription(value)
                  descriptionScan.reset()
                }}
                placeholder="e.g. Two tacos and a Diet Coke"
                value={description}
              />
            </div>
            <Button
              busy={descriptionScan.isPending}
              className="mt-4 w-full"
              disabled={!description.trim() || descriptionScan.isPending}
              onClick={() => descriptionScan.mutate()}
              type="button"
            >
              Analyze meal description
            </Button>
          </Card>

          <section aria-live="polite">
            <div className="mb-4">
              <SectionLabel>Analysis</SectionLabel>
              <h2 className="mt-2 text-balance font-serif text-4xl">What January understood</h2>
            </div>
            {descriptionScan.isError ? (
              <ErrorMessage error={descriptionScan.error} />
            ) : descriptionScan.data ? (
              <ScanResult onAnalyzeAnother={resetDescriptionAnalysis} result={descriptionScan.data} />
            ) : (
              <EmptyState description="Type or dictate a complete meal description, then analyze it through the SDK." icon={<MessageSquareText aria-hidden="true" className="size-6" />} title="Waiting for a meal description" />
            )}
          </section>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
          <Card className="h-fit p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-stone-950 text-white">
              <Barcode aria-hidden="true" className="size-6" />
            </div>
            <h2 className="mt-6 font-serif text-4xl">Enter the UPC</h2>
            <p className="mt-3 leading-7 text-stone-600">Use the digits printed beneath the barcode. Dashes and spaces are not required.</p>
            <div className="mt-6"><BarcodeCamera onDetected={(value) => { setUpc(value); barcodeLookup.reset() }} /></div>
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
                      search: { q: food.name ?? '', upc },
                    })}
                    type="button"
                  >
                    <NetworkImage alt="" className="size-14 shrink-0 rounded-2xl" fallback={<Utensils aria-hidden="true" className="size-5 text-[var(--app-positive)]" />} src={food.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-bold">{food.name ?? 'Unnamed food'}</div>
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
