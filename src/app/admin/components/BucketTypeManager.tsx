'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package2, Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import type { BucketTypeConfig } from '@/types'

export function BucketTypeManager() {
  const [bucketTypes, setBucketTypes] = useState<BucketTypeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    capacityLiters: 20,
  })

  const [editData, setEditData] = useState<{ id: string; name: string; capacityLiters: number } | null>(null)

  useEffect(() => {
    fetchBucketTypes()
  }, [])

  const fetchBucketTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/bucket-types')
      const data = await response.json()

      if (data.success) {
        setBucketTypes(data.bucketTypes)
      }
    } catch (error) {
      console.error('Failed to fetch bucket types:', error)
      setMessage('Failed to load bucket types')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setMessage('Please enter a bucket name')
      return
    }

    if (formData.capacityLiters < 0) {
      setMessage('Capacity must be 0 or greater')
      return
    }

    try {
      const response = await fetch('/api/admin/bucket-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message || 'Bucket type added successfully')
        setFormData({ name: '', capacityLiters: 20 })
        setShowAddForm(false)
        fetchBucketTypes()
      } else {
        setMessage(data.message || 'Failed to add bucket type')
      }
    } catch (error) {
      console.error('Failed to add bucket type:', error)
      setMessage('Something went wrong')
    }
  }

  const handleEdit = (bucketType: BucketTypeConfig) => {
    setEditingId(bucketType.id)
    setEditData({
      id: bucketType.id,
      name: bucketType.name,
      capacityLiters: bucketType.capacityLiters,
    })
  }

  const handleUpdate = async () => {
    if (!editData) return

    if (!editData.name.trim()) {
      setMessage('Please enter a bucket name')
      return
    }

    if (editData.capacityLiters < 0) {
      setMessage('Capacity must be 0 or greater')
      return
    }

    try {
      const response = await fetch('/api/admin/bucket-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message || 'Bucket type updated successfully')
        setEditingId(null)
        setEditData(null)
        fetchBucketTypes()
      } else {
        setMessage(data.message || 'Failed to update bucket type')
      }
    } catch (error) {
      console.error('Failed to update bucket type:', error)
      setMessage('Something went wrong')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? It will be hidden from the entry form.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/bucket-types?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message || 'Bucket type deleted successfully')
        fetchBucketTypes()
      } else {
        setMessage(data.message || 'Failed to delete bucket type')
      }
    } catch (error) {
      console.error('Failed to delete bucket type:', error)
      setMessage('Something went wrong')
    }
  }

  const handleRestore = async (id: string, name: string) => {
    try {
      const response = await fetch('/api/admin/bucket-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, capacityLiters: bucketTypes.find(bt => bt.id === id)?.capacityLiters || 20, isActive: true }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message || 'Bucket type restored successfully')
        fetchBucketTypes()
      } else {
        setMessage(data.message || 'Failed to restore bucket type')
      }
    } catch (error) {
      console.error('Failed to restore bucket type:', error)
      setMessage('Something went wrong')
    }
  }

  if (loading) {
    return <div>Loading bucket types...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          Manage Bucket Types
        </CardTitle>
        <CardDescription>
          Add, edit, or remove bucket types. Changes will reflect in the inventory entry form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`p-3 rounded ${message.toLowerCase().includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Add New Bucket Type Form */}
        {showAddForm ? (
          <div className="border p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Add New Bucket Type</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Bucket Name</Label>
              <Input
                placeholder="e.g., Tata G Bucket, AL 10 Ltr"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <p className="text-xs text-gray-500">The code will be auto-generated from the name</p>
            </div>
            <div className="space-y-2">
              <Label>Capacity (Liters)</Label>
              <Input
                type="number"
                min="0"
                value={formData.capacityLiters}
                onChange={(e) => setFormData({ ...formData, capacityLiters: parseInt(e.target.value) || 0 })}
                className="max-w-[150px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>Add Bucket Type</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Bucket Type
          </Button>
        )}

        {/* Bucket Types List */}
        <div className="space-y-2">
          <h3 className="font-semibold">Current Bucket Types</h3>
          <div className="grid gap-2">
            {bucketTypes.map((bucketType) => (
              <div
                key={bucketType.id}
                className={`border p-3 rounded-lg ${!bucketType.isActive ? 'opacity-50 bg-gray-50' : ''}`}
              >
                {editingId === bucketType.id && editData ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Capacity (L)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editData.capacityLiters}
                          onChange={(e) => setEditData({ ...editData, capacityLiters: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null)
                          setEditData(null)
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{bucketType.name}</div>
                      <div className="text-sm text-gray-600">
                        Code: {bucketType.code} • Capacity: {bucketType.capacityLiters}L
                        {bucketType.isSystem && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">System</span>}
                        {!bucketType.isActive && <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Inactive</span>}
                      </div>
                    </div>
                    {!bucketType.isSystem && (
                      <div className="flex gap-2">
                        {bucketType.isActive ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(bucketType)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(bucketType.id, bucketType.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(bucketType.id, bucketType.name)}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
