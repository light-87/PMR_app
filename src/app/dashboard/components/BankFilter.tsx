'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ACCOUNT_LABELS, ExpenseAccount } from '@/types'
import { X } from 'lucide-react'

interface BankFilterProps {
  selectedBanks: ExpenseAccount[]
  onBanksChange: (banks: ExpenseAccount[]) => void
}

const ALL_BANKS: ExpenseAccount[] = [
  'CASH',
  'PRASHANT_GAYDHANE',
  'PMR',
  'KPG_SAVING',
  'KP_ENTERPRISES',
]

export function BankFilter({ selectedBanks, onBanksChange }: BankFilterProps) {
  const isAllSelected = selectedBanks.length === 0
  const isBankSelected = (bank: ExpenseAccount) =>
    isAllSelected || selectedBanks.includes(bank)

  const toggleBank = (bank: ExpenseAccount) => {
    if (selectedBanks.includes(bank)) {
      onBanksChange(selectedBanks.filter(b => b !== bank))
    } else {
      onBanksChange([...selectedBanks, bank])
    }
  }

  const selectAll = () => {
    onBanksChange([])
  }

  const clearAll = () => {
    onBanksChange([ALL_BANKS[0]])
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Filter by Bank/Account</label>
            <div className="flex gap-2">
              {!isAllSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
              )}
              {selectedBanks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={isAllSelected ? 'default' : 'outline'}
              size="sm"
              onClick={selectAll}
              className="h-8"
            >
              All Banks
            </Button>
            {ALL_BANKS.map((bank) => (
              <Button
                key={bank}
                variant={isBankSelected(bank) && !isAllSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleBank(bank)}
                className="h-8"
              >
                {ACCOUNT_LABELS[bank]}
              </Button>
            ))}
          </div>

          {!isAllSelected && (
            <p className="text-xs text-muted-foreground">
              Showing data for {selectedBanks.length} bank{selectedBanks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
