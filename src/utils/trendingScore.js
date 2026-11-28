const TRENDING_STATUSES = new Set([
  'Pending',
  'In Progress',
  'Reopened',
])

function getTimestampMs(createdAt) {
  if (typeof createdAt?.toMillis === 'function') {
    return createdAt.toMillis()
  }

  if (typeof createdAt?.toDate === 'function') {
    return createdAt.toDate().getTime()
  }

  if (createdAt instanceof Date) return createdAt.getTime()

  if (typeof createdAt === 'number') {
    return createdAt < 1e11 ? createdAt * 1000 : createdAt
  }

  if (typeof createdAt === 'string') {
    return new Date(createdAt).getTime()
  }

  if (typeof createdAt?.seconds === 'number') {
    return createdAt.seconds * 1000
  }

  return NaN
}

function getUpvoteCount(issue) {
  if (
    typeof issue.upvotesCount === 'number' &&
    Number.isFinite(issue.upvotesCount)
  ) {
    return Math.max(0, issue.upvotesCount)
  }

  return Array.isArray(issue.upvotedBy) ? issue.upvotedBy.length : 0
}

export function getTrendingScore(issue, now = Date.now()) {
  const createdAtMs = getTimestampMs(issue.createdAt)

  if (!Number.isFinite(createdAtMs)) return 0

  const ageInHours = Math.max(0, now - createdAtMs) / 3600000
  return getUpvoteCount(issue) / (ageInHours + 2) ** 1.5
}

export function sortTrendingIssues(issues, now = Date.now()) {
  return issues
    .filter((issue) => TRENDING_STATUSES.has(issue.status))
    .slice()
    .sort((a, b) => {
      const scoreDifference =
        getTrendingScore(b, now) - getTrendingScore(a, now)

      if (scoreDifference !== 0) return scoreDifference

      return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
    })
}
