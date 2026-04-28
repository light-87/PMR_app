'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Workflow } from 'lucide-react'

export function FlowTestCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="h-4 w-4" /> End-to-End Flow Test
        </CardTitle>
        <CardDescription>
          Wires the production Phase 1 APIs (login, mark, approve, calculate, pay, push) so you can
          drive the whole flow as a single test employee from this card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Available after Phase 1 schema + APIs ship. Skipped during Phase 0 because it needs
          Employee, AttendanceRecord, and SalaryPayment tables that don&apos;t exist yet.
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>What this card will do (Phase 1):</p>
          <ol className="list-decimal pl-5 space-y-0.5">
            <li>Create one test employee (phone 9999999999, PIN 1234, salary ₹15000)</li>
            <li>POST face-scan today → mark present (admin side)</li>
            <li>POST self-mark for tomorrow → pending</li>
            <li>POST approve → approved</li>
            <li>GET /api/employee/salary/calculate → suggested amount</li>
            <li>POST /api/employee/salary/pay (REGULAR) → ExpenseTransaction + push</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
