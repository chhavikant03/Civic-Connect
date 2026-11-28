import { describe, expect, it } from 'vitest'
import { getTrendingScore, sortTrendingIssues } from './trendingScore'

describe('getTrendingScore', () => {
  const now = new Date('2026-11-28T12:00:00Z').getTime()

  it('calculates the gravity score using the specified formula', () => {
    const issue = {
      upvotesCount: 16,
      createdAt: new Date(now - 2 * 3600000),
    }

    expect(getTrendingScore(issue, now)).toBeCloseTo(16 / 4 ** 1.5)
  })

  it('supports Firestore timestamps', () => {
    const issue = {
      upvotesCount: 8,
      createdAt: { seconds: now / 1000 - 3600 },
    }

    expect(getTrendingScore(issue, now)).toBeCloseTo(8 / 3 ** 1.5)
  })

  it('falls back to the upvotedBy array length', () => {
    const issue = {
      upvotedBy: ['a', 'b', 'c'],
      createdAt: new Date(now),
    }

    expect(getTrendingScore(issue, now)).toBeCloseTo(3 / 2 ** 1.5)
  })

  it('returns zero for invalid creation timestamps', () => {
    expect(
      getTrendingScore({ upvotesCount: 10, createdAt: null }, now)
    ).toBe(0)
  })
})

describe('sortTrendingIssues', () => {
  const now = new Date('2026-11-28T12:00:00Z').getTime()

  it('ranks issues by gravity score, not raw upvote count', () => {
    const issues = [
      {
        id: 'old',
        status: 'Pending',
        upvotesCount: 20,
        createdAt: new Date(now - 48 * 3600000),
      },
      {
        id: 'fresh',
        status: 'In Progress',
        upvotesCount: 10,
        createdAt: new Date(now),
      },
    ]

    expect(sortTrendingIssues(issues, now).map((issue) => issue.id))
      .toEqual(['fresh', 'old'])
  })

  it('excludes resolved, rejected, and merged issues', () => {
    const issues = ['Pending', 'In Progress', 'Reopened', 'Resolved', 'Rejected', 'Merged - Duplicate']
      .map((status) => ({
        id: status,
        status,
        upvotesCount: 5,
        createdAt: new Date(now),
      }))

    expect(sortTrendingIssues(issues, now).map((issue) => issue.status))
      .toEqual(['Pending', 'In Progress', 'Reopened'])
  })

  it('does not mutate the original array', () => {
    const issues = [
      { id: 'a', status: 'Pending', upvotesCount: 1, createdAt: new Date(now) },
      { id: 'b', status: 'Pending', upvotesCount: 5, createdAt: new Date(now) },
    ]

    const original = [...issues]
    sortTrendingIssues(issues, now)

    expect(issues).toEqual(original)
  })
})
