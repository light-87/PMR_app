import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PackagePlus, TrendingUp, Repeat, Package, ArrowUp, ArrowDown } from 'lucide-react'
import type { InventoryOverviewMetrics } from '@/types'

interface OverviewCardsProps {
  data: InventoryOverviewMetrics | undefined
}

export default function OverviewCards({ data }: OverviewCardsProps) {
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Stocked',
      value: data.totalStocked.toLocaleString(),
      change: data.stockedChange,
      icon: PackagePlus,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Sold',
      value: data.totalSold.toLocaleString(),
      change: data.soldChange,
      icon: TrendingUp,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Turnover Rate',
      value: `${data.turnoverRate.toFixed(2)}x`,
      change: null,
      icon: Repeat,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Current Stock',
      value: data.currentStockValue.toLocaleString(),
      change: null,
      icon: Package,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const isPositive = card.change !== null && card.change > 0
        const isNegative = card.change !== null && card.change < 0

        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.change !== null && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {isPositive && (
                    <>
                      <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600 font-medium">
                        +{card.change.toFixed(1)}%
                      </span>
                    </>
                  )}
                  {isNegative && (
                    <>
                      <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                      <span className="text-red-600 font-medium">
                        {card.change.toFixed(1)}%
                      </span>
                    </>
                  )}
                  {!isPositive && !isNegative && (
                    <span>No change</span>
                  )}
                  <span className="ml-1">vs previous period</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
