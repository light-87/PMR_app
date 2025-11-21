'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BUCKET_TYPE_LABELS } from '@/types'
import type { BucketType } from '@/types'

interface InventorySummary {
  bucketType: BucketType
  pallavi: number
  tularam: number
  total: number
}

interface InventoryDashboardProps {
  summary: InventorySummary[]
}

export function InventoryDashboard({ summary }: InventoryDashboardProps) {
  return (
    <Card className="border-2 border-purple-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="text-purple-800">Current Inventory Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 bg-gradient-to-r from-purple-100 to-pink-100">
                <th className="text-left p-3 font-semibold text-purple-900">Bucket Type</th>
                <th className="text-center p-3 font-semibold text-purple-900">Pallavi</th>
                <th className="text-center p-3 font-semibold text-purple-900">Tularam</th>
                <th className="text-center p-3 font-semibold text-purple-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, index) => (
                <tr
                  key={row.bucketType}
                  className={`border-b transition-colors duration-150 ${
                    index % 2 === 0
                      ? 'bg-purple-50/50 hover:bg-purple-100/70'
                      : 'bg-pink-50/50 hover:bg-pink-100/70'
                  }`}
                >
                  <td className="p-3 font-bold text-slate-700">
                    {BUCKET_TYPE_LABELS[row.bucketType]}
                  </td>
                  <td className="text-center p-3 font-semibold text-purple-600">{row.pallavi}</td>
                  <td className="text-center p-3 font-semibold text-pink-600">{row.tularam}</td>
                  <td className="text-center p-3">
                    <span className="font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg">
                      {row.total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
