import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './services'
import { addNotificationToBatch } from './notifications'
import { buildComplaintEvent } from './complaintEvents'
import { getDisplayId } from './complaintId'

export const MAX_MERGE_TREE_DEPTH = 3

/**
 * Resolves the canonical root complaint in a hierarchy.
 * Traverses up through mergedIntoId links, ensuring acyclic graph structure and depth bounds.
 *
 * @param {Object} transaction - Firestore transaction instance
 * @param {string} initialParentId - Starting parent complaint ID
 * @param {Object} initialParent - Starting parent complaint data
 * @param {string} childId - Child ID to prevent cycles
 * @returns {Promise<{ canonicalParentId: string, canonicalParent: Object, depth: number }>}
 */
export async function resolveCanonicalRoot(transaction, initialParentId, initialParent, childId) {
  let canonicalParentId = initialParentId
  let canonicalParent = initialParent
  let depth = 1
  const visited = new Set([childId, initialParentId])

  while (
    canonicalParent.status === 'Merged - Duplicate' &&
    (canonicalParent.mergedIntoId || canonicalParent.mergedInto)
  ) {
    depth++
    if (depth > MAX_MERGE_TREE_DEPTH) {
      throw new Error(`Merge exceeds maximum allowed tree depth limit of ${MAX_MERGE_TREE_DEPTH}`)
    }

    const nextId = canonicalParent.mergedIntoId || canonicalParent.mergedInto
    if (visited.has(nextId)) {
      throw new Error('Circular merge detected in complaint hierarchy')
    }
    visited.add(nextId)

    const nextRef = doc(db, 'issues', nextId)
    const nextSnap = await transaction.get(nextRef)
    if (!nextSnap.exists()) {
      throw new Error(`Canonical root complaint ${nextId} no longer exists`)
    }

    canonicalParentId = nextId
    canonicalParent = nextSnap.data()
  }

  return { canonicalParentId, canonicalParent, depth }
}

/**
 * Merges a child duplicate complaint into a canonical parent complaint.
 * Enforces strict tree invariants (depth limit <= 3, cycle prevention, canonical root resolution).
 */
export async function mergeComplaints({
  childId,
  parentId,
  actorUid = null,
  expectedChildStatus = null,
  resolveToCanonicalRoot = false,
}) {
  if (!childId || !parentId) {
    throw new Error('Both childId and parentId are required for merging')
  }

  if (childId === parentId) {
    throw new Error('Cannot merge a complaint into itself')
  }

  const childRef = doc(db, 'issues', childId)
  const parentRef = doc(db, 'issues', parentId)

  return runTransaction(db, async transaction => {
    const [childSnap, parentSnap] = await Promise.all([
      transaction.get(childRef),
      transaction.get(parentRef),
    ])

    if (!childSnap.exists()) {
      throw new Error('Child complaint no longer exists')
    }
    if (!parentSnap.exists()) {
      throw new Error('Parent complaint no longer exists')
    }

    const child = childSnap.data()
    let parent = parentSnap.data()
    let targetParentId = parentId
    let treeDepth = 1

    if (expectedChildStatus && child.status !== expectedChildStatus) {
      throw new Error(`Child complaint status changed from ${expectedChildStatus} to ${child.status}`)
    }

    if (child.status === 'Merged - Duplicate') {
      throw new Error('Complaint is already merged')
    }

    // Circular merge detection: parent cannot be merged into child, and child cannot be an ancestor of parent
    if (
      parent.mergedInto === childId ||
      parent.mergedIntoId === childId ||
      (child.complaintId && (parent.mergedInto === child.complaintId || parent.mergedIntoId === child.complaintId)) ||
      (Array.isArray(child.mergedChildIds) &&
        (child.mergedChildIds.includes(parentId) ||
          (parent.complaintId && child.mergedChildIds.includes(parent.complaintId))))
    ) {
      throw new Error('Circular merge detected')
    }

    if (parent.status === 'Merged - Duplicate') {
      if (resolveToCanonicalRoot) {
        // Automatically resolve to true canonical root
        const resolved = await resolveCanonicalRoot(transaction, parentId, parent, childId)
        targetParentId = resolved.canonicalParentId
        parent = resolved.canonicalParent
        treeDepth = resolved.depth
      } else {
        throw new Error('Cannot merge into a complaint that is already marked as duplicate')
      }
    }

    if (parent.status === 'Rejected') {
      throw new Error('Cannot merge into a rejected complaint')
    }

    // Depth bounds verification
    const childTreeDepth = child.mergeDepth || 1
    if (childTreeDepth + treeDepth - 1 > MAX_MERGE_TREE_DEPTH) {
      throw new Error(`Merge exceeds maximum allowed tree depth limit of ${MAX_MERGE_TREE_DEPTH}`)
    }

    const canonicalParentRef = targetParentId === parentId ? parentRef : doc(db, 'issues', targetParentId)
    const parentDisplayId = getDisplayId(parent)
    const childDisplayId = getDisplayId(child)
    const parentComplaintId = parent.complaintId || targetParentId

    // 1. Update child complaint
    transaction.update(childRef, {
      status: 'Merged - Duplicate',
      mergedInto: parentComplaintId,
      mergedIntoId: targetParentId,
      canonicalRootId: targetParentId,
      canonicalStatus: parent.status,
      mergeDepth: treeDepth + 1,
      mergedAt: serverTimestamp(),
      mergedBy: actorUid ?? null,
      updatedAt: serverTimestamp(),
    })

    // 2. Consolidate endorsers onto parent ticket without duplicates
    const parentEndorsers = (Array.isArray(parent.endorsedBy) ? parent.endorsedBy : []).filter(Boolean)
    const childEndorsers = (Array.isArray(child.endorsedBy) ? child.endorsedBy : []).filter(Boolean)
    const consolidatedEndorsers = Array.from(new Set([...parentEndorsers, ...childEndorsers]))
    const endorsementCount = consolidatedEndorsers.length

    const existingChildIds = Array.isArray(parent.mergedChildIds) ? parent.mergedChildIds : []
    const childMergedIds = Array.isArray(child.mergedChildIds) ? child.mergedChildIds : []
    const mergedChildIds = Array.from(new Set([...existingChildIds, childId, ...childMergedIds]))

    const existingChildComplaintIds = Array.isArray(parent.mergedChildComplaintIds)
      ? parent.mergedChildComplaintIds
      : []
    const childCid = child.complaintId || childDisplayId
    const childMergedComplaintIds = Array.isArray(child.mergedChildComplaintIds)
      ? child.mergedChildComplaintIds
      : []
    const mergedChildComplaintIds = Array.from(
      new Set([...existingChildComplaintIds, childCid, ...childMergedComplaintIds])
    )

    // Consolidate reporters who filed merged duplicate tickets
    const existingReporters = Array.isArray(parent.mergedReporters) ? parent.mergedReporters : []
    const childReporters = Array.isArray(child.mergedReporters) ? child.mergedReporters : []
    const childAuthor = child.reportedBy ? [child.reportedBy] : []
    const mergedReporters = Array.from(
      new Set([...existingReporters, ...childAuthor, ...childReporters])
    ).filter(uid => uid && uid !== parent.reportedBy)

    transaction.update(canonicalParentRef, {
      mergedChildIds,
      mergedChildComplaintIds,
      mergedReporters,
      endorsedBy: consolidatedEndorsers,
      endorsementCount,
      updatedAt: serverTimestamp(),
    })

    // 3. Log audit event on child complaint
    const childEventRef = doc(collection(db, `issues/${childId}/events`))
    transaction.set(
      childEventRef,
      buildComplaintEvent({
        actorUid,
        action: 'Complaint merged',
        previousStatus: child.status,
        newStatus: 'Merged - Duplicate',
        remarks: `Merged into complaint ${parentComplaintId}`,
      })
    )

    // 4. Log audit event on parent complaint
    const parentEventRef = doc(collection(db, `issues/${targetParentId}/events`))
    transaction.set(
      parentEventRef,
      buildComplaintEvent({
        actorUid,
        action: 'Duplicate complaint consolidated',
        previousStatus: parent.status,
        newStatus: parent.status,
        remarks: `Consolidated duplicate complaint ${childDisplayId}`,
      })
    )

    // 5. Dispatch citizen notification to child ticket creator
    if (child.reportedBy) {
      addNotificationToBatch(transaction, {
        recipientUid: child.reportedBy,
        recipientRole: 'citizen',
        senderUid: actorUid || '',
        issueId: parentComplaintId,
        type: 'status_update',
        title: 'Complaint Merged',
        message: `Your complaint has been consolidated with ticket ${parentComplaintId} and will be tracked jointly.`,
      })
    }

    return {
      success: true,
      parentComplaintId,
      parentDisplayId,
      childComplaintId: childDisplayId,
      canonicalRootId: targetParentId,
      mergeDepth: treeDepth + 1,
    }
  })
}

/**
 * Restores a mistakenly merged complaint back to its prior active status,
 * detaching it from the consolidated parent ticket with an audit trail.
 *
 * @param {Object} params
 * @param {string} params.childId
 * @param {string} params.parentId
 * @param {string} [params.actorUid]
 * @param {string} [params.restoreStatus='Pending']
 * @returns {Promise<Object>} Unmerge result
 */
export async function unmergeComplaint({
  childId,
  parentId,
  actorUid = null,
  restoreStatus = 'Pending',
}) {
  if (!childId || !parentId) {
    throw new Error('Both childId and parentId are required for unmerging')
  }

  const childRef = doc(db, 'issues', childId)
  const parentRef = doc(db, 'issues', parentId)

  return runTransaction(db, async transaction => {
    const [childSnap, parentSnap] = await Promise.all([
      transaction.get(childRef),
      transaction.get(parentRef),
    ])

    if (!childSnap.exists()) {
      throw new Error('Child complaint does not exist')
    }
    if (!parentSnap.exists()) {
      throw new Error('Parent complaint does not exist')
    }

    const child = childSnap.data()
    const parent = parentSnap.data()

    if (child.status !== 'Merged - Duplicate') {
      throw new Error('Complaint is not in Merged - Duplicate status')
    }

    const matchesParent =
      child.mergedIntoId === parentId ||
      child.canonicalRootId === parentId ||
      child.mergedInto === (parent.complaintId || parentId)

    if (!matchesParent) {
      throw new Error(`Child complaint is not consolidated into parent ${parentId}`)
    }

    const childDisplayId = getDisplayId(child)
    const parentDisplayId = getDisplayId(parent)
    const now = serverTimestamp()

    // 1. Restore child document
    transaction.update(childRef, {
      status: restoreStatus,
      mergedInto: null,
      mergedIntoId: null,
      canonicalRootId: null,
      canonicalStatus: null,
      mergeDepth: 1,
      unmergedAt: now,
      unmergedBy: actorUid,
      updatedAt: now,
    })

    // 2. Remove child from parent consolidated lists
    const existingChildIds = Array.isArray(parent.mergedChildIds) ? parent.mergedChildIds : []
    const updatedChildIds = existingChildIds.filter(id => id !== childId)

    const childCid = child.complaintId || childDisplayId
    const existingChildCids = Array.isArray(parent.mergedChildComplaintIds)
      ? parent.mergedChildComplaintIds
      : []
    const updatedChildCids = existingChildCids.filter(cid => cid !== childCid)

    const existingReporters = Array.isArray(parent.mergedReporters) ? parent.mergedReporters : []
    const updatedReporters = existingReporters.filter(uid => uid !== child.reportedBy)

    transaction.update(parentRef, {
      mergedChildIds: updatedChildIds,
      mergedChildComplaintIds: updatedChildCids,
      mergedReporters: updatedReporters,
      updatedAt: now,
    })

    // 3. Log audit event on child
    const childEventRef = doc(collection(db, `issues/${childId}/events`))
    transaction.set(
      childEventRef,
      buildComplaintEvent({
        actorUid,
        action: 'Complaint unmerged',
        previousStatus: 'Merged - Duplicate',
        newStatus: restoreStatus,
        remarks: `Unmerged and restored from ticket ${parentDisplayId}`,
      })
    )

    // 4. Log audit event on parent
    const parentEventRef = doc(collection(db, `issues/${parentId}/events`))
    transaction.set(
      parentEventRef,
      buildComplaintEvent({
        actorUid,
        action: 'Consolidated duplicate detached',
        previousStatus: parent.status,
        newStatus: parent.status,
        remarks: `Detached child duplicate complaint ${childDisplayId}`,
      })
    )

    // 5. Notify child reporter
    if (child.reportedBy) {
      addNotificationToBatch(transaction, {
        recipientUid: child.reportedBy,
        recipientRole: 'citizen',
        senderUid: actorUid || '',
        issueId: child.complaintId || childId,
        type: 'status_update',
        title: 'Complaint Reactivated',
        message: `Your complaint has been unmerged from ${parentDisplayId} and restored to active ${restoreStatus} status.`,
      })
    }

    return {
      success: true,
      childId,
      parentId,
      restoredStatus: restoreStatus,
    }
  })
}

/**
 * Synchronizes lifecycle milestones on a canonical root ticket across all
 * children in its consolidated duplicate cluster transactionally.
 *
 * @param {string} rootComplaintId - Canonical ticket document ID
 * @param {string} newStatus - New root lifecycle status (e.g. 'Resolved', 'In Progress')
 * @param {string} [actorUid]
 * @returns {Promise<Object>} Synchronization result
 */
export async function syncMergedClusterLifecycle(rootComplaintId, newStatus, actorUid = null) {
  if (!rootComplaintId || !newStatus) {
    throw new Error('Valid rootComplaintId and newStatus are required')
  }

  const rootRef = doc(db, 'issues', rootComplaintId)

  return runTransaction(db, async transaction => {
    const rootSnap = await transaction.get(rootRef)
    if (!rootSnap.exists()) {
      throw new Error(`Root complaint ${rootComplaintId} does not exist`)
    }

    const rootData = rootSnap.data()
    const childIds = Array.isArray(rootData.mergedChildIds) ? rootData.mergedChildIds : []

    if (childIds.length === 0) {
      return { success: true, synchronizedCount: 0 }
    }

    const childSnaps = await Promise.all(
      childIds.map(id => transaction.get(doc(db, 'issues', id)))
    )

    const now = serverTimestamp()

    for (let i = 0; i < childSnaps.length; i++) {
      const snap = childSnaps[i]
      if (!snap.exists()) continue

      const cRef = doc(db, 'issues', childIds[i])
      transaction.update(cRef, {
        canonicalStatus: newStatus,
        updatedAt: now,
      })

      const eventRef = doc(collection(db, `issues/${childIds[i]}/events`))
      transaction.set(
        eventRef,
        buildComplaintEvent({
          actorUid,
          action: 'Cluster lifecycle synchronized',
          previousStatus: 'Merged - Duplicate',
          newStatus: 'Merged - Duplicate',
          remarks: `Canonical ticket transitioned to "${newStatus}"`,
        })
      )
    }

    return {
      success: true,
      synchronizedCount: childSnaps.filter(s => s.exists()).length,
      newStatus,
    }
  })
}
