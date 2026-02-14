'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Key, Check, AlertCircle, Loader2 } from 'lucide-react'

export function ApiKeySetup() {
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showInput, setShowInput] = useState(false)

  useEffect(() => {
    checkApiKey()
  }, [])

  async function checkApiKey() {
    try {
      const res = await fetch('/api/ai-lab/settings')
      const data = await res.json()
      if (data.success) {
        setHasKey(data.data.hasApiKey)
        setMaskedKey(data.data.maskedKey)
      }
    } catch {
      // ignore
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/ai-lab/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'API key saved!' })
        setApiKey('')
        setShowInput(false)
        checkApiKey()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Sarvam AI API Key</h3>
      </div>

      {hasKey && !showInput ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500" />
            <span>Key configured: {maskedKey}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowInput(true)}>
            Update
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="sarvam-key" className="text-xs text-muted-foreground">
            Get your key from sarvam.ai dashboard
          </Label>
          <div className="flex gap-2">
            <Input
              id="sarvam-key"
              type="password"
              placeholder="Enter Sarvam AI API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSave} disabled={saving || !apiKey.trim()} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
            {showInput && (
              <Button variant="ghost" size="sm" onClick={() => setShowInput(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2 mt-2 text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.type === 'error' && <AlertCircle className="h-3 w-3" />}
          {message.text}
        </div>
      )}
    </div>
  )
}
