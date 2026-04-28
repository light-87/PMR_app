'use client'

import type { LabeledDescriptor } from '@/lib/face-recognition'
import { descriptorFromArray, descriptorToArray } from '@/lib/face-recognition'

const KEY = 'payroll-lab.faces'

type StoredEntry = { label: string; descriptors: number[][] }

export function loadEnrolled(): LabeledDescriptor[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as StoredEntry[]
    return parsed.map((e) => ({
      label: e.label,
      descriptors: e.descriptors.map(descriptorFromArray),
    }))
  } catch {
    return []
  }
}

export function saveEnrolled(entries: LabeledDescriptor[]): void {
  if (typeof window === 'undefined') return
  const serialised: StoredEntry[] = entries.map((e) => ({
    label: e.label,
    descriptors: e.descriptors.map(descriptorToArray),
  }))
  window.localStorage.setItem(KEY, JSON.stringify(serialised))
}

export function addEnrollment(label: string, descriptors: Float32Array[]): LabeledDescriptor[] {
  const current = loadEnrolled()
  const existing = current.find((e) => e.label.toLowerCase() === label.toLowerCase())
  if (existing) {
    existing.descriptors.push(...descriptors)
  } else {
    current.push({ label, descriptors })
  }
  saveEnrolled(current)
  return current
}

export function removeEnrollment(label: string): LabeledDescriptor[] {
  const current = loadEnrolled().filter((e) => e.label !== label)
  saveEnrolled(current)
  return current
}

export function clearEnrolled(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
}
