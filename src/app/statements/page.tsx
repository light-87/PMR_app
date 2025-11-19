'use client'

import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StatementsPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Customer Statements</h1>
        <Card>
          <CardHeader>
            <CardTitle>Generate Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              PDF statement generation will be implemented in Phase 5.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
