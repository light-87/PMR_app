'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Key, Upload, Presentation, ExternalLink, Copy, Check, FileDown } from 'lucide-react'
import { BackupManager } from './components/BackupManager'
import { RestoreManager } from './components/RestoreManager'
import { BulkUploadForm } from './components/BulkUploadForm'
import { DeleteRecentImport } from './components/DeleteRecentImport'
import { FactoryReset } from './components/FactoryReset'
import { FixProductionUserCount } from './components/FixProductionUserCount'

export default function AdminPage() {
  const [pins, setPins] = useState({
    ADMIN: '',
    EXPENSE_INVENTORY: '',
    INVENTORY_ONLY: '',
  })
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [deckLinkCopied, setDeckLinkCopied] = useState(false)

  const handleCopyDeckLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/deck`)
      setDeckLinkCopied(true)
      setTimeout(() => setDeckLinkCopied(false), 2000)
    } catch {
      setMessage('Could not copy the link — open the deck and copy from the address bar')
    }
  }

  const handlePinChange = (role: keyof typeof pins, value: string) => {
    setPins(prev => ({
      ...prev,
      [role]: value.replace(/\D/g, '').slice(0, 4),
    }))
  }

  const handleUpdatePin = async (role: string) => {
    const pin = pins[role as keyof typeof pins]
    if (pin.length !== 4) {
      setMessage('PIN must be exactly 4 digits')
      return
    }

    setUpdating(role)
    setMessage('')

    try {
      const response = await fetch('/api/admin/pins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, newPin: pin }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`${role.replace('_', ' ')} PIN updated successfully`)
        setPins(prev => ({ ...prev, [role]: '' }))
      } else {
        setMessage(data.message || 'Failed to update PIN')
      }
    } catch {
      setMessage('Something went wrong')
    } finally {
      setUpdating(null)
    }
  }

  const roleLabels = {
    ADMIN: 'Admin PIN (Full Access)',
    EXPENSE_INVENTORY: 'Expense + Inventory PIN',
    INVENTORY_ONLY: 'Inventory Only PIN',
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Settings</h1>

        {message && (
          <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change PINs
            </CardTitle>
            <CardDescription>
              Update the 4-digit PINs for each access level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role} className="space-y-2">
                <Label>{label}</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pins[role as keyof typeof pins]}
                    onChange={(e) => handlePinChange(role as keyof typeof pins, e.target.value)}
                    placeholder="Enter new 4-digit PIN"
                    className="max-w-[200px]"
                  />
                  <Button
                    onClick={() => handleUpdatePin(role)}
                    disabled={updating === role || pins[role as keyof typeof pins].length !== 4}
                  >
                    {updating === role ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <FixProductionUserCount />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Presentation className="h-5 w-5" />
              AdBlue / DEF Presentation
            </CardTitle>
            <CardDescription>
              The slide deck on how DEF works and how PMR makes it. Anyone with the
              link can open it — no login needed, so it is safe to send to customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href="/deck" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open deck
                </a>
              </Button>
              <Button variant="outline" onClick={handleCopyDeckLink}>
                {deckLinkCopied ? (
                  <><Check className="h-4 w-4 mr-2" />Link copied</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" />Copy share link</>
                )}
              </Button>
              <Button variant="outline" asChild>
                <a href="/deck/PMR-AdBlue-DEF-Deck.pdf" target="_blank" rel="noopener noreferrer">
                  <FileDown className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Arrow keys or click to move between slides. Press F for fullscreen.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Upload
            </CardTitle>
            <CardDescription>
              Upload Excel file with Inventory and Expenses data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeleteRecentImport />
            <BulkUploadForm />
          </CardContent>
        </Card>

        <BackupManager />

        <RestoreManager />

        <FactoryReset />
      </div>
    </ProtectedLayout>
  )
}
