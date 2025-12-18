import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Droplets, Package } from 'lucide-react'
import type { FreeDefCustomerData } from '@/types'
import { BUCKET_TYPE_LABELS } from '@/types'

interface FreeDefCustomerAnalysisProps {
  data: FreeDefCustomerData | undefined
}

export default function FreeDefCustomerAnalysis({ data }: FreeDefCustomerAnalysisProps) {
  if (!data) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Loading customer data...
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Loading bucket impact...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `${rank}.`
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Top Direct DEF Buyers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Top 10 Direct DEF Buyers
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Customers buying loose DEF (in liters)
          </p>
        </CardHeader>
        <CardContent>
          {data.topDirectBuyers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No direct DEF sales recorded
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topDirectBuyers.map((buyer, index) => (
                    <TableRow
                      key={buyer.name}
                      className={
                        index < 3
                          ? 'bg-amber-50/30 dark:bg-amber-950/10'
                          : ''
                      }
                    >
                      <TableCell className="font-medium text-lg">
                        {getMedalIcon(index + 1)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {buyer.name}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {buyer.totalQuantity.toLocaleString()} L
                      </TableCell>
                      <TableCell className="text-right">
                        {buyer.transactionCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bucket Impact Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bucket Impact on DEF Consumption
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How much DEF is consumed by each bucket type
          </p>
        </CardHeader>
        <CardContent>
          {data.bucketImpact.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bucket sales recorded
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bucket Type</TableHead>
                    <TableHead className="text-right">Buckets Sold</TableHead>
                    <TableHead className="text-right">DEF Consumed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bucketImpact.map((impact) => (
                    <TableRow key={impact.bucketType}>
                      <TableCell className="font-medium">
                        {BUCKET_TYPE_LABELS[impact.bucketType]}
                      </TableCell>
                      <TableCell className="text-right">
                        {impact.bucketsSold.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {impact.litersConsumed.toLocaleString()} L
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {data.bucketImpact.reduce((sum, i) => sum + i.bucketsSold, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {data.bucketImpact.reduce((sum, i) => sum + i.litersConsumed, 0).toLocaleString()} L
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
