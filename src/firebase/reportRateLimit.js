import { serverTimestamp } from 'firebase/firestore'

export const REPORT_SUBMISSION_COOLDOWN_MS = 60_000

export function getRemainingReportCooldownMs(lastSubmittedAt, now = Date.now()) {
  if (!lastSubmittedAt) return 0

  let lastSubmittedAtMs
  if (typeof lastSubmittedAt.toMillis === 'function') {
    lastSubmittedAtMs = lastSubmittedAt.toMillis()
  } else if (lastSubmittedAt instanceof Date) {
    lastSubmittedAtMs = lastSubmittedAt.getTime()
  } else if (typeof lastSubmittedAt === 'number') {
    lastSubmittedAtMs = lastSubmittedAt
  } else {
    return 0
  }

  if (!Number.isFinite(lastSubmittedAtMs)) return 0
  return Math.max(0, lastSubmittedAtMs + REPORT_SUBMISSION_COOLDOWN_MS - now)
}

/**
 * Friendly client-side pre-check. Firestore Security Rules independently
 * enforce the same window using request.time and an atomic limiter write.
 */
export function assertReportCooldownElapsed(lastSubmittedAt, now = Date.now()) {
  const remainingMs = getRemainingReportCooldownMs(lastSubmittedAt, now)
  if (remainingMs <= 0) return

  const seconds = Math.ceil(remainingMs / 1000)
  const error = new Error(
    `Please wait ${seconds} second${seconds === 1 ? '' : 's'} before submitting another report.`
  )
  error.code = 'resource-exhausted'
  throw error
}

export function writeReportRateLimit(transaction, rateLimitRef) {
  transaction.set(rateLimitRef, { lastSubmittedAt: serverTimestamp() })
}
