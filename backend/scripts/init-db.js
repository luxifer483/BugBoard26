// Comando esplicito per inizializzare lo schema PostgreSQL senza toccare i dati esistenti.
import { sequelize } from '../src/config/database.js';
import { initializeSchema } from '../src/services/schema.js';

try {
  await sequelize.authenticate();
  await initializeSchema();
  console.log('Schema ready. Existing tables and rows were preserved.');
} catch (error) {
  console.error(`Database initialization failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
