export function formatRelativeDate(value) {
  if (!value) {
    return 'No recent updates'
  }

  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (Number.isNaN(diffMs)) {
    return value
  }

  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) {
    return `Updated ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export function getInitials(fullName) {
  if (!fullName) {
    return 'BB'
  }

  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0].toUpperCase())
    .join('')
}

export function getProjectAccent(projectId) {
  const accents = [
    'is-blue',
    'is-green',
    'is-purple',
    'is-amber',
    'is-rose',
    'is-pink',
  ]

  return accents[(projectId - 1) % accents.length] || 'is-blue'
}
