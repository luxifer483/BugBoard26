// Verifica notify da solo, simulando utenti, appartenenze e salvataggi delle notifiche.
import '../setup.js';
import QUnit from 'qunit';
import { User, Membership, Notification } from '../../src/models/index.js';
import { notify } from '../../src/services/notifications.js';

QUnit.module('Unita notify - white-box', (hooks) => {
  const originalUserLookup = User.findByPk;
  const originalMembershipLookup = Membership.findOne;
  const originalNotificationCreate = Notification.create;
  const issue = { id: '20', projectId: '10' };
  const actor = { id: '7' };
  const transaction = { name: 'unit-transaction' };
  const message = 'Aggiornamento issue';
  let users, members, reads, membershipReads, writes;

  // Simula i modelli e registra i salvataggi richiesti senza eseguire SQL.
  hooks.beforeEach(() => {
    users = new Map([['8', { id: '8', role: 'USER' }], ['9', { id: '9', role: 'ADMIN' }]]);
    members = new Set(['8']);
    reads = [];
    membershipReads = [];
    writes = [];
    User.findByPk = async (id, options) => { reads.push([id, options]); return users.get(id) || null; };
    Membership.findOne = async (options) => {
      membershipReads.push(options);
      return members.has(options.where.userId) ? { userId: options.where.userId } : null;
    };
    Notification.create = async (values, options) => { writes.push([values, options]); return values; };
  });

  // Ripristina sempre i modelli per mantenere indipendenti i test successivi.
  hooks.afterEach(() => {
    User.findByPk = originalUserLookup;
    Membership.findOne = originalMembershipLookup;
    Notification.create = originalNotificationCreate;
  });

  // Verifica che una notifica senza la transazione dell'operazione venga rifiutata prima delle letture.
  QUnit.test('NT01 - transazione obbligatoria', async (assert) => {
    await assert.rejects(notify(issue, actor, message, ['8'], undefined), /require the operation transaction/);
    assert.strictEqual(reads.length, 0);
    assert.strictEqual(writes.length, 0);
  });

  // Verifica che un elenco vuoto non produca letture o salvataggi.
  QUnit.test('NT02 - nessun destinatario', async (assert) => {
    await notify(issue, actor, message, [], transaction);
    assert.strictEqual(reads.length, 0);
    assert.strictEqual(writes.length, 0);
  });

  // Verifica che valori assenti e identificatore dell'attore siano esclusi anche con tipi diversi.
  QUnit.test('NT03 - esclusione attore e valori assenti', async (assert) => {
    await notify(issue, actor, message, [null, undefined, '', 0, '7', 7], transaction);
    assert.strictEqual(reads.length, 0);
    assert.strictEqual(writes.length, 0);
  });

  // Verifica che uno stesso destinatario numerico e testuale riceva una sola notifica.
  QUnit.test('NT04 - destinatari duplicati', async (assert) => {
    await notify(issue, actor, message, ['8', 8, '8'], transaction);
    assert.strictEqual(reads.length, 1);
    assert.strictEqual(writes.length, 1);
  });

  // Verifica contenuto e transazione del salvataggio per un membro autorizzato.
  QUnit.test('NT05 - membro autorizzato', async (assert) => {
    await notify(issue, actor, message, ['8'], transaction);
    assert.deepEqual(reads, [['8', { transaction }]]);
    assert.deepEqual(membershipReads, [{ where: { projectId: '10', userId: '8' }, transaction }]);
    assert.deepEqual(writes, [[{ recipientId: '8', issueId: '20', message }, { transaction }]]);
  });

  // Verifica che un amministratore riceva la notifica senza una lettura della membership.
  QUnit.test('NT06 - amministratore destinatario', async (assert) => {
    await notify(issue, actor, message, ['9'], transaction);
    assert.strictEqual(membershipReads.length, 0);
    assert.strictEqual(writes.length, 1);
    assert.strictEqual(writes[0][0].recipientId, '9');
  });

  // Verifica che un destinatario inesistente venga ignorato prima di controllare i membri.
  QUnit.test('NT07 - utente inesistente', async (assert) => {
    await notify(issue, actor, message, ['404'], transaction);
    assert.strictEqual(membershipReads.length, 0);
    assert.strictEqual(writes.length, 0);
  });

  // Verifica che un utente normale esterno al progetto non riceva informazioni sulla issue.
  QUnit.test('NT08 - utente non membro', async (assert) => {
    members.clear();
    await notify(issue, actor, message, ['8'], transaction);
    assert.strictEqual(membershipReads.length, 1);
    assert.strictEqual(writes.length, 0);
  });

  // Verifica che un elenco misto venga elaborato fino in fondo notificando solo i destinatari ammessi.
  QUnit.test('NT09 - piu destinatari con condizioni diverse', async (assert) => {
    await notify(issue, actor, message, ['7', '404', '8', '9', 8], transaction);
    assert.deepEqual(writes.map(([values]) => values.recipientId), ['8', '9']);
  });

  // Verifica che un errore di lettura venga propagato senza richiedere un salvataggio.
  QUnit.test('NT10 - errore di lettura', async (assert) => {
    const failure = new Error('Lettura destinatario fallita');
    User.findByPk = async () => { throw failure; };
    await assert.rejects(notify(issue, actor, message, ['8'], transaction), (error) => error === failure);
    assert.strictEqual(writes.length, 0);
  });

  // Verifica che un errore di salvataggio raggiunga il chiamante senza continuare con altri destinatari.
  QUnit.test('NT11 - errore di salvataggio', async (assert) => {
    const failure = new Error('Salvataggio notifica fallito');
    Notification.create = async () => { throw failure; };
    await assert.rejects(notify(issue, actor, message, ['8', '9'], transaction), (error) => error === failure);
    assert.deepEqual(reads.map(([id]) => id), ['8']);
  });
});
