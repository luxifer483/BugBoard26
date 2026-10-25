// Collega PostgreSQL, crea le tabelle mancanti dai modelli e avvia le API con l'admin iniziale.
import app from './app.js';
import { sequelize } from './models/index.js';
import { bootstrapAdmin } from './services/bootstrap.js';

// Prepara le tabelle definite in models/index.js, senza cancellare o alterare quelle gia' presenti.
async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
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
  console.error('Check the PostgreSQL connection and backend/.env.');
  await sequelize.close();
  process.exitCode = 1;
});
