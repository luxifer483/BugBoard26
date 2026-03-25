import DashboardLayout from '../layouts/DashboardLayout'

function DashboardPage() {
  return (
    <DashboardLayout>
      <main className="projects-page">
        <section className="projects-hero">
          <h1>Dashboard</h1>
          <p>
            Questa pagina restera dedicata alla panoramica delle issue del
            progetto selezionato.
          </p>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default DashboardPage
