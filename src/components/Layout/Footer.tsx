'use client'

import { Coffee } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-gradient-to-r from-slate-50 to-slate-100 mt-12">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
          <span className="text-slate-600 font-medium">
            Developed by Vaibhav 🤗
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <a
            href="https://buymeacoffee.com/vaibhavtalekar87"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <Coffee className="h-4 w-4" />
            <span>Buy me a coffee</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
