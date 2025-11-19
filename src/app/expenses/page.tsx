'use client'

import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ExpensesPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Expense Tracking</h1>
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Expense tracking and management will be implemented in Phase 3.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
