// Esegue gli script SQL versionati soltanto quando richiesto da db:init.
import { readFile } from 'node:fs/promises';
import { sequelize } from '../config/database.js';

// Aggiorna schema e stati legacy in una sola transazione, senza eliminare dati.
export async function initializeSchema() {
  const scripts = ['001-initial.sql', '002-issue-requirements.sql'];
  await sequelize.transaction(async (transaction) => {
    // Nei test anche l'inizializzazione esplicita resta nello schema isolato.
    if (sequelize.options.define.schema) {
      await sequelize.query("SELECT set_config('search_path', $schema, true)", {
        bind: { schema: sequelize.options.define.schema }, transaction,
      });
    }
    for (const script of scripts) {
      const sql = await readFile(new URL(`../../sql/${script}`, import.meta.url), 'utf8');
      await sequelize.query(sql, { transaction });
    }
  });
}
