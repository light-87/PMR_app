'use client'

import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Administration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              PIN management, bulk upload, and backup features will be implemented in Phase 6.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
