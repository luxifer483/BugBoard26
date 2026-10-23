// Verifica requireProject da solo, simulando le letture dei modelli senza usare PostgreSQL.
import '../setup.js';
import QUnit from 'qunit';
import { Project, Membership } from '../../src/models/index.js';
import { requireProject } from '../../src/services/access.js';

QUnit.module('Unita requireProject - white-box', (hooks) => {
  const originalProjectLookup = Project.findByPk;
  const originalMembershipLookup = Membership.findOne;
  const transaction = { name: 'unit-transaction' };
  let project, membership, projectReads, membershipReads;

  // Prepara risposte controllate e registra le chiamate che il metodo effettua ai modelli.
  hooks.beforeEach(() => {
    project = { id: '10', name: 'Progetto di prova' };
    membership = { projectId: '10', userId: '7' };
    projectReads = [];
    membershipReads = [];
    Project.findByPk = async (...args) => { projectReads.push(args); return project; };
    Membership.findOne = async (...args) => { membershipReads.push(args); return membership; };
  });

  // Ripristina sempre i metodi reali per non influenzare le altre suite.
  hooks.afterEach(() => {
    Project.findByPk = originalProjectLookup;
    Membership.findOne = originalMembershipLookup;
  });

  // Verifica che un progetto inesistente produca 404 anche per un amministratore.
  QUnit.test('RP01 - progetto inesistente', async (assert) => {
    project = null;
    await assert.rejects(requireProject({ id: '7', role: 'ADMIN' }, '10', transaction),
      (error) => error.status === 404 && error.code === 'NOT_FOUND');
    assert.strictEqual(membershipReads.length, 0, 'Non cerca membri di un progetto inesistente');
  });

  // Verifica che un amministratore acceda senza richiedere una appartenenza al progetto.
  QUnit.test('RP02 - amministratore', async (assert) => {
    assert.strictEqual(await requireProject({ id: '7', role: 'ADMIN' }, '10', transaction), project);
    assert.strictEqual(membershipReads.length, 0, 'Il ramo ADMIN evita la lettura della membership');
    assert.deepEqual(projectReads, [['10', { transaction }]]);
  });

  // Verifica che un utente membro acceda al progetto usando utente e transazione corretti.
  QUnit.test('RP03 - utente membro', async (assert) => {
    assert.strictEqual(await requireProject({ id: '7', role: 'USER' }, '10', transaction), project);
    assert.deepEqual(membershipReads, [[{ where: { projectId: '10', userId: '7' }, transaction }]]);
  });

  // Verifica che un utente esterno venga respinto senza restituire il progetto.
  QUnit.test('RP04 - utente non membro', async (assert) => {
    membership = null;
    await assert.rejects(requireProject({ id: '7', role: 'USER' }, '10', transaction),
      (error) => error.status === 403 && error.code === 'FORBIDDEN');
    assert.strictEqual(membershipReads.length, 1);
  });

  // Verifica che un errore di lettura non venga trasformato in un accesso consentito.
  QUnit.test('RP05 - errore del modello', async (assert) => {
    const failure = new Error('Lettura progetto fallita');
    Project.findByPk = async () => { throw failure; };
    await assert.rejects(requireProject({ id: '7', role: 'ADMIN' }, '10', transaction),
      (error) => error === failure);
    assert.strictEqual(membershipReads.length, 0);
  });
});
