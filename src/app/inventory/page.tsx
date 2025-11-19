'use client'

import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function InventoryPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>Current Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Inventory dashboard and transaction log will be implemented in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
