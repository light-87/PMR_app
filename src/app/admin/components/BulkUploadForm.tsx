'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UploadResult {
  success: boolean
  message: string
  inventoryImported?: number
  expensesImported?: number
  errors?: string
}

export function BulkUploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null) // Clear previous results
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      setResult({
        success: data.success,
        message: data.message,
        inventoryImported: data.inventoryImported,
        expensesImported: data.expensesImported,
        errors: data.errors,
      })

      // Clear file input on success
      if (data.success) {
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload file',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClearFile = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="bulk-upload-input"
          />
          <label htmlFor="bulk-upload-input">
            <Button type="button" variant="outline" asChild>
              <span>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Choose Excel File
              </span>
            </Button>
          </label>
          {file && (
            <span className="text-sm text-muted-foreground">
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </span>
          )}
          {file && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {file && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full sm:w-auto"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload and Import
            </>
          )}
        </Button>
      )}

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5" />
            )}
            <div className="flex-1">
              <AlertDescription>
                <div className="font-medium mb-1">{result.message}</div>
                {result.inventoryImported !== undefined && result.expensesImported !== undefined && (
                  <div className="text-sm mt-2">
                    <div>Inventory records imported: {result.inventoryImported}</div>
                    <div>Expense records imported: {result.expensesImported}</div>
                  </div>
                )}
                {result.errors && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium mb-1">Errors:</div>
                    <pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded mt-1">
                      {result.errors}
                    </pre>
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium">File Requirements:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Excel file (.xlsx or .xls)</li>
          <li>Maximum file size: 10MB</li>
          <li>Must contain two sheets: "Inventory" and "Expenses"</li>
        </ul>
        <p className="font-medium mt-3">Inventory Sheet Columns:</p>
        <ul className="list-disc list-inside ml-2">
          <li>Date (DD-MMM-YYYY like "20-Nov-2025", or YYYY-MM-DD, or Excel date)</li>
          <li>Warehouse (Pallavi or Tularam - case insensitive)</li>
          <li>BucketType (TATA G, TATA W, AL 10 Ltr, AL, BB, ES, MH, MH 10 Ltr, TATA 10 Ltr, IBC Tank)</li>
          <li>Action (Stock or Sell - case insensitive)</li>
          <li>Quantity (number, can be negative for sells)</li>
          <li>BuyerSeller (name of buyer or seller)</li>
        </ul>
        <p className="font-medium mt-3">Expenses Sheet Columns:</p>
        <ul className="list-disc list-inside ml-2">
          <li>Date (DD-MMM-YYYY like "1-Jan-2025", or YYYY-MM-DD, or Excel date)</li>
          <li>Amount (number with or without ₹ symbol and commas)</li>
          <li>Account (Cash, Prashant Gaydhane, PMR, KPG Saving, KP Enterprises - case insensitive)</li>
          <li>Type (Income or Expense - case insensitive)</li>
          <li>Name (vendor or customer name)</li>
        </ul>
        <p className="text-xs mt-2 italic">
          Note: The parser automatically normalizes data (removes currency symbols, handles negative quantities, converts dates, etc.)
        </p>
      </div>
    </div>
  )
}
