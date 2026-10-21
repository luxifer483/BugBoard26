// Elimina esclusivamente lo schema casuale creato per le schermate della documentazione.
import { readFile } from 'node:fs/promises';
const info = JSON.parse(await readFile(new URL('./demo-info.json', import.meta.url), 'utf8'));
if (info.schema !== 'bugboard_docs_ce8decc305fd431da3517a0218d267b0') throw new Error('Schema dimostrativo inatteso');
process.env.NODE_ENV = 'test';
process.env.TEST_DB_SCHEMA = info.schema;
const { sequelize } = await import('../../backend/src/config/database.js');
try {
  const schemas = await sequelize.getQueryInterface().showAllSchemas();
  if (schemas.includes(info.schema)) {
    await sequelize.getQueryInterface().dropSchema(info.schema);
    console.log('Schema temporaneo delle schermate eliminato.');
  } else console.log('Schema temporaneo già assente.');
} finally {
  await sequelize.close();
}
