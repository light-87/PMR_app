'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BUCKET_TYPE_LABELS, WAREHOUSE_LABELS } from '@/types'
import type { InventoryTransaction } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TransactionLogProps {
  transactions: InventoryTransaction[]
  isAdmin: boolean
  onEdit: (transaction: InventoryTransaction) => void
  onDelete: (id: string) => void
}

export function TransactionLog({
  transactions,
  isAdmin,
  onEdit,
  onDelete,
}: TransactionLogProps) {
  return (
    <Card className="border-2 border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-blue-800">Transaction Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 bg-gradient-to-r from-slate-100 to-slate-200">
                <th className="text-left p-3 font-semibold text-slate-700">Date</th>
                <th className="text-left p-3 font-semibold text-slate-700">Warehouse</th>
                <th className="text-left p-3 font-semibold text-slate-700">Bucket Type</th>
                <th className="text-center p-3 font-semibold text-slate-700">Action</th>
                <th className="text-center p-3 font-semibold text-slate-700">Quantity</th>
                <th className="text-left p-3 font-semibold text-slate-700">Buyer/Seller</th>
                <th className="text-center p-3 font-semibold text-slate-700">Running Total</th>
                {isAdmin && (
                  <th className="text-center p-3 font-semibold text-slate-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="text-center p-6 text-muted-foreground"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={cn(
                      'border-b transition-colors duration-150',
                      transaction.action === 'STOCK'
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'bg-red-50 hover:bg-red-100'
                    )}
                  >
                    <td className="p-3">
                      {format(new Date(transaction.date), 'dd-MMM-yyyy')}
                    </td>
                    <td className="p-3">
                      {WAREHOUSE_LABELS[transaction.warehouse]}
                    </td>
                    <td className="p-3">
                      {BUCKET_TYPE_LABELS[transaction.bucketType]}
                    </td>
                    <td className="text-center p-3">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-bold shadow-sm',
                          transaction.action === 'STOCK'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        )}
                      >
                        {transaction.action}
                      </span>
                    </td>
                    <td className="text-center p-3 font-bold text-slate-700">
                      {Math.abs(transaction.quantity)}
                    </td>
                    <td className="p-3 text-slate-600">{transaction.buyerSeller}</td>
                    <td className="text-center p-3">
                      <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                        {transaction.runningTotal}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="text-center p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(transaction)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(transaction.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
