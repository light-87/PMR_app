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
    produceBags45: z.number().int().min(0, 'Must be 0 or more').max(2000, 'Too many'),
    produceBags50: z.number().int().min(0, 'Must be 0 or more').max(2000, 'Too many'),
  })
  .refine((data) => data.produceBags45 + data.produceBags50 > 0, {
    message: 'Specify at least one bag (45kg or 50kg)',
    path: ['produceBags45'],
  })

type FormData = z.infer<typeof formSchema>

interface ProduceBatchFormProps {
  onClose: () => void
  currentBags45: number
  currentBags50: number
}

export function ProduceBatchForm({ onClose, currentBags45, currentBags50 }: ProduceBatchFormProps) {
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
      produceBags45: 0,
      produceBags50: 0,
    },
  })

  const batchCount = watch('batchCount') || 1
  const produceBags45 = watch('produceBags45') || 0
  const produceBags50 = watch('produceBags50') || 0

  const ureaFrom45 = produceBags45 * KG_PER_BAG.KG_45
  const ureaFrom50 = produceBags50 * KG_PER_BAG.KG_50
  const totalUreaConsumed = ureaFrom45 + ureaFrom50
  const totalLitersProduced = LITERS_PER_BATCH * batchCount
  const expectedKg = UREA_PER_BATCH_KG * batchCount
  const deviation = totalUreaConsumed - expectedKg
  const deviationPct = expectedKg === 0 ? 0 : Math.abs(deviation) / expectedKg
  const showDeviationWarning = totalUreaConsumed > 0 && deviationPct > 0.05

  const has45 = produceBags45 <= currentBags45
  const has50 = produceBags50 <= currentBags50
  const hasEnough = has45 && has50

  const onSubmit = async (data: FormData) => {
    if (!hasEnough) {
      setError(
        `Insufficient bags. Have ${currentBags45} × 45kg + ${currentBags50} × 50kg; need ${data.produceBags45} × 45kg + ${data.produceBags50} × 50kg`
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
          produceBags45: data.produceBags45,
          produceBags50: data.produceBags50,
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
            Enter batches produced and exact bags used. 1 batch typically uses {UREA_PER_BATCH_KG}kg Urea → {LITERS_PER_BATCH}L Free DEF.
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
              <Label htmlFor="produceBags45">45kg bags used</Label>
              <Input
                id="produceBags45"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                {...register('produceBags45', { valueAsNumber: true })}
                className={!has45 ? 'border-red-500' : ''}
              />
              <p className={`text-xs mt-1 ${has45 ? 'text-muted-foreground' : 'text-red-600 font-medium'}`}>
                On hand: {currentBags45} bag{currentBags45 !== 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <Label htmlFor="produceBags50">50kg bags used</Label>
              <Input
                id="produceBags50"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                {...register('produceBags50', { valueAsNumber: true })}
                className={!has50 ? 'border-red-500' : ''}
              />
              <p className={`text-xs mt-1 ${has50 ? 'text-muted-foreground' : 'text-red-600 font-medium'}`}>
                On hand: {currentBags50} bag{currentBags50 !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {errors.produceBags45 && (
            <p className="text-sm text-red-500 -mt-2">{errors.produceBags45.message}</p>
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
                  {hasEnough ? 'Ready to Produce' : 'Insufficient Bags'}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={hasEnough ? 'text-green-700' : 'text-red-700'}>
                    Urea consumed: <span className="font-semibold">{totalUreaConsumed} kg</span>
                    <span className="text-xs ml-1">
                      ({produceBags45} × 45kg + {produceBags50} × 50kg)
                    </span>
                  </p>
                  {hasEnough && (
                    <p className="text-green-600">
                      Remaining after: <span className="font-semibold">{currentBags45 - produceBags45} × 45kg + {currentBags50 - produceBags50} × 50kg</span>
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
