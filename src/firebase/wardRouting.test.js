import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveJurisdictionRouting,
  rerouteComplaintWard,
  getDesignatedDepartment,
  DEFAULT_MUNICIPAL_DEPARTMENT,
} from './wardRouting'

// Mock firebase/firestore
vi.mock('./services', () => ({
  db: {},
}))

const mockTransaction = {
  get: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
}

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args) => {
    if (args.length === 1) {
      const coll = args[0]
      return { _path: `${coll._collectionPath || 'coll'}/auto-id`, id: 'auto-id' }
    }
    const [_db, coll, id] = args
    return { _path: id ? `${coll}/${id}` : `${coll?._collectionPath || coll}/auto-id`, id }
  }),
  collection: vi.fn((_db, path) => ({ _collectionPath: path })),
  runTransaction: vi.fn((_db, updateFunction) => updateFunction(mockTransaction)),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}))

describe('Ward Jurisdiction Routing & Conflict Resolution (Issue #296)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDesignatedDepartment', () => {
    it('maps known categories to their designated municipal department', () => {
      expect(getDesignatedDepartment('Roads')).toBe('Public Works Department')
      expect(getDesignatedDepartment('Sanitation')).toBe('Waste Management & Sanitation')
      expect(getDesignatedDepartment('Water Supply')).toBe('Water Works & Sewerage Board')
      expect(getDesignatedDepartment('Electricity')).toBe('Electrical & Power Infrastructure')
      expect(getDesignatedDepartment('Parks & Gardens')).toBe('Horticulture & City Greening')
    })

    it('falls back to default municipal department on unknown or missing categories', () => {
      expect(getDesignatedDepartment('Alien Invasion')).toBe(DEFAULT_MUNICIPAL_DEPARTMENT)
      expect(getDesignatedDepartment('')).toBe(DEFAULT_MUNICIPAL_DEPARTMENT)
      expect(getDesignatedDepartment(null)).toBe(DEFAULT_MUNICIPAL_DEPARTMENT)
    })
  })

  describe('resolveJurisdictionRouting', () => {
    it('authoritatively identifies WARD-01 for coordinates inside WARD-01 polygon', () => {
      // WARD-01: lng [77.202, 77.216], lat [28.610, 28.622]
      const result = resolveJurisdictionRouting({
        latitude: 28.615,
        longitude: 77.208,
        category: 'Roads',
      })

      expect(result.insideMunicipalLimits).toBe(true)
      expect(result.wardId).toBe('WARD-01')
      expect(result.wardName).toBe('Central Civic Core & Connaught Ward')
      expect(result.zoneName).toBe('New Delhi Central Zone (Zone A)')
      expect(result.designatedDepartment).toBe('Public Works Department')
      expect(result.jurisdictionMismatch).toBe(false)
      expect(result.auditRemark).toContain('Authoritatively routed to Central Civic Core')
    })

    it('authoritatively identifies WARD-02 for coordinates inside WARD-02 polygon', () => {
      // WARD-02: lng [77.216, 77.232], lat [28.610, 28.622]
      const result = resolveJurisdictionRouting({
        latitude: 28.615,
        longitude: 77.225,
        category: 'Sanitation',
      })

      expect(result.insideMunicipalLimits).toBe(true)
      expect(result.wardId).toBe('WARD-02')
      expect(result.zoneName).toBe('East Civic Heritage Zone (Zone B)')
      expect(result.designatedDepartment).toBe('Waste Management & Sanitation')
      expect(result.jurisdictionMismatch).toBe(false)
    })

    it('flags jurisdictionMismatch: true when physical GPS coordinates lie outside city boundaries', () => {
      const result = resolveJurisdictionRouting({
        latitude: 19.076, // Mumbai coordinates
        longitude: 72.877,
        category: 'Roads',
      })

      expect(result.insideMunicipalLimits).toBe(false)
      expect(result.wardId).toBeNull()
      expect(result.jurisdictionMismatch).toBe(true)
      expect(result.auditRemark).toContain('outside authoritative municipal ward limits')
    })

    it('flags jurisdictionMismatch: true when coordinates are missing or invalid', () => {
      const result = resolveJurisdictionRouting({
        latitude: null,
        longitude: null,
      })

      expect(result.insideMunicipalLimits).toBe(false)
      expect(result.jurisdictionMismatch).toBe(true)
      expect(result.wardId).toBeNull()
    })

    it('detects discrepancy between user-selected textual zone and authoritative physical GPS zone', () => {
      // Point in WARD-01 (Zone A), but user declared Zone D
      const result = resolveJurisdictionRouting({
        latitude: 28.615,
        longitude: 77.208,
        selectedZone: 'South-East Civic Zone (Zone D)',
        category: 'Roads',
      })

      expect(result.insideMunicipalLimits).toBe(true)
      expect(result.wardId).toBe('WARD-01')
      expect(result.jurisdictionMismatch).toBe(true)
      expect(result.auditRemark).toContain('Jurisdiction mismatch detected')
      expect(result.auditRemark).toContain('Zone A')
      expect(result.auditRemark).toContain('Zone D')
    })

    it('handles point lying on polygon vertex or edge boundary cleanly without failing', () => {
      // Vertex of WARD-01
      const result = resolveJurisdictionRouting({
        latitude: 28.610,
        longitude: 77.202,
        category: 'Roads',
      })

      expect(result.insideMunicipalLimits).toBe(true)
      expect(result.wardId).toBeDefined()
    })
  })

  describe('rerouteComplaintWard', () => {
    const adminUser = { uid: 'admin-42', role: 'admin', name: 'Zonal Administrator' }

    it('throws when caller is unauthenticated or not an admin', async () => {
      await expect(
        rerouteComplaintWard('issue-1', 'WARD-02', null)
      ).rejects.toThrow('Authentication required')

      await expect(
        rerouteComplaintWard('issue-1', 'WARD-02', { uid: 'citizen-1', role: 'citizen' })
      ).rejects.toThrow('Only authorized municipal administrators may reroute')
    })

    it('throws when target ward does not exist', async () => {
      await expect(
        rerouteComplaintWard('issue-1', 'INVALID-WARD-999', adminUser)
      ).rejects.toThrow('does not exist in municipal boundary registry')
    })

    it('throws when complaint does not exist in Firestore', async () => {
      mockTransaction.get.mockResolvedValueOnce({
        exists: () => false,
      })

      await expect(
        rerouteComplaintWard('missing-id', 'WARD-02', adminUser)
      ).rejects.toThrow('does not exist')
    })

    it('throws when complaint is already assigned to the target ward', async () => {
      mockTransaction.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'In Progress',
          wardId: 'WARD-02',
          wardName: 'India Gate & Pragati Heritage Ward',
        }),
      })

      await expect(
        rerouteComplaintWard('issue-1', 'WARD-02', adminUser)
      ).rejects.toThrow('already assigned to ward WARD-02')
    })

    it('transactionally reroutes complaint to target ward and writes audit event in issues/{id}/events', async () => {
      mockTransaction.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          status: 'Pending',
          wardId: 'WARD-01',
          wardName: 'Central Civic Core & Connaught Ward',
          zoneName: 'New Delhi Central Zone (Zone A)',
        }),
      })

      const res = await rerouteComplaintWard('issue-1', 'WARD-02', adminUser, {
        remarks: 'Transferred per jurisdictional boundary review',
      })

      expect(res.success).toBe(true)
      expect(res.previousWardId).toBe('WARD-01')
      expect(res.newWardId).toBe('WARD-02')
      expect(res.newWardName).toBe('India Gate & Pragati Heritage Ward')

      expect(mockTransaction.update).toHaveBeenCalledTimes(1)
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ _path: 'issues/issue-1' }),
        expect.objectContaining({
          wardId: 'WARD-02',
          wardName: 'India Gate & Pragati Heritage Ward',
          zoneName: 'East Civic Heritage Zone (Zone B)',
          jurisdictionMismatch: false,
          reroutedBy: 'admin-42',
        })
      )

      expect(mockTransaction.set).toHaveBeenCalledTimes(1)
      expect(mockTransaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ _path: expect.stringContaining('issues/issue-1/events') }),
        expect.objectContaining({
          actorUid: 'admin-42',
          action: 'Administrative ward rerouted',
          remarks: 'Transferred per jurisdictional boundary review',
        })
      )
    })
  })
})
