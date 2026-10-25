export const ROUTES = {
  home: '/',
  login: '/login',
  projects: '/projects',
  users: '/users',
  createProject: '/projects/new',
  dashboard: '/dashboard',
  createIssue: '/create-issue',
  profile: '/profile',
}

export function getProjectDashboardRoute(projectId) {
  return `${ROUTES.dashboard}/${projectId}`
}

export function getProjectMembersRoute(projectId) {
  return `${ROUTES.projects}/${projectId}/members`
}

export function getProjectCreateIssueRoute(projectId) {
  return `${ROUTES.createIssue}/${projectId}`
}
