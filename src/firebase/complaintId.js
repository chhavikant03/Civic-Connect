import { doc, runTransaction } from 'firebase/firestore'
import { db } from './services'

const COUNTER_PATH = 'counters/issueCounter'

function formatId(num) {
  const year = new Date().getFullYear()
  return `CMP-${year}-${String(num).padStart(4, '0')}`
}

export async function generateComplaintId() {
  const ref = doc(db, COUNTER_PATH)
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    let nextNum = 1
    if (snap.exists()) {
      nextNum = snap.data().lastNumber + 1
    }
    transaction.set(ref, { lastNumber: nextNum }, { merge: true })
    return formatId(nextNum)
  })
}

export function getDisplayId(complaint) {
  if (complaint?.complaintId) return complaint.complaintId
  return `CMP-${new Date().getFullYear()}-XXXX`
}
