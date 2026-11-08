import { beforeEach, describe, expect, it } from 'vitest'
import { generateLocalResponse, getConversation, getModelStatus, saveConversation } from './localAssistant'

beforeEach(() => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
})

describe('local assistant', () => {
  it('persists conversations locally', () => {
    saveConversation([{ role: 'user', content: 'hello' }])
    expect(getConversation()).toEqual([{ role: 'user', content: 'hello' }])
  })

  it('reports an unavailable model instead of using a network service', async () => {
    await expect(generateLocalResponse('hello')).rejects.toThrow('MODEL_UNAVAILABLE')
  })

  it('generates a civic response after local model setup', async () => {
    localStorage.setItem('civic-connect-gemma-model', JSON.stringify({ installed: true }))
    expect(getModelStatus().installed).toBe(true)
    await expect(generateLocalResponse('How do I report a complaint?')).resolves.toContain('New Complaint')
  })
})
