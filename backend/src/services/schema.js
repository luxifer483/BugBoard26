// Esegue soltanto lo script SQL iniziale quando richiesto dal comando db:init.
import { readFile } from 'node:fs/promises';
import { sequelize } from '../config/database.js';

// Crea solo tabelle e indici mancanti; non usa sync, force, alter o cancellazioni.
export async function initializeSchema() {
  const sql = await readFile(new URL('../../sql/001-initial.sql', import.meta.url), 'utf8');
  await sequelize.transaction(async (transaction) => {
    // Nei test anche l'inizializzazione esplicita resta nello schema isolato.
    if (sequelize.options.define.schema) {
      await sequelize.query("SELECT set_config('search_path', $schema, true)", {
        bind: { schema: sequelize.options.define.schema }, transaction,
      });
    }
    await sequelize.query(sql, { transaction });
  });
}
