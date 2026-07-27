import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './services'

export async function createNotification({
  recipientUid = null,
  recipientRole,
  senderUid,
  issueId,
  type,
  title,
  message,
}) {
  await addDoc(collection(db, 'notifications'), {
    recipientUid,
    recipientRole,
    senderUid,
    issueId,
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
  })
}
