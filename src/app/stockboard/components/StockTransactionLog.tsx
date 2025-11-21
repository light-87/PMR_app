import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STOCK_TYPE_LABELS, STOCK_CATEGORY_LABELS } from '@/types'
import type { StockTransaction } from '@/types'
import { ArrowUp, ArrowDown, Factory, Package, TrendingDown } from 'lucide-react'

interface StockTransactionLogProps {
  transactions: StockTransaction[]
  onRefresh: () => void
}

export function StockTransactionLog({ transactions }: StockTransactionLogProps) {
  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'ADD_UREA':
        return 'text-green-600 bg-green-50'
      case 'PRODUCE_BATCH':
        return 'text-purple-600 bg-purple-50'
      case 'FILL_BUCKETS':
        return 'text-blue-600 bg-blue-50'
      case 'SELL_FREE_DEF':
      case 'SELL_BUCKETS':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'ADD_UREA':
        return <ArrowUp className="h-4 w-4" />
      case 'PRODUCE_BATCH':
        return <Factory className="h-4 w-4" />
      case 'FILL_BUCKETS':
        return <Package className="h-4 w-4" />
      case 'SELL_FREE_DEF':
      case 'SELL_BUCKETS':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <ArrowDown className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Stock Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No transactions yet. Start by adding Urea or producing a batch.
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-full ${getTransactionColor(transaction.type)}`}>
                    {getIcon(transaction.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {STOCK_TYPE_LABELS[transaction.type]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {STOCK_CATEGORY_LABELS[transaction.category]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {transaction.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className={`font-semibold ${transaction.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.quantity >= 0 ? '+' : ''}{transaction.quantity.toFixed(1)} {transaction.unit}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Balance: {transaction.runningTotal.toFixed(1)} {transaction.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
