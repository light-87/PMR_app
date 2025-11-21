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
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
})

type FormData = z.infer<typeof formSchema>

interface ProduceBatchFormProps {
  onClose: () => void
  currentUreaStock: number
}

export function ProduceBatchForm({ onClose, currentUreaStock }: ProduceBatchFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  })

  const hasEnoughUrea = currentUreaStock >= UREA_PER_BATCH_KG
  const ureaBags = UREA_PER_BATCH_KG / KG_PER_BAG

  const onSubmit = async (data: FormData) => {
    if (!hasEnoughUrea) {
      setError(`Insufficient Urea. Need ${UREA_PER_BATCH_KG}kg, have ${currentUreaStock.toFixed(1)}kg`)
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
          quantity: -UREA_PER_BATCH_KG,
          unit: 'KG',
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
            Create a new production batch: {UREA_PER_BATCH_KG}kg Urea → {LITERS_PER_BATCH}L Free DEF
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stock Check */}
          <div className={`p-4 rounded-lg border ${hasEnoughUrea ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start">
              {hasEnoughUrea ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${hasEnoughUrea ? 'text-green-900' : 'text-red-900'}`}>
                  {hasEnoughUrea ? 'Ready to Produce' : 'Insufficient Urea'}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={hasEnoughUrea ? 'text-green-700' : 'text-red-700'}>
                    Current Urea: <span className="font-semibold">{currentUreaStock.toFixed(1)} kg</span>
                  </p>
                  <p className={hasEnoughUrea ? 'text-green-700' : 'text-red-700'}>
                    Required: <span className="font-semibold">{UREA_PER_BATCH_KG} kg ({ureaBags} bags)</span>
                  </p>
                  {hasEnoughUrea && (
                    <p className="text-green-600">
                      After production: <span className="font-semibold">{(currentUreaStock - UREA_PER_BATCH_KG).toFixed(1)} kg</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Production Summary */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="font-medium text-purple-900 mb-2">Production Output</p>
            <div className="space-y-1 text-sm text-purple-700">
              <p>• Free DEF: <span className="font-semibold">+{LITERS_PER_BATCH} L</span></p>
              <p>• Finished Goods: <span className="font-semibold">+{LITERS_PER_BATCH} L</span></p>
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
              disabled={loading || !hasEnoughUrea}
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
