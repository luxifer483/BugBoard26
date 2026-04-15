export const ROUTES = {
  home: '/',
  login: '/login',
  projects: '/projects',
  dashboard: '/dashboard',
  createIssue: '/create-issue',
  profile: '/profile',
}

export function getProjectDashboardRoute(projectId) {
  return `${ROUTES.dashboard}/${projectId}`
}

export function getProjectUserManagementRoute(projectId) {
  return `${ROUTES.projects}/${projectId}/users`
}

export function getProjectCreateIssueRoute(projectId) {
  return `${ROUTES.createIssue}/${projectId}`
}
