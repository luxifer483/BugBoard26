// Verifica requireAssignee da solo, simulando esistenza dell'utente e appartenenza al progetto.
import '../setup.js';
import QUnit from 'qunit';
import { User, Membership } from '../../src/models/index.js';
import { requireAssignee } from '../../src/services/access.js';

// Mantiene i test QUnit riconoscibili anche all'analisi statica SonarQube.
const { test } = QUnit;

QUnit.module('Unita requireAssignee - white-box', (hooks) => {
  const originalUserLookup = User.findByPk;
  const originalMembershipLookup = Membership.findOne;
  const transaction = { name: 'unit-transaction' };
  let user, membership, userReads, membershipReads;

  // Prepara un assegnatario valido; ogni test cambia solo la condizione che vuole verificare.
  hooks.beforeEach(() => {
    user = { id: '7', role: 'USER' };
    membership = { projectId: '10', userId: '7' };
    userReads = [];
    membershipReads = [];
    User.findByPk = async (...args) => { userReads.push(args); return user; };
    Membership.findOne = async (...args) => { membershipReads.push(args); return membership; };
  });

  // Ripristina le letture reali anche quando un test fallisce.
  hooks.afterEach(() => {
    User.findByPk = originalUserLookup;
    Membership.findOne = originalMembershipLookup;
  });

  // Verifica che rimuovere l'assegnazione restituisca null senza leggere utenti o membri.
  test('RA01 - nessun assegnatario', async (assert) => {
    assert.strictEqual(await requireAssignee('10', null, transaction), null);
    assert.strictEqual(userReads.length, 0);
    assert.strictEqual(membershipReads.length, 0);
  });

  // Verifica che un identificatore di utente inesistente produca 404.
  test('RA02 - utente inesistente', async (assert) => {
    user = null;
    await assert.rejects(requireAssignee('10', '7', transaction),
      (error) => error.status === 404 && error.code === 'NOT_FOUND');
    assert.strictEqual(membershipReads.length, 0);
  });

  // Verifica che un utente esistente ma esterno al progetto non sia assegnabile.
  test('RA03 - utente non membro', async (assert) => {
    membership = null;
    await assert.rejects(requireAssignee('10', '7', transaction),
      (error) => error.status === 400 && error.code === 'ASSIGNEE_NOT_MEMBER');
  });

  // Verifica che un membro venga restituito e che entrambe le letture usino la transazione ricevuta.
  test('RA04 - membro valido', async (assert) => {
    assert.strictEqual(await requireAssignee('10', '7', transaction), user);
    assert.deepEqual(userReads, [['7', { transaction }]]);
    assert.deepEqual(membershipReads, [[{ where: { projectId: '10', userId: '7' }, transaction }]]);
  });

  // Verifica che il ruolo ADMIN non renda assegnabile un account esterno al progetto.
  test('RA05 - amministratore non membro', async (assert) => {
    user.role = 'ADMIN';
    membership = null;
    await assert.rejects(requireAssignee('10', '7', transaction),
      (error) => error.status === 400 && error.code === 'ASSIGNEE_NOT_MEMBER');
  });

  // Verifica che anche un amministratore possa essere assegnatario quando e membro del progetto.
  test('RA06 - amministratore membro', async (assert) => {
    user.role = 'ADMIN';
    assert.strictEqual(await requireAssignee('10', '7', transaction), user);
    assert.strictEqual(membershipReads.length, 1);
  });

  // Verifica che un errore nella lettura dei membri venga propagato senza autorizzare l'assegnazione.
  test('RA07 - errore del modello', async (assert) => {
    const failure = new Error('Lettura membri fallita');
    Membership.findOne = async () => { throw failure; };
    await assert.rejects(requireAssignee('10', '7', transaction), (error) => error === failure);
  });
});
