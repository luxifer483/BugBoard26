// Prepara il collegamento Sequelize a PostgreSQL; non crea o modifica tabelle.
import 'dotenv/config';
import { Sequelize } from 'sequelize';

const options = {
  dialect: 'postgres',
  logging: false,
  define: { timestamps: false },
};

// Nei test viene usato solo lo schema temporaneo scelto dalla suite.
if (process.env.NODE_ENV === 'test' && process.env.TEST_DB_SCHEMA) {
  options.define.schema = process.env.TEST_DB_SCHEMA;
}

const url = process.env.DB_URL?.replace(/^jdbc:/, '');
export const sequelize = url
  ? new Sequelize(url, options)
  : new Sequelize(process.env.DB_NAME || 'bugboard26', process.env.DB_USERNAME || 'bugboard_user',
    process.env.DB_PASSWORD, {
      ...options,
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5433),
    });
