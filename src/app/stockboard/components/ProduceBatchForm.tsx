'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UREA_PER_BATCH_KG, LITERS_PER_BATCH, KG_PER_BAG } from '@/types'
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const formSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    batchCount: z.number().min(1, 'Must produce at least 1 batch').max(100, 'Maximum 100 batches at once'),
    produceKg45: z.number().min(0, 'Must be 0 or more').max(100000, 'Too much'),
    produceKg50: z.number().min(0, 'Must be 0 or more').max(100000, 'Too much'),
  })
  .refine((data) => data.produceKg45 + data.produceKg50 > 0, {
    message: 'Enter the Urea kg used (45kg-type and/or 50kg-type)',
    path: ['produceKg45'],
  })

type FormData = z.infer<typeof formSchema>

interface ProduceBatchFormProps {
  onClose: () => void
  currentKg45: number
  currentKg50: number
}

// Format raw kg as "X × NNkg + Mkg open (totalkg)"
function describeStock(kg: number, bagKg: number): string {
  const bags = Math.floor(kg / bagKg)
  const remainder = Math.round((kg - bags * bagKg) * 10) / 10
  const parts = [`${bags} × ${bagKg}kg`]
  if (remainder > 0) parts.push(`${remainder}kg open`)
  return `${parts.join(' + ')} (${Math.round(kg * 10) / 10}kg)`
}

export function ProduceBatchForm({ onClose, currentKg45, currentKg50 }: ProduceBatchFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      batchCount: 1,
      produceKg45: 0,
      produceKg50: 0,
    },
  })

  const batchCount = watch('batchCount') || 1
  const produceKg45 = watch('produceKg45') || 0
  const produceKg50 = watch('produceKg50') || 0

  const ureaFrom45 = produceKg45
  const ureaFrom50 = produceKg50
  const totalUreaConsumed = ureaFrom45 + ureaFrom50
  const totalLitersProduced = LITERS_PER_BATCH * batchCount
  const expectedKg = UREA_PER_BATCH_KG * batchCount
  const deviation = totalUreaConsumed - expectedKg
  const deviationPct = expectedKg === 0 ? 0 : Math.abs(deviation) / expectedKg
  const showDeviationWarning = totalUreaConsumed > 0 && deviationPct > 0.05

  const has45 = produceKg45 <= currentKg45
  const has50 = produceKg50 <= currentKg50
  const hasEnough = has45 && has50

  const onSubmit = async (data: FormData) => {
    if (!hasEnough) {
      setError(
        `Insufficient Urea. Have ${currentKg45}kg of 45kg-type + ${currentKg50}kg of 50kg-type; need ${data.produceKg45}kg + ${data.produceKg50}kg`
      )
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data.date,
          type: 'PRODUCE_BATCH',
          category: 'UREA',
          batchCount: data.batchCount,
          produceKg45: data.produceKg45,
          produceKg50: data.produceKg50,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onClose()
      } else {
        setError(result.message || 'Failed to produce batch')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Produce Batch</DialogTitle>
          <DialogDescription>
            Enter batches produced and the exact Urea kg used. 1 batch typically uses {UREA_PER_BATCH_KG}kg Urea → {LITERS_PER_BATCH}L Free DEF. Leftover kg stays in the open bag for next time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="batchCount">Number of Batches</Label>
            <Input
              id="batchCount"
              type="number"
              min="1"
              max="100"
              {...register('batchCount', { valueAsNumber: true })}
            />
            {errors.batchCount && (
              <p className="text-sm text-red-500 mt-1">{errors.batchCount.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="produceKg45">Urea used — 45kg-type (kg)</Label>
              <Input
                id="produceKg45"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                {...register('produceKg45', { valueAsNumber: true })}
                className={!has45 ? 'border-red-500' : ''}
              />
              <p className={`text-xs mt-1 ${has45 ? 'text-muted-foreground' : 'text-red-600 font-medium'}`}>
                On hand: {describeStock(currentKg45, KG_PER_BAG.KG_45)}
              </p>
            </div>

            <div>
              <Label htmlFor="produceKg50">Urea used — 50kg-type (kg)</Label>
              <Input
                id="produceKg50"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                {...register('produceKg50', { valueAsNumber: true })}
                className={!has50 ? 'border-red-500' : ''}
              />
              <p className={`text-xs mt-1 ${has50 ? 'text-muted-foreground' : 'text-red-600 font-medium'}`}>
                On hand: {describeStock(currentKg50, KG_PER_BAG.KG_50)}
              </p>
            </div>
          </div>

          {errors.produceKg45 && (
            <p className="text-sm text-red-500 -mt-2">{errors.produceKg45.message}</p>
          )}

          {/* Stock Check */}
          <div className={`p-4 rounded-lg border ${hasEnough ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start">
              {hasEnough ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${hasEnough ? 'text-green-900' : 'text-red-900'}`}>
                  {hasEnough ? 'Ready to Produce' : 'Insufficient Urea'}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={hasEnough ? 'text-green-700' : 'text-red-700'}>
                    Urea consumed: <span className="font-semibold">{totalUreaConsumed} kg</span>
                    <span className="text-xs ml-1">
                      ({ureaFrom45}kg 45kg-type + {ureaFrom50}kg 50kg-type)
                    </span>
                  </p>
                  {hasEnough && (
                    <p className="text-green-600">
                      Remaining after: <span className="font-semibold">{describeStock(currentKg45 - produceKg45, KG_PER_BAG.KG_45)} · {describeStock(currentKg50 - produceKg50, KG_PER_BAG.KG_50)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showDeviationWarning && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Heads up: typical {batchCount} batch{batchCount !== 1 ? 'es' : ''} uses {expectedKg}kg, you entered {totalUreaConsumed}kg ({deviation > 0 ? '+' : ''}{deviation}kg). Confirm this is intentional.
              </AlertDescription>
            </Alert>
          )}

          {/* Production Summary */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="font-medium text-purple-900 mb-2">Production Output ({batchCount} batch{batchCount !== 1 ? 'es' : ''})</p>
            <div className="space-y-1 text-sm text-purple-700">
              <p>• Free DEF: <span className="font-semibold">+{totalLitersProduced.toLocaleString()} L</span></p>
              <p>• Finished Goods: <span className="font-semibold">+{totalLitersProduced.toLocaleString()} L</span></p>
            </div>
          </div>

          <div>
            <Label htmlFor="date">Production Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasEnough || totalUreaConsumed === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Producing...' : 'Produce Batch'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
