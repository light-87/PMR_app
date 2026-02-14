'use client'

import { useState, useRef, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mic,
  MicOff,
  Loader2,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  Lightbulb,
} from 'lucide-react'
import Link from 'next/link'
import {
  BUCKET_TYPE_LABELS,
  WAREHOUSE_LABELS,
  ACCOUNT_LABELS,
  STOCK_TYPE_LABELS,
  type VoiceParsedData,
  type BucketType,
  type Warehouse,
  type ExpenseAccount,
  type ActionType,
  type TransactionType,
  type StockTransactionType,
} from '@/types'

type RecordingState = 'idle' | 'recording' | 'processing' | 'preview' | 'confirmed' | 'error'

export default function VoiceEntryPage() {
  const [state, setState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<VoiceParsedData | null>(null)
  const [existingNames, setExistingNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [language, setLanguage] = useState('mr-IN')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setState('recording')
    } catch (err) {
      console.error('Microphone error:', err)
      setError('Could not access microphone. Please allow microphone permission.')
      setState('error')
    }
  }, [language])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setState('processing')
    }
  }, [])

  async function processAudio(audioBlob: Blob) {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', language)

      const res = await fetch('/api/ai-lab/voice-parse', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        setTranscript(data.data.transcript)
        setParsed(data.data.parsed)
        setExistingNames(data.data.existingNames)
        setState('preview')
      } else {
        setError(data.error || 'Failed to process audio')
        setState('error')
      }
    } catch {
      setError('Network error. Please try again.')
      setState('error')
    }
  }

  async function handleConfirm() {
    if (!parsed) return
    setState('processing')
    setError('')

    try {
      let endpoint = ''
      let body: Record<string, unknown> = {}

      if (parsed.module === 'inventory') {
        endpoint = '/api/inventory'
        body = {
          date: parsed.date,
          warehouse: parsed.warehouse,
          bucketType: parsed.bucketType,
          action: parsed.action,
          quantity: parsed.quantity,
          buyerSeller: parsed.buyerSeller || '',
        }
      } else if (parsed.module === 'expense') {
        endpoint = '/api/expenses'
        body = {
          date: parsed.date,
          amount: parsed.amount,
          account: parsed.account,
          type: parsed.transactionType,
          name: parsed.name || '',
        }
      } else if (parsed.module === 'stock') {
        endpoint = '/api/stock'
        body = {
          date: parsed.date,
          type: parsed.stockType,
          category: parsed.stockCategory,
          quantity: parsed.quantity,
          unit: parsed.unit,
          description: parsed.description || '',
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success || res.ok) {
        setConfirmMessage('Entry added successfully!')
        setState('confirmed')
      } else {
        setError(data.error || 'Failed to save entry')
        setState('preview')
      }
    } catch {
      setError('Network error while saving. Please try again.')
      setState('preview')
    }
  }

  function reset() {
    setState('idle')
    setTranscript('')
    setParsed(null)
    setError('')
    setConfirmMessage('')
  }

  function updateParsedField(field: keyof VoiceParsedData, value: unknown) {
    if (parsed) {
      setParsed({ ...parsed, [field]: value })
    }
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/ai-lab">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Voice Data Entry</h1>
            <p className="text-sm text-muted-foreground">Speak in Marathi to add entries</p>
          </div>
        </div>

        {/* Language selector */}
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground mb-1 block">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mr-IN">Marathi</SelectItem>
              <SelectItem value="hi-IN">Hindi</SelectItem>
              <SelectItem value="en-IN">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recording Section */}
        {(state === 'idle' || state === 'recording' || state === 'error') && (
          <div className="text-center py-12">
            <button
              onClick={state === 'recording' ? stopRecording : startRecording}
              className={`h-24 w-24 rounded-full flex items-center justify-center mx-auto transition-all ${
                state === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {state === 'recording' ? (
                <MicOff className="h-10 w-10 text-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
            </button>
            <p className="mt-4 text-sm text-muted-foreground">
              {state === 'recording'
                ? 'Recording... Tap to stop'
                : 'Tap to start recording'}
            </p>

            {/* Example suggestions */}
            <div className="mt-6 text-left max-w-md mx-auto">
              <div className="flex items-center gap-1.5 mb-2 justify-center">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs font-medium text-muted-foreground">Try saying something like:</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wide mb-1">Inventory / Stock Entry</p>
                  <div className="space-y-1">
                    {[
                      '"पल्लवी मध्ये रमेशकडून 50 टाटा जी स्टॉक करा"',
                      '"तुळाराम वेअरहाउस मध्ये 30 PMR 10L विकले"',
                      '"फॅक्टरी मध्ये 100 Tata G बकेट आले आज"',
                      '"पल्लवी warehouse मधून 20 PMR 20L sell, buyer Mahesh"',
                      '"आज 25 HP बकेट स्टॉक केले, पल्लवी, रामू कडून"',
                    ].map((ex) => (
                      <p key={ex} className="text-[11px] text-muted-foreground bg-blue-50 border border-blue-100 rounded px-2 py-1">{ex}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-green-600 uppercase tracking-wide mb-1">Expense / Income Entry</p>
                  <div className="space-y-1">
                    {[
                      '"कॅश मधून 15000 शिवाजी ट्रान्सपोर्टला दिले"',
                      '"रमेश कडून 50000 income आला cash मध्ये"',
                      '"आज diesel साठी 8000 खर्च, प्रशांत गायधने account"',
                      '"HDFC मध्ये Suresh कडून 25000 जमा झाले"',
                      '"पेट्रोल साठी 2000 रुपये cash मधून दिले"',
                    ].map((ex) => (
                      <p key={ex} className="text-[11px] text-muted-foreground bg-green-50 border border-green-100 rounded px-2 py-1">{ex}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-orange-600 uppercase tracking-wide mb-1">Production / Urea</p>
                  <div className="space-y-1">
                    {[
                      '"आज 8 bags urea add केले"',
                      '"1 batch produce केला आज"',
                      '"360 kg urea टाकले production साठी"',
                    ].map((ex) => (
                      <p key={ex} className="text-[11px] text-muted-foreground bg-orange-50 border border-orange-100 rounded px-2 py-1">{ex}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 justify-center">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {state === 'processing' && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Processing your voice...</p>
          </div>
        )}

        {/* Preview / Confirmation */}
        {state === 'preview' && parsed && (
          <div className="space-y-4">
            {/* Transcript */}
            <div className="p-3 rounded-lg bg-muted">
              <Label className="text-xs text-muted-foreground">What you said:</Label>
              <p className="text-sm font-medium mt-1">{transcript}</p>
            </div>

            {/* Confidence indicator */}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                parsed.confidence >= 0.8 ? 'bg-green-500' :
                parsed.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-muted-foreground">
                AI Confidence: {Math.round(parsed.confidence * 100)}%
              </span>
            </div>

            {/* Module type */}
            <div className="p-3 rounded-lg border bg-card">
              <Label className="text-xs text-muted-foreground">Entry Type</Label>
              <Select
                value={parsed.module}
                onValueChange={(v) => updateParsedField('module', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="p-3 rounded-lg border bg-card">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={parsed.date}
                onChange={(e) => updateParsedField('date', e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Inventory-specific fields */}
            {parsed.module === 'inventory' && (
              <>
                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Warehouse</Label>
                  <Select
                    value={parsed.warehouse || ''}
                    onValueChange={(v) => updateParsedField('warehouse', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WAREHOUSE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Bucket Type</Label>
                  <Select
                    value={parsed.bucketType || ''}
                    onValueChange={(v) => updateParsedField('bucketType', v as BucketType)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select bucket type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUCKET_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <Select
                    value={parsed.action || ''}
                    onValueChange={(v) => updateParsedField('action', v as ActionType)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STOCK">Stock (Received)</SelectItem>
                      <SelectItem value="SELL">Sell (Dispatched)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    value={parsed.quantity || ''}
                    onChange={(e) => updateParsedField('quantity', Number(e.target.value))}
                    className="mt-1"
                    min={1}
                  />
                </div>

                <div className={`p-3 rounded-lg border ${parsed.isNewName ? 'border-amber-300 bg-amber-50' : 'bg-card'}`}>
                  <Label className="text-xs text-muted-foreground">Buyer/Seller</Label>
                  {parsed.isNewName && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      New name — not found in database
                    </p>
                  )}
                  <Input
                    value={parsed.buyerSeller || ''}
                    onChange={(e) => updateParsedField('buyerSeller', e.target.value)}
                    className="mt-1"
                    list="existing-names"
                  />
                  <datalist id="existing-names">
                    {existingNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </>
            )}

            {/* Expense-specific fields */}
            {parsed.module === 'expense' && (
              <>
                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <Input
                    type="number"
                    value={parsed.amount || ''}
                    onChange={(e) => updateParsedField('amount', Number(e.target.value))}
                    className="mt-1 text-lg font-semibold"
                    min={0}
                    step={0.01}
                  />
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Account</Label>
                  <Select
                    value={parsed.account || ''}
                    onValueChange={(v) => updateParsedField('account', v as ExpenseAccount)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACCOUNT_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                  <Select
                    value={parsed.transactionType || ''}
                    onValueChange={(v) => updateParsedField('transactionType', v as TransactionType)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={`p-3 rounded-lg border ${parsed.isNewName ? 'border-amber-300 bg-amber-50' : 'bg-card'}`}>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  {parsed.isNewName && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      New name — not found in database
                    </p>
                  )}
                  <Input
                    value={parsed.name || ''}
                    onChange={(e) => updateParsedField('name', e.target.value)}
                    className="mt-1"
                    list="existing-names-expense"
                  />
                  <datalist id="existing-names-expense">
                    {existingNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </>
            )}

            {/* Stock-specific fields */}
            {parsed.module === 'stock' && (
              <>
                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Stock Type</Label>
                  <Select
                    value={parsed.stockType || ''}
                    onValueChange={(v) => updateParsedField('stockType', v as StockTransactionType)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STOCK_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    value={parsed.quantity || ''}
                    onChange={(e) => updateParsedField('quantity', Number(e.target.value))}
                    className="mt-1"
                    min={0}
                  />
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Select
                    value={parsed.unit || ''}
                    onValueChange={(v) => updateParsedField('unit', v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="LITERS">Liters</SelectItem>
                      <SelectItem value="BAGS">Bags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input
                    value={parsed.description || ''}
                    onChange={(e) => updateParsedField('description', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleConfirm} className="flex-1" size="lg">
                <Check className="h-4 w-4 mr-2" />
                Confirm & Add to Database
              </Button>
              <Button variant="outline" onClick={reset} size="lg">
                <X className="h-4 w-4 mr-2" />
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* Confirmed */}
        {state === 'confirmed' && (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-4 text-lg font-medium text-green-700">{confirmMessage}</p>
            <Button onClick={reset} className="mt-6" variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Record Another
            </Button>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
