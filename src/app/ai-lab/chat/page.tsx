'use client'

import { useState, useRef, useEffect } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Loader2, MessageSquare, User, Bot, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  queryType?: string
}

const SUGGESTED_QUESTIONS = [
  { category: 'Sales & Inventory', color: 'border-blue-200 bg-blue-50 text-blue-700', questions: [
    'गेल्या आठवड्यात किती विक्री झाली?',
    'सर्वात जास्त कोणता बकेट विकला गेला?',
    'पल्लवी warehouse मध्ये stock किती आहे?',
    'आजचा stock movement काय आहे?',
    'या महिन्यात किती Tata G विकले?',
    'कोणत्या warehouse मध्ये सर्वात कमी stock आहे?',
  ]},
  { category: 'Financial', color: 'border-green-200 bg-green-50 text-green-700', questions: [
    'आजचा income किती आहे?',
    'या महिन्यात profit किती झाला?',
    'Cash account मध्ये किती income आला?',
    'गेल्या महिन्याचा expense summary दे',
    'Transport वर किती खर्च झाला?',
    'आज कोणकोणाचे payment आले?',
  ]},
  { category: 'Production & Stock', color: 'border-orange-200 bg-orange-50 text-orange-700', questions: [
    'Urea stock किती आहे?',
    'किती batch बनवता येतील?',
    'गेल्या आठवड्यात किती production झाले?',
    'DEF stock level काय आहे?',
    'शेवटची urea addition कधी झाली?',
  ]},
  { category: 'Leads & CRM', color: 'border-purple-200 bg-purple-50 text-purple-700', questions: [
    'How many leads are active?',
    'आज कोणाला follow-up करायचा?',
    'किती leads interested stage मध्ये आहेत?',
    'या आठवड्यात कोणत्या visits scheduled आहेत?',
    'कोणत्या company चा lead convert झाला?',
  ]},
  { category: 'Customer', color: 'border-cyan-200 bg-cyan-50 text-cyan-700', questions: [
    'रमेश चे transactions दाखव',
    'या महिन्यात कोणत्या customer ने सर्वात जास्त खरेदी केली?',
    'Diesel Petroleum चा statement दे',
    'नवीन customers या महिन्यात किती आले?',
  ]},
]

export default function AskPMRPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-lab/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })

      const data = await res.json()
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.success ? data.data.answer : `Error: ${data.error}`,
        queryType: data.data?.queryType,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Network error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Link href="/ai-lab">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Ask PMR</h1>
            <p className="text-sm text-muted-foreground">Ask business questions in Marathi or English</p>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 mb-4">
          <p className="text-xs text-blue-700">
            Read-only — this only reads your data, never writes to the database.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="py-4">
              <div className="text-center mb-6">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">Ask anything about your business</p>
              </div>

              {/* Categorized suggestions */}
              <div className="space-y-3">
                {SUGGESTED_QUESTIONS.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lightbulb className="h-3 w-3 text-amber-500" />
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{cat.category}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.questions.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border hover:opacity-80 transition-opacity ${cat.color}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                {msg.queryType && (
                  <span className="text-[10px] opacity-60 mt-1 block">
                    Source: {msg.queryType.replace(/_/g, ' ').toLowerCase()}
                  </span>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t pt-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question... (Marathi or English)"
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  )
}
