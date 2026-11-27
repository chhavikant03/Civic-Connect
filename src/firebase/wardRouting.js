import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './services'
import { findWardForCoordinates } from '@/utils/geo'
import { getWardById, WARD_BOUNDARIES_GEOJSON } from '@/utils/wardBoundaries'
import { buildComplaintEvent } from './complaintEvents'

/**
 * Standard municipal category-to-department routing matrix.
 */
export const CATEGORY_DEPARTMENT_ROUTING = {
  Roads: 'Public Works Department',
  'Potholes & Roads': 'Public Works Department',
  Sanitation: 'Waste Management & Sanitation',
  Garbage: 'Waste Management & Sanitation',
  'Water Supply': 'Water Works & Sewerage Board',
  Drainage: 'Water Works & Sewerage Board',
  Electricity: 'Electrical & Power Infrastructure',
  'Street Lighting': 'Electrical & Power Infrastructure',
  'Parks & Gardens': 'Horticulture & City Greening',
  Encroachment: 'Enforcement & Town Planning',
  Health: 'Public Health & Sanitation',
}

export const DEFAULT_MUNICIPAL_DEPARTMENT = 'Central Municipal Administration'

/**
 * Resolves the designated municipal department for a complaint category.
 *
 * @param {string} [category]
 * @returns {string}
 */
export function getDesignatedDepartment(category) {
  if (!category || typeof category !== 'string') {
    return DEFAULT_MUNICIPAL_DEPARTMENT
  }
  return CATEGORY_DEPARTMENT_ROUTING[category.trim()] || DEFAULT_MUNICIPAL_DEPARTMENT
}

/**
 * Authoritatively validates GPS coordinates against municipal ward boundaries,
 * resolves ward/zone jurisdiction, and detects spatial mismatches against user-selected zones.
 *
 * @param {Object} params
 * @param {number|string} [params.latitude]
 * @param {number|string} [params.longitude]
 * @param {string} [params.selectedZone]
 * @param {string} [params.category]
 * @param {Object} [params.customGeoJson]
 * @returns {Object} Authoritative jurisdiction resolution result
 */
export function resolveJurisdictionRouting({
  latitude,
  longitude,
  selectedZone = null,
  category = null,
  customGeoJson = WARD_BOUNDARIES_GEOJSON,
} = {}) {
  const designatedDepartment = getDesignatedDepartment(category)

  if (latitude == null || longitude == null || latitude === '' || longitude === '') {
    return {
      insideMunicipalLimits: false,
      wardId: null,
      ward: null,
      wardName: null,
      zoneName: null,
      councilorOffice: null,
      helpline: null,
      designatedDepartment,
      jurisdictionMismatch: true,
      auditRemark: 'Missing or incomplete GPS coordinates; routed to Central Headquarters.',
    }
  }

  const ward = findWardForCoordinates(
    { lat: latitude, lng: longitude },
    customGeoJson
  )

  if (!ward) {
    return {
      insideMunicipalLimits: false,
      wardId: null,
      ward: null,
      wardName: null,
      zoneName: null,
      councilorOffice: null,
      helpline: null,
      designatedDepartment,
      jurisdictionMismatch: true,
      auditRemark: 'GPS coordinates lie outside authoritative municipal ward limits; marked for administrative triage.',
    }
  }

  // Detect discrepancy between user-selected textual zone and authoritative physical GPS zone
  let jurisdictionMismatch = false
  let auditRemark = `Authoritatively routed to ${ward.wardName} (${ward.wardId}) in ${ward.zoneName}.`

  if (selectedZone && typeof selectedZone === 'string') {
    const cleanSelected = selectedZone.trim().toLowerCase()
    const cleanAuthoritative = (ward.zoneName || '').trim().toLowerCase()

    if (cleanSelected && cleanAuthoritative && cleanSelected !== cleanAuthoritative) {
      jurisdictionMismatch = true
      auditRemark = `Jurisdiction mismatch detected: physical GPS points to "${ward.zoneName}" (${ward.wardId}), conflicting with user-declared "${selectedZone}".`
    }
  }

  return {
    insideMunicipalLimits: true,
    wardId: ward.wardId,
    ward: ward.wardId,
    wardName: ward.wardName,
    zoneName: ward.zoneName,
    councilorOffice: ward.councilorOffice || null,
    helpline: ward.helpline || null,
    designatedDepartment,
    jurisdictionMismatch,
    auditRemark,
  }
}

/**
 * Transactionally reroutes an existing complaint to a different municipal ward,
 * updating ward metadata and logging an immutable audit event in `issues/{id}/events`.
 *
 * @param {string} complaintId - Target issue document ID
 * @param {string} targetWardId - Destination ward identifier (e.g. 'WARD-02')
 * @param {Object} adminUser - Authenticated admin user { uid, role, name }
 * @param {Object} [options]
 * @param {string} [options.remarks] - Reason for rerouting
 * @param {Object} [options.customDb] - Custom Firestore database instance
 * @param {Object} [options.customGeoJson] - Custom GeoJSON dataset
 * @returns {Promise<Object>} Committed rerouting result
 */
export async function rerouteComplaintWard(
  complaintId,
  targetWardId,
  adminUser,
  options = {}
) {
  if (!complaintId || typeof complaintId !== 'string') {
    throw new Error('Valid complaint ID is required for ward rerouting')
  }
  if (!targetWardId || typeof targetWardId !== 'string') {
    throw new Error('Valid target ward ID is required for ward rerouting')
  }
  if (!adminUser || !adminUser.uid) {
    throw new Error('Authentication required for ward rerouting')
  }
  if (adminUser.role !== 'admin') {
    throw new Error('Only authorized municipal administrators may reroute complaint wards')
  }

  const targetWard = getWardById(targetWardId, options.customGeoJson || WARD_BOUNDARIES_GEOJSON)
  if (!targetWard) {
    throw new Error(`Target ward "${targetWardId}" does not exist in municipal boundary registry`)
  }

  const firestoreDb = options.customDb || db
  const complaintRef = doc(firestoreDb, 'issues', complaintId)

  return runTransaction(firestoreDb, async (transaction) => {
    const complaintSnap = await transaction.get(complaintRef)
    if (!complaintSnap.exists()) {
      throw new Error(`Complaint ${complaintId} does not exist`)
    }

    const complaint = complaintSnap.data()
    const previousWardId = complaint.wardId || complaint.ward || 'UNASSIGNED'
    const previousWardName = complaint.wardName || 'Unassigned'
    const previousZoneName = complaint.zoneName || 'Unassigned'

    if (previousWardId === targetWard.wardId) {
      throw new Error(`Complaint is already assigned to ward ${targetWard.wardId}`)
    }

    const now = serverTimestamp()

    transaction.update(complaintRef, {
      wardId: targetWard.wardId,
      ward: targetWard.wardId,
      wardName: targetWard.wardName,
      zoneName: targetWard.zoneName,
      jurisdictionMismatch: false, // Administrative intervention resolves mismatch
      reroutedAt: now,
      reroutedBy: adminUser.uid,
      updatedAt: now,
    })

    const eventRef = doc(collection(firestoreDb, `issues/${complaintId}/events`))
    const remarks =
      options.remarks ||
      `Administratively rerouted from ${previousWardName} (${previousWardId}) to ${targetWard.wardName} (${targetWard.wardId})`

    const auditEventData = buildComplaintEvent({
      actorUid: adminUser.uid,
      action: 'Administrative ward rerouted',
      previousStatus: complaint.status,
      newStatus: complaint.status,
      remarks,
      metadata: {
        previousWardId,
        previousWardName,
        previousZoneName,
        newWardId: targetWard.wardId,
        newWardName: targetWard.wardName,
        newZoneName: targetWard.zoneName,
      },
    })

    transaction.set(eventRef, auditEventData)

    return {
      success: true,
      complaintId,
      previousWardId,
      newWardId: targetWard.wardId,
      newWardName: targetWard.wardName,
      newZoneName: targetWard.zoneName,
      remarks,
    }
  })
}
