'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface BackupLog {
  id: string
  backupDate: string
  backupType: string
  driveFileId: string | null
  inventoryCount: number
  expenseCount: number
  status: string
  errorMessage: string | null
}

export function BackupManager() {
  const [logs, setLogs] = useState<BackupLog[]>([])
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [backing, setBacking] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [message, setMessage] = useState('')

  const fetchBackupLogs = async () => {
    try {
      const response = await fetch('/api/admin/backup?limit=10')
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setLastBackupDate(data.lastBackupDate)
      }
    } catch (error) {
      console.error('Failed to fetch backup logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackupLogs()
  }, [])

  const handleManualBackup = async () => {
    setBacking(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`Backup created successfully! ${data.inventoryCount} inventory and ${data.expenseCount} expense records backed up.`)
        fetchBackupLogs()
      } else {
        setMessage(data.message || 'Backup failed')
      }
    } catch (error) {
      setMessage('Failed to create backup')
    } finally {
      setBacking(false)
    }
  }

  const handleCleanFailedBackups = async () => {
    if (!confirm('Are you sure you want to delete all failed backup logs? This action cannot be undone.')) {
      return
    }

    setCleaning(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`Successfully deleted ${data.deletedCount} failed backup logs.`)
        fetchBackupLogs()
      } else {
        setMessage(data.message || 'Failed to clean up backups')
      }
    } catch (error) {
      setMessage('Failed to clean up backups')
    } finally {
      setCleaning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'SUCCESS') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backup Manager
        </CardTitle>
        <CardDescription>
          Automatic backups on sign-in (every 24 hours) to Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Backup Info */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Last successful backup:</span>
          {lastBackupDate ? (
            <span className="font-medium">
              {formatDistanceToNow(new Date(lastBackupDate), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-yellow-600">No backups yet</span>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded text-sm ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleManualBackup}
            disabled={backing || cleaning}
            className="w-full sm:w-auto"
          >
            {backing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Create Manual Backup
              </>
            )}
          </Button>

          {logs.some(log => log.status === 'FAILED') && (
            <Button
              onClick={handleCleanFailedBackups}
              disabled={backing || cleaning}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {cleaning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Clean Failed Backups
                </>
              )}
            </Button>
          )}
        </div>

        {/* Backup Logs Table */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading backup history...</div>
        ) : logs.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Recent Backups</h4>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Records</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className="border-t">
                        <td className="px-3 py-2">
                          {format(new Date(log.backupDate), 'MMM d, yyyy h:mm a')}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${log.backupType === 'MANUAL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {log.backupType}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {log.inventoryCount + log.expenseCount}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(log.status)}
                            <span className={log.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                              {log.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {log.status === 'FAILED' && log.errorMessage && (
                        <tr key={`${log.id}-error`} className="border-t bg-red-50">
                          <td colSpan={4} className="px-3 py-2">
                            <div className="text-xs text-red-700">
                              <span className="font-semibold">Error: </span>
                              {log.errorMessage}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No backup history available</div>
        )}
      </CardContent>
    </Card>
  )
}
