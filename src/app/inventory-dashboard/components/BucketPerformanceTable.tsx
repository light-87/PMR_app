'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown } from 'lucide-react'
import type { BucketPerformance } from '@/types'
import { BUCKET_TYPE_LABELS } from '@/types'

interface BucketPerformanceTableProps {
  data: BucketPerformance[] | undefined
}

type SortKey = 'bucketType' | 'totalStocked' | 'totalSold' | 'currentStock' | 'turnoverRate' | 'avgDaysToSell'
type SortDirection = 'asc' | 'desc'

export default function BucketPerformanceTable({ data }: BucketPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('turnoverRate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bucket Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No performance data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let aVal: any = a[sortKey]
    let bVal: any = b[sortKey]

    if (sortKey === 'bucketType') {
      aVal = BUCKET_TYPE_LABELS[a.bucketType]
      bVal = BUCKET_TYPE_LABELS[b.bucketType]
    }

    if (aVal === null) return 1
    if (bVal === null) return -1

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const getStatusBadge = (status: 'fast' | 'moderate' | 'slow') => {
    const variants = {
      fast: { label: '⚡ Fast', className: 'bg-green-100 text-green-800 border-green-300' },
      moderate: { label: '⏱️ Moderate', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      slow: { label: '🐌 Slow', className: 'bg-red-100 text-red-800 border-red-300' },
    }
    const variant = variants[status]
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    )
  }

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bucket Performance</CardTitle>
        <p className="text-sm text-muted-foreground">
          Detailed metrics per bucket type
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton column="bucketType" label="Bucket Type" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="totalStocked" label="Stocked" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="totalSold" label="Sold" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="currentStock" label="Current Stock" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="turnoverRate" label="Turnover Rate" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="avgDaysToSell" label="Avg Days to Sell" />
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((bucket) => (
                <TableRow key={bucket.bucketType}>
                  <TableCell className="font-medium">
                    {BUCKET_TYPE_LABELS[bucket.bucketType]}
                  </TableCell>
                  <TableCell className="text-right">
                    {bucket.totalStocked.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {bucket.totalSold.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {bucket.currentStock.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {bucket.turnoverRate.toFixed(2)}x
                  </TableCell>
                  <TableCell className="text-right">
                    {bucket.avgDaysToSell !== null
                      ? `${bucket.avgDaysToSell} days`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(bucket.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
