export const ROUTES = {
  home: '/',
  login: '/login',
  projects: '/projects',
  dashboard: '/dashboard',
}

export function getProjectDashboardRoute(projectId) {
  return `${ROUTES.dashboard}/${projectId}`
}
