import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, CheckCircle, HelpCircle, Factory } from 'lucide-react'
import type { ProductionForecastData } from '@/types'
import { LITERS_PER_BATCH } from '@/types'

interface ProductionForecastProps {
  data: ProductionForecastData | undefined
}

export default function ProductionForecast({ data }: ProductionForecastProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading forecast data...
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusConfig = (status: 'urgent' | 'warning' | 'sufficient' | 'nodata') => {
    const configs = {
      urgent: {
        icon: AlertTriangle,
        label: '🔴 URGENT - Production Needed NOW',
        className: 'bg-red-100 text-red-900 border-red-300',
        alertClass: 'border-red-500 bg-red-50',
      },
      warning: {
        icon: AlertCircle,
        label: '🟡 Plan Production Soon',
        className: 'bg-yellow-100 text-yellow-900 border-yellow-300',
        alertClass: 'border-yellow-500 bg-yellow-50',
      },
      sufficient: {
        icon: CheckCircle,
        label: '🟢 Stock Sufficient',
        className: 'bg-green-100 text-green-900 border-green-300',
        alertClass: 'border-green-500 bg-green-50',
      },
      nodata: {
        icon: HelpCircle,
        label: '⚪ Insufficient Data',
        className: 'bg-gray-100 text-gray-900 border-gray-300',
        alertClass: 'border-gray-500 bg-gray-50',
      },
    }
    return configs[status]
  }

  const statusConfig = getStatusConfig(data.status)
  const StatusIcon = statusConfig.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Production Forecast & Alerts
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Critical business metric for production planning
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${statusConfig.className} text-base px-4 py-2`}>
            <StatusIcon className="h-4 w-4 mr-2" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Current Stock</div>
            <div className="text-2xl font-bold">{data.currentStock.toLocaleString()} L</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Daily Consumption</div>
            <div className="text-2xl font-bold">{data.dailyConsumption} L/day</div>
            <div className="text-xs text-muted-foreground mt-1">
              Buckets: {data.bucketConsumption} L/day
            </div>
            <div className="text-xs text-muted-foreground">
              Direct: {data.directSales} L/day
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Days Until Stockout</div>
            <div className={`text-2xl font-bold ${
              data.daysUntilStockout !== null && data.daysUntilStockout < 14
                ? 'text-red-600'
                : data.daysUntilStockout !== null && data.daysUntilStockout < 30
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}>
              {data.daysUntilStockout !== null ? `${data.daysUntilStockout} days` : 'N/A'}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Target Stock</div>
            <div className="text-2xl font-bold">{data.targetStock.toLocaleString()} L</div>
            <div className="text-xs text-muted-foreground mt-1">
              (60 days supply)
            </div>
          </div>
        </div>

        {/* Production Recommendation Alert */}
        {data.status !== 'nodata' && data.batchesNeeded > 0 && (
          <Alert className={statusConfig.alertClass}>
            <StatusIcon className="h-5 w-5" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <div className="font-semibold text-lg">Recommended Action:</div>
                <div className="bg-white/50 rounded p-3 border">
                  <div className="flex items-baseline gap-2">
                    <Factory className="h-6 w-6 mt-1" />
                    <div>
                      <div className="text-xl font-bold">
                        Produce {data.batchesNeeded} batch{data.batchesNeeded > 1 ? 'es' : ''}
                        {data.status === 'urgent' && ' NOW'}
                      </div>
                      <div className="text-sm mt-1">
                        ({data.batchesNeeded} × {LITERS_PER_BATCH.toLocaleString()} liters = {(data.batchesNeeded * LITERS_PER_BATCH).toLocaleString()} liters total)
                      </div>
                      {data.daysUntilStockout !== null && (
                        <div className="text-sm mt-2 text-muted-foreground">
                          This will provide approximately {Math.round((data.currentStock + data.batchesNeeded * LITERS_PER_BATCH) / data.dailyConsumption)} days of supply
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Production Schedule */}
        {data.nextBatchDate && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="font-semibold mb-3 flex items-center gap-2">
              📅 Production Schedule
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Next batch due:</span>
                <span className="font-semibold">{data.nextBatchDate}</span>
              </div>
              {data.followingBatchDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Following batch:</span>
                  <span className="font-semibold">{data.followingBatchDate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {data.status === 'nodata' && (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Insufficient consumption data to generate forecast. Start tracking FREE_DEF sales to enable production planning.
            </AlertDescription>
          </Alert>
        )}

        {/* Sufficient Stock Message */}
        {data.status === 'sufficient' && data.batchesNeeded === 0 && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2 text-green-900">
              <div className="font-semibold">Stock levels are healthy!</div>
              <div className="text-sm mt-1">
                Current stock will last {data.daysUntilStockout} days at current consumption rate.
                No immediate production needed.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Formula Explanation */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <div className="font-medium mb-1">Calculation Method:</div>
          <div>• Daily Consumption = (Bucket Sales × Bucket Size) + Direct DEF Sales / 30 days</div>
          <div>• Days Until Stockout = Current Stock / Daily Consumption</div>
          <div>• Batches Needed = (Target Stock - Current Stock) / {LITERS_PER_BATCH} liters per batch</div>
          <div>• Target Stock = 60 days × Daily Consumption</div>
        </div>
      </CardContent>
    </Card>
  )
}
