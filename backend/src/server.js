// Verifica PostgreSQL, crea se necessario l'admin di sviluppo e avvia l'ascolto HTTP.
import app from './app.js';
import { sequelize, User, Project, Membership, Issue, Comment, Notification } from './models/index.js';
import { bootstrapAdmin } from './services/bootstrap.js';

// Legge le tabelle per rilevare uno schema mancante senza crearlo o alterarlo.
async function start() {
  await sequelize.authenticate();
  for (const model of [User, Project, Membership, Issue, Comment, Notification]) {
    await model.findOne({ limit: 1 });
  }
  await bootstrapAdmin();
  const port = Number(process.env.SERVER_PORT || process.env.PORT || 8081);
  const server = app.listen(port, () => console.log(`BugBoard26 API: http://localhost:${server.address().port}/api`));

  // Chiude prima le richieste HTTP e poi le connessioni al database.
  function stop() {
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  server.on('error', async (error) => {
    console.error(`HTTP startup failed: ${error.code || error.message}`);
    await sequelize.close();
    process.exitCode = 1;
  });
}

start().catch(async (error) => {
  console.error(`Backend startup failed: ${error.message}`);
  console.error('Check PostgreSQL and .env. For a new database run npm run db:init explicitly.');
  await sequelize.close();
  process.exitCode = 1;
});
