'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FixStatus {
  state: 'idle' | 'preview' | 'loading' | 'success' | 'error'
  currentValue: number | null
  newValue: number | null
  message: string
  details: {
    oldValue: number
    newValue: number
    difference: number
    percentageChange: number
    recordsAffected: number
  } | null
}

export function FixProductionUserCount() {
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState<FixStatus>({
    state: 'idle',
    currentValue: null,
    newValue: null,
    message: '',
    details: null,
  })

  // Fetch current database value
  const handleFetchCurrent = async () => {
    try {
      const response = await fetch('/api/admin/fix-production-user-count?action=get-current')
      const data = await response.json()

      if (data.success) {
        setStatus(prev => ({
          ...prev,
          currentValue: data.currentValue,
          state: 'idle',
        }))
        setInputValue('')
      } else {
        setStatus(prev => ({
          ...prev,
          state: 'error',
          message: data.message || 'Failed to fetch current value',
        }))
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Error fetching current value',
      }))
    }
  }

  // Preview the fix (dry run)
  const handlePreview = async () => {
    if (!inputValue || isNaN(Number(inputValue))) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Please enter a valid number',
      }))
      return
    }

    try {
      setStatus(prev => ({ ...prev, state: 'loading' }))

      const response = await fetch('/api/admin/fix-production-user-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          newValue: Number(inputValue),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus({
          state: 'preview',
          currentValue: data.details.oldValue,
          newValue: data.details.newValue,
          message: 'Preview ready. Review the changes below.',
          details: data.details,
        })
      } else {
        setStatus(prev => ({
          ...prev,
          state: 'error',
          message: data.message || 'Failed to preview',
        }))
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Error previewing changes',
      }))
    }
  }

  // Apply the fix
  const handleApply = async () => {
    if (!inputValue || isNaN(Number(inputValue))) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Please enter a valid number',
      }))
      return
    }

    try {
      setStatus(prev => ({ ...prev, state: 'loading' }))

      const response = await fetch('/api/admin/fix-production-user-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          newValue: Number(inputValue),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus({
          state: 'success',
          currentValue: data.details.oldValue,
          newValue: data.details.newValue,
          message: '✅ Production user count fixed successfully!',
          details: data.details,
        })
        setInputValue('')
      } else {
        setStatus(prev => ({
          ...prev,
          state: 'error',
          message: data.message || 'Failed to apply fix',
        }))
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        message: 'Error applying fix',
      }))
    }
  }

  // Reset form
  const handleReset = () => {
    setInputValue('')
    setStatus({
      state: 'idle',
      currentValue: null,
      newValue: null,
      message: '',
      details: null,
    })
  }

  const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num)

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-900">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          Fix Production User Count
        </CardTitle>
        <CardDescription className="text-yellow-800">
          Correct mistaken production user count data (90000 → 9000)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Value Display */}
        {status.currentValue !== null && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Current Database Value</Label>
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="text-3xl font-bold text-red-600">
                {formatNumber(status.currentValue)} ❌
              </div>
              <p className="text-sm text-red-700 mt-1">Incorrect value in database</p>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="space-y-2">
          <Label htmlFor="correct-value">Enter Correct Value</Label>
          <Input
            id="correct-value"
            type="number"
            inputMode="numeric"
            placeholder="e.g., 9000"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="text-lg font-semibold"
            disabled={status.state === 'loading'}
          />
          <p className="text-xs text-gray-600">
            Enter the correct production user count value
          </p>
        </div>

        {/* Preview Display */}
        {status.details && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              📊 Correction Preview
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Old Value */}
              <div className="space-y-1">
                <p className="text-xs text-blue-700">Current Value</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(status.details.oldValue)}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="text-3xl font-bold text-blue-400">→</div>
              </div>
            </div>

            {/* New Value */}
            <div className="space-y-1">
              <p className="text-xs text-blue-700">New Value</p>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(status.details.newValue)} ✅
              </p>
            </div>

            {/* Impact Summary */}
            <div className="border-t border-blue-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Reduction:</span>
                <span className="font-semibold text-red-600">
                  -{formatNumber(status.details.difference)} ({status.details.percentageChange.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Records Affected:</span>
                <span className="font-semibold text-blue-900">
                  {status.details.recordsAffected}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {status.state === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        {status.state === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {status.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {status.currentValue === null ? (
            <Button
              onClick={handleFetchCurrent}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Check Current Value
            </Button>
          ) : status.state === 'idle' || status.state === 'preview' ? (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={status.state === 'loading'}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              <Button
                onClick={handlePreview}
                disabled={!inputValue || isNaN(Number(inputValue)) || status.state === 'loading'}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {status.state === 'loading' && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Preview Changes
              </Button>

              {status.state === 'preview' && (
                <Button
                  onClick={handleApply}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={status.state === 'loading'}
                >
                  {status.state === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Apply Fix
                    </>
                  )}
                </Button>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Note */}
        <div className="mt-6 p-3 bg-blue-100 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>ℹ️ How it works:</strong> First check current value, then enter the correct value, preview the changes, and finally apply the fix. All actions are logged for audit purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
