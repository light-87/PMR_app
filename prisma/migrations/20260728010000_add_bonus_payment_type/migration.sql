-- AlterEnum
-- BONUS is money paid on top of earned salary. It is deliberately excluded from the
-- running-balance calculation, so paying one never makes an employee look overpaid.
ALTER TYPE "SalaryPaymentType" ADD VALUE IF NOT EXISTS 'BONUS';
