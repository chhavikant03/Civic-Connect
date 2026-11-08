import { useEffect, useRef, useState } from 'react'
import { Bot, Download, HardDrive, Send, Square, Trash2, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  clearConversation,
  downloadModel,
  GEMMA_MODEL,
  generateLocalResponse,
  getConversation,
  getModelStatus,
  removeModel,
  saveConversation,
} from '@/services/localAssistant'

const welcome = {
  role: 'assistant',
  content: 'Hi! I am Civic Assistant. Download the Gemma 4 model once while online, then ask supported civic questions in airplane mode.',
}

export function AssistantPage() {
  const [messages, setMessages] = useState(() => getConversation().length ? getConversation() : [welcome])
  const [model, setModel] = useState(getModelStatus)
  const [prompt, setPrompt] = useState('')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef(null)

  useEffect(() => saveConversation(messages), [messages])

  const handleDownload = async () => {
    setError('')
    setProgress(0)
    setBusy(true)
    controller.current = new AbortController()
    try {
      await downloadModel(setProgress, controller.current.signal)
      setModel(getModelStatus())
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setBusy(false)
      controller.current = null
    }
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const value = prompt.trim()
    if (!value || busy) return
    setPrompt('')
    setError('')
    const next = [...messages, { role: 'user', content: value }]
    setMessages(next)
    setBusy(true)
    controller.current = new AbortController()
    try {
      const content = await generateLocalResponse(value, { signal: controller.current.signal })
      setMessages([...next, { role: 'assistant', content }])
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message === 'MODEL_UNAVAILABLE'
        ? 'The local model is not installed. Download Gemma 4 above while online, then try again.'
        : 'The local assistant could not generate a response. Check available memory and try again.')
    } finally {
      setBusy(false)
      controller.current = null
    }
  }

  const cancel = () => controller.current?.abort()
  const reset = () => {
    clearConversation()
    setMessages([welcome])
  }
  const uninstall = async () => {
    await removeModel()
    setModel(getModelStatus())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Civic Assistant</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Private, on-device help for civic questions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-primary-600" />Gemma 4 on-device model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>{GEMMA_MODEL.name} · {GEMMA_MODEL.sizeLabel} · {GEMMA_MODEL.minMemoryGb} GB RAM minimum</span>
            {model.installed ? <span className="font-medium text-emerald-600">Ready for offline use</span> : <span className="text-amber-600">Not installed</span>}
          </div>
          {busy && progress > 0 && !model.installed && <progress className="h-2 w-full" value={progress} max="1" />}
          <div className="flex flex-wrap gap-2">
            {!model.installed && <Button onClick={handleDownload} disabled={busy}><Download />{busy ? `Downloading ${Math.round(progress * 100)}%` : 'Download model'}</Button>}
            {model.installed && <Button variant="outline" onClick={uninstall}>Remove local model</Button>}
            <span className="flex items-center gap-1 text-xs text-gray-500"><WifiOff className="h-4 w-4" />No remote AI calls during generation</span>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card className="flex min-h-[480px] flex-col">
        <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && <Bot className="mt-1 h-5 w-5 shrink-0 text-primary-600" />}
                <p className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${message.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{message.content}</p>
              </div>
            ))}
            {busy && model.installed && <p className="text-sm text-gray-500">Generating locally…</p>}
          </div>
          <form onSubmit={handleSend} className="flex gap-2">
            <input value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={busy} placeholder="Ask about Civic-Connect…" className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 text-sm outline-none focus:border-primary-500 dark:border-gray-700" />
            {busy ? <Button type="button" variant="outline" onClick={cancel} aria-label="Cancel generation"><Square /></Button> : <Button type="submit" disabled={!prompt.trim()} aria-label="Send message"><Send /></Button>}
            <Button type="button" variant="ghost" onClick={reset} aria-label="Clear conversation"><Trash2 /></Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
