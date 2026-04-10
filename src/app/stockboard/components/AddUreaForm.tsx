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
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { KG_PER_BAG } from '@/types'
import { AlertCircle } from 'lucide-react'

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  quantityKg: z.number()
    .positive('Quantity must be positive')
    .max(50000, 'Quantity exceeds typical range (max 50,000 kg). Please verify!'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddUreaFormProps {
  onClose: () => void
}

export function AddUreaForm({ onClose }: AddUreaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      quantityKg: 0,
      description: '',
    },
  })

  const quantityKg = watch('quantityKg')
  const bags = quantityKg ? (quantityKg / KG_PER_BAG).toFixed(2) : '0.00'
  const isHighQuantity = quantityKg > 20000
  const isExtremeQuantity = quantityKg > 50000

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data.date,
          type: 'ADD_UREA',
          category: 'UREA',
          quantity: data.quantityKg,
          unit: 'KG',
          description: data.description || `Added ${data.quantityKg}kg Urea`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onClose()
      } else {
        setError(result.message || 'Failed to add Urea')
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
          <DialogTitle>Add Urea Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="quantityKg">
              Quantity (kg)
              {isHighQuantity && <span className="text-red-600 ml-1">⚠️ HIGH QUANTITY</span>}
            </Label>
            <Input
              id="quantityKg"
              type="number"
              step="0.1"
              placeholder="e.g., 5000, 10000"
              {...register('quantityKg', { valueAsNumber: true })}
              className={isExtremeQuantity ? 'border-red-500' : isHighQuantity ? 'border-amber-500' : ''}
            />
            {errors.quantityKg && (
              <p className="text-sm text-red-500 mt-1">{errors.quantityKg.message}</p>
            )}

            {isHighQuantity && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>⚠️ Verify Quantity:</strong> You entered {quantityKg.toLocaleString()} kg.
                  {isExtremeQuantity ? ' This exceeds typical range!' : ' Please confirm this is correct.'}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Equivalent:</span> {bags} bags
                <span className="text-xs text-blue-600 ml-1">({KG_PER_BAG}kg per bag)</span>
              </p>
              {isHighQuantity && (
                <label className="flex items-center mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="ml-2 text-sm text-blue-900">
                    ✓ I confirm this quantity is correct
                  </span>
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              type="text"
              placeholder="e.g., Purchased from supplier XYZ"
              {...register('description')}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (isHighQuantity && !confirmed)}
            >
              {loading ? 'Adding...' : 'Add Urea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
