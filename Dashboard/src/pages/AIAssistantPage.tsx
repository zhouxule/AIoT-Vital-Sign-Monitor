import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User } from 'lucide-react'
import { mockChatHistory } from '@/data/mock-data'
import type { ChatMessage } from '@/types'

// ---------------------------------------------------------------------------
// Simulated assistant responses
// ---------------------------------------------------------------------------

const SIMULATED_RESPONSES: string[] = [
  'Based on the current sensor data, all vital signs are within normal ranges. Heart rate is stable at 74 bpm and respiratory rate is 16 brpm.',
  'The ambient temperature is 24.3°C with 48.2% humidity — both are comfortable indoor values. No environmental concerns detected.',
  'The Random Forest model (v1.2.0) is currently deployed with 95.2% accuracy. It processes readings every 5 seconds with an inference latency of ~4.5 ms on the edge device.',
  "I've analyzed the last hour of data. There was one brief elevated heart rate event about 12 minutes ago (112 bpm, anomaly score 0.73) which resolved on its own within 2 minutes.",
  "The MR60BHA1 radar sensor is operating normally. It provides non-contact vital sign monitoring using 60GHz mmWave technology, which doesn't interfere with daily activities.",
]

function getSimulatedResponse(): string {
  return SIMULATED_RESPONSES[
    Math.floor(Math.random() * SIMULATED_RESPONSES.length)
  ]
}

// ---------------------------------------------------------------------------
// Chat Bubble
// ---------------------------------------------------------------------------

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-2.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Assistant Page
// ---------------------------------------------------------------------------

export function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([...mockChatHistory])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isTyping) return

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate assistant response after a delay
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getSimulatedResponse(),
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1200 + Math.random() * 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col p-6">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-500" />
            AI Health Assistant
          </CardTitle>
        </CardHeader>

        {/* Messages area */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="space-y-4 p-6">
              {/* Welcome message */}
              <div className="mb-6 rounded-lg border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                <Bot className="mx-auto mb-2 h-8 w-8 text-violet-500" />
                <p className="font-medium text-foreground">
                  Welcome to the AI Health Assistant
                </p>
                <p className="mt-1">
                  Ask natural-language questions about recorded sensor readings, historical trends, or anomaly events.
                </p>
                <p className="mt-2 text-xs text-muted-foreground/80 italic">
                  Note: AI-generated summaries are for monitoring and research purposes only and do not constitute clinical diagnosis.
                </p>
              </div>

              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}

              {isTyping && <TypingIndicator />}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input area */}
        <div className="shrink-0 border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about vital signs, anomalies, or system status…"
              disabled={isTyping}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="default"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
