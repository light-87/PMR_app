import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Factory, Package, Droplets, Gauge, ArrowUp, ArrowDown } from 'lucide-react'
import type { FreeDefOverviewMetrics } from '@/types'

interface FreeDefOverviewCardsProps {
  data: FreeDefOverviewMetrics | undefined
}

export default function FreeDefOverviewCards({ data }: FreeDefOverviewCardsProps) {
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
      title: 'Produced',
      value: `${data.produced.toLocaleString()} L`,
      change: data.producedChange,
      icon: Factory,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: 'Total liters produced',
    },
    {
      title: 'Consumed by Buckets',
      value: `${data.consumedByBuckets.toLocaleString()} L`,
      change: data.consumedChange,
      icon: Package,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      subtitle: 'Used for bucket filling',
    },
    {
      title: 'Sold Direct',
      value: `${data.soldDirect.toLocaleString()} L`,
      change: data.soldChange,
      icon: Droplets,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: 'Direct customer sales',
    },
    {
      title: 'Current Stock',
      value: `${data.currentStock.toLocaleString()} L`,
      change: null,
      icon: Gauge,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: 'Available FREE_DEF',
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
              <p className="text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </p>
              {card.change !== null && (
                <div className="flex items-center text-xs mt-2">
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
                    <span className="text-muted-foreground">No change</span>
                  )}
                  <span className="ml-1 text-muted-foreground">vs previous period</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
