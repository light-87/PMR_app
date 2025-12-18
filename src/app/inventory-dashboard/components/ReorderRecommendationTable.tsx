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
import { AlertTriangle, Clock, CheckCircle, HelpCircle } from 'lucide-react'
import type { ReorderRecommendation } from '@/types'
import { BUCKET_TYPE_LABELS } from '@/types'

interface ReorderRecommendationTableProps {
  data: ReorderRecommendation[] | undefined
}

export default function ReorderRecommendationTable({ data }: ReorderRecommendationTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reorder Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No reorder recommendations available
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusConfig = (status: 'urgent' | 'soon' | 'sufficient' | 'nodata') => {
    const configs = {
      urgent: {
        icon: AlertTriangle,
        label: '🔴 Urgent',
        className: 'bg-red-100 text-red-800 border-red-300',
        description: 'Stock out in < 14 days',
      },
      soon: {
        icon: Clock,
        label: '🟡 Soon',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        description: 'Stock out in 14-30 days',
      },
      sufficient: {
        icon: CheckCircle,
        label: '🟢 Sufficient',
        className: 'bg-green-100 text-green-800 border-green-300',
        description: '> 30 days of supply',
      },
      nodata: {
        icon: HelpCircle,
        label: '⚪ No Data',
        className: 'bg-gray-100 text-gray-800 border-gray-300',
        description: 'No recent consumption',
      },
    }
    return configs[status]
  }

  // Separate recommendations by urgency
  const urgentItems = data.filter((d) => d.status === 'urgent')
  const soonItems = data.filter((d) => d.status === 'soon')
  const sufficientItems = data.filter((d) => d.status === 'sufficient')
  const nodataItems = data.filter((d) => d.status === 'nodata')

  const hasUrgentOrSoon = urgentItems.length > 0 || soonItems.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reorder Recommendations</CardTitle>
        <p className="text-sm text-muted-foreground">
          Smart alerts for inventory restocking (based on 30-day consumption)
        </p>
        {hasUrgentOrSoon && (
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            Action required for {urgentItems.length + soonItems.length} bucket type(s)
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket Type</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Daily Consumption</TableHead>
                <TableHead className="text-right">Days Until Stockout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Recommended Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const statusConfig = getStatusConfig(item.status)
                const Icon = statusConfig.icon

                return (
                  <TableRow
                    key={item.bucketType}
                    className={item.status === 'urgent' ? 'bg-red-50/50' : ''}
                  >
                    <TableCell className="font-medium">
                      {BUCKET_TYPE_LABELS[item.bucketType]}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.currentStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.avgDailyConsumption > 0
                        ? item.avgDailyConsumption.toFixed(1)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.daysUntilStockout !== null ? (
                        <span
                          className={
                            item.status === 'urgent'
                              ? 'text-red-600 font-semibold'
                              : item.status === 'soon'
                              ? 'text-yellow-600 font-semibold'
                              : ''
                          }
                        >
                          {item.daysUntilStockout} days
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig.className}>
                        <Icon className="h-3 w-3 mr-1 inline" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.recommendedOrderQty > 0 ? (
                        <span className="font-medium">
                          {item.recommendedOrderQty.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
            Urgent: {'<'} 14 days
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
            Soon: 14-30 days
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
            Sufficient: {'>'} 30 days
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-gray-400 rounded-full"></span>
            No Data: No recent sales
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          * Recommended order quantity assumes 60 days of target supply
        </div>
      </CardContent>
    </Card>
  )
}
