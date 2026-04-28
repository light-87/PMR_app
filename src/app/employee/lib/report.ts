'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const SOURCE_LABEL: Record<string, string> = {
  FACE_SCAN: 'Face',
  ADMIN_MANUAL: 'Admin',
  EMPLOYEE_SELF: 'Self',
}

function inr(value: string | number): string {
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type EmployeeReportPayload = {
  employee: {
    id: string
    name: string
    phone: string
    monthlySalary: string
    openingBalance: string
    joinedDate: string
    active: boolean
  }
  summary: {
    openingBalance: string
    totalEarned: string
    totalPaid: string
    balance: string
    byMonth: { month: string; daysInMonth: number; daysAttended: number; earned: string }[]
  }
  attendance: {
    id: string
    date: string
    markedAt: string
    status: string
    source: string
    approved: boolean
    modified: boolean
    notes: string | null
  }[]
  payments: {
    id: string
    type: string
    monthString: string
    daysInMonth: number
    daysAttended: number
    monthlySalary: string
    calculatedAmount: string
    amountPaid: string
    paidDate: string
    notes: string | null
  }[]
  generatedAt: string
}

export function downloadEmployeeReport(payload: EmployeeReportPayload) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PMR Industries — Employee Report', 40, 50)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Generated ${fmtDateTime(payload.generatedAt)}`, 40, 65)
  doc.setTextColor(0)

  // Employee block
  let y = 90
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(payload.employee.name, 40, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  y += 16
  doc.text(`Phone: ${payload.employee.phone}`, 40, y)
  y += 14
  doc.text(`Monthly salary: INR ${inr(payload.employee.monthlySalary)}`, 40, y)
  y += 14
  doc.text(`Joined: ${fmtDate(payload.employee.joinedDate)}`, 40, y)
  y += 14
  doc.text(`Status: ${payload.employee.active ? 'Active' : 'Inactive'}`, 40, y)
  y += 24

  // Summary box
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 40, y)
  y += 10
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 6 },
    head: [['Opening', 'Total earned', 'Total paid', 'Balance']],
    body: [
      [
        `INR ${inr(payload.summary.openingBalance)}`,
        `INR ${inr(payload.summary.totalEarned)}`,
        `INR ${inr(payload.summary.totalPaid)}`,
        `${Number(payload.summary.balance) >= 0 ? '+' : '-'}INR ${inr(Math.abs(Number(payload.summary.balance)))}`,
      ],
    ],
    headStyles: { fillColor: [25, 118, 210], textColor: 255 },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    'Balance = Opening + Total earned - Total paid. Positive = pending owed; negative = overpaid (carry forward).',
    40,
    y
  )
  doc.setTextColor(0)
  y += 20

  // By-month earnings
  if (payload.summary.byMonth.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Earnings by month', 40, y)
    y += 6
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 5 },
      head: [['Month', 'Days present', 'Days in month', 'Earned (INR)']],
      body: payload.summary.byMonth.map((b) => [
        b.month,
        String(b.daysAttended),
        String(b.daysInMonth),
        inr(b.earned),
      ]),
      headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
  }

  // Payments
  if (payload.payments.length > 0) {
    if (y > 700) {
      doc.addPage()
      y = 50
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Payments received', 40, y)
    y += 6
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 5 },
      head: [['For month', 'Type', 'Days', 'Calculated', 'Paid', 'Paid date']],
      body: payload.payments.map((p) => [
        p.monthString,
        p.type,
        `${p.daysAttended}/${p.daysInMonth}`,
        inr(p.calculatedAmount),
        inr(p.amountPaid),
        fmtDate(p.paidDate),
      ]),
      headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16
  }

  // Attendance log (last 60 entries to keep PDF reasonable; sorted desc already)
  if (payload.attendance.length > 0) {
    if (y > 700) {
      doc.addPage()
      y = 50
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Attendance log (latest ${Math.min(payload.attendance.length, 60)})`, 40, y)
    y += 6
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      head: [['Date', 'Status', 'Source', 'Approved', 'Modified', 'Notes']],
      body: payload.attendance.slice(0, 60).map((a) => [
        fmtDate(a.date),
        a.status,
        SOURCE_LABEL[a.source] ?? a.source,
        a.approved ? 'Yes' : 'No',
        a.modified ? 'Yes' : '',
        a.notes ?? '',
      ]),
      headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    })
  }

  // Footer with page numbers
  const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 80, doc.internal.pageSize.getHeight() - 20)
  }

  const safeName = payload.employee.name.replace(/[^a-z0-9]+/gi, '_')
  doc.save(`employee-report-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export type OverallReportPayload = {
  month: string
  rows: {
    id: string
    name: string
    phone: string
    monthlySalary: string
    openingBalance: string
    totalEarned: string
    totalPaid: string
    balance: string
  }[]
  trend: { month: string; total: string }[]
  totalLabourCost12m: string
  generatedAt: string
}

export function downloadOverallReport(payload: OverallReportPayload) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PMR Industries — Payroll Overview', 40, 50)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`As of ${payload.month} · Generated ${fmtDateTime(payload.generatedAt)}`, 40, 65)
  doc.setTextColor(0)

  let y = 90
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`Total labour cost (last 12 months): INR ${inr(payload.totalLabourCost12m)}`, 40, y)
  y += 20

  // Per-employee table
  doc.setFontSize(11)
  doc.text('Per-employee summary', 40, y)
  y += 6
  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 5 },
    head: [['Employee', 'Phone', 'Salary/mo', 'Earned', 'Paid', 'Balance']],
    body: payload.rows.map((r) => [
      r.name,
      r.phone,
      inr(r.monthlySalary),
      inr(r.totalEarned),
      inr(r.totalPaid),
      `${Number(r.balance) >= 0 ? '+' : '-'}${inr(Math.abs(Number(r.balance)))}`,
    ]),
    headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    foot: [
      [
        'TOTAL',
        '',
        '',
        inr(payload.rows.reduce((acc, r) => acc + Number(r.totalEarned), 0)),
        inr(payload.rows.reduce((acc, r) => acc + Number(r.totalPaid), 0)),
        inr(payload.rows.reduce((acc, r) => acc + Number(r.balance), 0)),
      ],
    ],
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16

  // Trend
  if (y > 700) {
    doc.addPage()
    y = 50
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Labour cost — last 12 months', 40, y)
  y += 6
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5 },
    head: [['Month', 'Labour cost (INR)']],
    body: payload.trend.map((t) => [t.month, inr(t.total)]),
    headStyles: { fillColor: [25, 118, 210], textColor: 255 },
  })

  const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 80, doc.internal.pageSize.getHeight() - 20)
  }

  doc.save(`payroll-overview-${payload.month}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
