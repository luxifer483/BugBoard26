// Dati statici usati dai moduli API quando `VITE_USE_MOCK_API` non e' impostata a `false`.
// Permettono di sviluppare l'interfaccia anche senza backend disponibile.
export const mockUser = {
  id: 1,
  fullName: 'John Doe',
  email: 'john.doe@bugboard26.dev',
  role: 'Developer',
  avatarUrl: '',
}

// Elenco mock di utenti disponibili per assegnazioni, profili e membership.
export const mockUsers = [
  mockUser,
  {
    id: 2,
    fullName: 'Alice Johnson',
    email: 'alice.johnson@bugboard26.dev',
    role: 'Project Manager',
    avatarUrl: '',
  },
  {
    id: 3,
    fullName: 'Marco Rossi',
    email: 'marco.rossi@bugboard26.dev',
    role: 'Tester',
    avatarUrl: '',
  },
]

// Collezione mock per simulare la risposta dell'endpoint `/projects`.
export const mockProjects = [
  {
    id: 1,
    name: 'BugBoard26 Core',
    description: 'Main application development and bug tracking',
    totalIssues: 45,
    openIssues: 12,
    closedIssues: 33,
    memberCount: 8,
    updatedAt: '2026-03-30T09:15:00',
  },
  {
    id: 2,
    name: 'Mobile App',
    description: 'iOS and Android mobile applications',
    totalIssues: 28,
    openIssues: 15,
    closedIssues: 13,
    memberCount: 5,
    updatedAt: '2026-03-30T06:30:00',
  },
  {
    id: 3,
    name: 'API Development',
    description: 'RESTful API and backend services',
    totalIssues: 34,
    openIssues: 8,
    closedIssues: 26,
    memberCount: 6,
    updatedAt: '2026-03-29T13:00:00',
  },
  {
    id: 4,
    name: 'Documentation',
    description: 'User guides and technical documentation',
    totalIssues: 12,
    openIssues: 4,
    closedIssues: 8,
    memberCount: 3,
    updatedAt: '2026-03-27T15:00:00',
  },
  {
    id: 5,
    name: 'Infrastructure',
    description: 'DevOps, CI/CD, and cloud infrastructure',
    totalIssues: 19,
    openIssues: 6,
    closedIssues: 13,
    memberCount: 4,
    updatedAt: '2026-03-29T23:45:00',
  },
  {
    id: 6,
    name: 'UI/UX Design',
    description: 'Design system and user interface improvements',
    totalIssues: 23,
    openIssues: 10,
    closedIssues: 13,
    memberCount: 4,
    updatedAt: '2026-03-30T03:10:00',
  },
]

// Collezione mock per simulare la risposta dell'endpoint `/issues`.
export const mockIssues = [
  {
    id: 41,
    code: 'BUG-26-41',
    title: 'Login button not responding on mobile devices',
    description: 'When users attempt to click the login button on mobile devices tested on iPhone 12, iPhone 14, and Samsung Galaxy S21, the button does not respond to touch events. The issue appears to be specific to mobile browsers Safari and Chrome mobile. Desktop browsers work as expected.\n\nSteps to reproduce:\n1. Navigate to the login page on a mobile device\n2. Enter valid credentials\n3. Tap the login button\n4. Nothing happens, no loading state, no error message\n\nExpected behavior: The login process should initiate and the user should be redirected to the dashboard upon successful authentication.',
    type: 'BUG',
    priority: 'HIGH',
    status: 'OPEN',
    reporter: mockUsers[1],
    assignee: mockUsers[0],
    project: mockProjects[0],
    createdAt: '2026-03-15T09:00:00',
    updatedAt: '2026-03-16T11:20:00',
    attachmentUrl: '',
  },
  {
    id: 39,
    code: 'BUG-26-39',
    title: 'Notifications badge does not refresh immediately',
    description: 'Unread notifications count updates only after a full page refresh.',
    type: 'BUG',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    reporter: mockUsers[2],
    assignee: mockUsers[0],
    project: mockProjects[1],
    createdAt: '2026-03-28T14:30:00',
    updatedAt: '2026-03-30T07:10:00',
    attachmentUrl: '',
  },
]

// Collezione mock per simulare la risposta dell'endpoint `/comments`.
export const mockComments = [
  {
    id: 1,
    content: 'I identified the issue. The event listener is not properly attached on mobile Safari. Working on a fix now.',
    author: mockUsers[2],
    issueId: 41,
    createdAt: '2026-03-15T10:30:00',
  },
  {
    id: 2,
    content: 'Thanks for the update! Let me know if you need any help with testing on iOS devices.',
    author: mockUsers[0],
    issueId: 41,
    createdAt: '2026-03-15T14:45:00',
  },
  {
    id: 3,
    content: 'I have pushed a potential fix to the dev branch. Could someone test it on iPhone 14 and iPad?',
    author: mockUsers[2],
    issueId: 41,
    createdAt: '2026-03-16T09:15:00',
  },
  {
    id: 4,
    content: 'Tested on iPhone 14 Pro. The login button is now working correctly. Great job.',
    author: {
      id: 4,
      fullName: 'Alex Rivera',
      email: 'alex.rivera@bugboard26.dev',
      role: 'QA Engineer',
      avatarUrl: '',
    },
    issueId: 41,
    createdAt: '2026-03-16T11:20:00',
  },
]

// Collezione mock per simulare la risposta dell'endpoint `/projects/{id}/members`.
export const mockProjectMembers = [
  {
    userId: 1,
    projectId: 1,
    role: 'Developer',
    joinedAt: '2026-03-01T10:00:00',
  },
  {
    userId: 2,
    projectId: 1,
    role: 'Project Manager',
    joinedAt: '2026-03-01T10:00:00',
  },
  {
    userId: 3,
    projectId: 2,
    role: 'Tester',
    joinedAt: '2026-03-10T11:30:00',
  },
]

// Collezione mock per simulare la risposta dell'endpoint `/notifications`.
export const mockNotifications = [
  {
    id: 1,
    message: 'Issue BUG-26-41 has been assigned to you',
    issueId: 41,
    read: false,
    createdAt: '2026-03-30T08:50:00',
  },
  {
    id: 2,
    message: 'Project Mobile App was updated',
    issueId: 0,
    read: true,
    createdAt: '2026-03-29T19:20:00',
  },
  {
    id: 3,
    message: 'Issue BUG-26-39 status changed to IN_PROGRESS',
    issueId: 39,
    read: false,
    createdAt: '2026-03-30T07:10:00',
  },
]
