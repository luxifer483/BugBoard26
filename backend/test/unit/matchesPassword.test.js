// Verifica matchesPassword con hash BCrypt reali, senza HTTP e senza database.
import '../setup.js';
import QUnit from 'qunit';
import bcrypt from 'bcryptjs';

QUnit.module('Unita matchesPassword - R-WECT e valori limite', (hooks) => {
  const password = 'Password123!';
  let hash, matchesPassword;

  // Prepara un hash reale con costo ridotto solo per rendere veloci i test.
  hooks.before(async () => {
    ({ matchesPassword } = await import('../../src/services/auth.js'));
    hash = await bcrypt.hash(password, 4);
  });

  // Verifica la classe valida di password corrispondente a un hash BCrypt moderno.
  QUnit.test('MP01 - password corretta e hash 2b', async (assert) => {
    assert.true(await matchesPassword(password, hash));
  });

  // Verifica che una password formalmente valida ma diversa da quella salvata non autentichi.
  QUnit.test('MP02 - password diversa', async (assert) => {
    assert.false(await matchesPassword('Different123!', hash));
  });

  // Verifica la classe valida degli hash 2a mantenuti dal precedente backend Spring.
  QUnit.test('MP03 - hash storico 2a', async (assert) => {
    assert.true(await matchesPassword(password, hash.replace('$2b$', '$2a$')));
  });

  // Verifica hash assente mantenendo valida la password, anche se coincide con quella del confronto fittizio.
  QUnit.test('MP04 - hash assente', async (assert) => {
    for (const missingHash of [null, undefined, '']) {
      assert.false(await matchesPassword('unused-login-timing-placeholder', missingHash));
    }
  });

  // Verifica un hash testuale malformato mantenendo valida la password.
  QUnit.test('MP05 - hash malformato', async (assert) => {
    assert.false(await matchesPassword(password, 'not-a-bcrypt-hash'));
  });

  // Verifica password di tipo non testuale mantenendo un hash valido e senza combinare due input errati.
  QUnit.test('MP06 - password non testuale', async (assert) => {
    for (const invalidPassword of [null, undefined, 123, {}, ['Password123!']]) {
      assert.false(await matchesPassword(invalidPassword, hash));
    }
  });

  // Verifica che una password ASCII lunga esattamente 72 byte sia ancora confrontabile.
  QUnit.test('MP07 - limite valido di 72 byte ASCII', async (assert) => {
    const value = 'a'.repeat(72);
    assert.true(await matchesPassword(value, await bcrypt.hash(value, 4)));
  });

  // Verifica che il byte successivo al limite non venga accettato per troncamento di BCrypt.
  QUnit.test('MP08 - limite non valido di 73 byte ASCII', async (assert) => {
    const value = 'a'.repeat(73);
    const truncatedHash = await bcrypt.hash(value.slice(0, 72), 4);
    assert.false(await matchesPassword(value, truncatedHash));
  });

  // Verifica che il limite sia misurato in byte UTF-8 e accetti 36 caratteri da due byte.
  QUnit.test('MP09 - limite valido di 72 byte UTF-8', async (assert) => {
    const value = '\u00e9'.repeat(36);
    assert.strictEqual(Buffer.byteLength(value, 'utf8'), 72);
    assert.true(await matchesPassword(value, await bcrypt.hash(value, 4)));
  });

  // Verifica che una password corta in caratteri ma lunga 74 byte venga respinta.
  QUnit.test('MP10 - limite non valido di 74 byte UTF-8', async (assert) => {
    const value = '\u00e9'.repeat(37);
    assert.false(await matchesPassword(value, await bcrypt.hash('\u00e9'.repeat(36), 4)));
  });

  // Verifica che il confronto sostitutivo di una password non valida non possa autenticare l'utente.
  QUnit.test('MP11 - confronto fittizio non autorizzante', async (assert) => {
    const placeholderHash = await bcrypt.hash('invalid-length-placeholder', 4);
    assert.false(await matchesPassword(null, placeholderHash));
  });
});
