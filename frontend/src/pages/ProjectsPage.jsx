import DashboardLayout from '../layouts/DashboardLayout'

const stats = [
  { label: 'Total Projects', value: '6', icon: '[]', accentClass: 'is-blue' },
  { label: 'Total Issues', value: '161', icon: '!', accentClass: 'is-orange' },
  { label: 'Open Issues', value: '55', icon: 'o', accentClass: 'is-red' },
  { label: 'Closed Issues', value: '106', icon: 'v', accentClass: 'is-green' },
]

const projects = [
  {
    name: 'BugBoard26 Core',
    description: 'Main application development and bug tracking',
    total: 45,
    open: 12,
    closed: 33,
    members: 8,
    updatedAt: 'Updated 2 hours ago',
    accentClass: 'is-blue',
  },
  {
    name: 'Mobile App',
    description: 'iOS and Android mobile applications',
    total: 28,
    open: 15,
    closed: 13,
    members: 5,
    updatedAt: 'Updated 5 hours ago',
    accentClass: 'is-green',
  },
  {
    name: 'API Development',
    description: 'RESTful API and backend services',
    total: 34,
    open: 8,
    closed: 26,
    members: 6,
    updatedAt: 'Updated 1 day ago',
    accentClass: 'is-purple',
  },
  {
    name: 'Documentation',
    description: 'User guides and technical documentation',
    total: 12,
    open: 4,
    closed: 8,
    members: 3,
    updatedAt: 'Updated 3 days ago',
    accentClass: 'is-amber',
  },
  {
    name: 'Infrastructure',
    description: 'DevOps, CI/CD, and cloud infrastructure',
    total: 19,
    open: 6,
    closed: 13,
    members: 4,
    updatedAt: 'Updated 12 hours ago',
    accentClass: 'is-rose',
  },
  {
    name: 'UI/UX Design',
    description: 'Design system and user interface improvements',
    total: 23,
    open: 10,
    closed: 13,
    members: 4,
    updatedAt: 'Updated 6 hours ago',
    accentClass: 'is-pink',
  },
]

function ProjectsPage() {
  return (
    <DashboardLayout>
      <main className="projects-page">
        <section className="projects-hero">
          <h1>Projects</h1>
          <p>Select a project to view and manage issues</p>
        </section>

        <section className="projects-stats" aria-label="Project statistics">
          {stats.map((item) => (
            <article className="project-stat-card" key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div
                className={`project-stat-icon ${item.accentClass}`}
                aria-hidden="true"
              >
                {item.icon}
              </div>
            </article>
          ))}
        </section>

        <section className="projects-grid" aria-label="Projects list">
          {projects.map((project) => (
            <article className="project-card" key={project.name}>
              <div className="project-card-header">
                <div
                  className={`project-card-badge ${project.accentClass}`}
                  aria-hidden="true"
                >
                  []
                </div>
                <div>
                  <h2>{project.name}</h2>
                  <p>{project.description}</p>
                </div>
              </div>

              <div className="project-card-stats">
                <div>
                  <span>Total</span>
                  <strong>{project.total}</strong>
                </div>
                <div>
                  <span>Open</span>
                  <strong className="project-open-count">{project.open}</strong>
                </div>
                <div>
                  <span>Closed</span>
                  <strong className="project-closed-count">{project.closed}</strong>
                </div>
              </div>

              <div className="project-card-footer">
                <span>{project.members} members</span>
                <span>{project.updatedAt}</span>
              </div>
            </article>
          ))}
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ProjectsPage
