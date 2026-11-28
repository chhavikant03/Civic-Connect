import { describe, expect, it } from 'vitest'
import {
  assertReportCooldownElapsed,
  getRemainingReportCooldownMs,
  REPORT_SUBMISSION_COOLDOWN_MS,
} from './reportRateLimit'

describe('report submission cooldown', () => {
  it('allows a first report when no prior timestamp exists', () => {
    expect(getRemainingReportCooldownMs(null, 1000)).toBe(0)
    expect(() => assertReportCooldownElapsed(null, 1000)).not.toThrow()
  })

  it('calculates the remaining window from Firestore Timestamp-like values', () => {
    const submittedAt = { toMillis: () => 10_000 }
    expect(getRemainingReportCooldownMs(submittedAt, 10_001)).toBe(59_999)
  })

  it('blocks another report until the full 60 seconds elapse', () => {
    const submittedAt = 50_000

    try {
      assertReportCooldownElapsed(submittedAt, 109_999)
      throw new Error('Expected the cooldown check to reject the submission.')
    } catch (error) {
      expect(error.message).toMatch(/wait 1 second/i)
      expect(error.code).toBe('resource-exhausted')
    }
  })

  it('allows the next report exactly at the 60-second boundary', () => {
    const submittedAt = new Date(75_000)
    const nextAllowedAt = 75_000 + REPORT_SUBMISSION_COOLDOWN_MS

    expect(getRemainingReportCooldownMs(submittedAt, nextAllowedAt)).toBe(0)
    expect(() => assertReportCooldownElapsed(submittedAt, nextAllowedAt)).not.toThrow()
  })
})
