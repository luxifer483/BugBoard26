// Prepara l'ambiente QUnit prima di importare l'applicazione, senza collegarsi al database.
import { randomUUID } from 'node:crypto';
import QUnit from 'qunit';

process.env.NODE_ENV = 'test';
// In assenza di un DB di test gli unit test non possono usare per errore il DB di sviluppo.
process.env.DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://unit_only:unit_only@127.0.0.1:1/unit_only';
process.env.TEST_DB_SCHEMA = `bugboard_test_${randomUUID().replaceAll('-', '')}`;
process.env.JWT_SECRET = 'qunit-test-secret-with-more-than-thirty-two-bytes';
process.env.JWT_ISSUER = 'bugboard26';
process.env.JWT_AUDIENCE = 'bugboard26-frontend';
process.env.JWT_TTL_SECONDS = '3600';

QUnit.config.testTimeout = 30000;
QUnit.config.reorder = false;
