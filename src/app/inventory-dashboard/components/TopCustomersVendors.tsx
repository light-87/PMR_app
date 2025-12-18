import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, TrendingUp } from 'lucide-react'
import type { TopEntity } from '@/types'

interface TopCustomersVendorsProps {
  topBuyers: TopEntity[] | undefined
  topSuppliers: TopEntity[] | undefined
}

export default function TopCustomersVendors({
  topBuyers,
  topSuppliers,
}: TopCustomersVendorsProps) {
  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `${rank}.`
  }

  const EntityTable = ({
    title,
    data,
    icon: Icon,
  }: {
    title: string
    data: TopEntity[] | undefined
    icon: any
  }) => {
    if (!data || data.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Top 10 by total quantity
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Total Quantity</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Last Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entity, index) => (
                  <TableRow
                    key={entity.name}
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
                      {entity.name}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {entity.totalQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {entity.transactionCount}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {entity.lastTransactionDate}
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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <EntityTable
        title="Top 10 Buyers"
        data={topBuyers}
        icon={TrendingUp}
      />
      <EntityTable
        title="Top 10 Suppliers"
        data={topSuppliers}
        icon={Users}
      />
    </div>
  )
}
