// Riunisce i controlli di appartenenza ai progetti, senza dipendere da Express.
import { Project, Membership, Issue, User } from '../models/index.js';
import { ApiError, forbidden, notFound } from '../middleware/errors.js';

// Cerca il progetto e verifica che l'utente sia ADMIN oppure membro.
export async function requireProject(user, projectId, transaction) {
  const project = await Project.findByPk(projectId, { transaction });
  if (!project) throw notFound('Project');
  if (user.role !== 'ADMIN' && !await Membership.findOne({ where: { projectId, userId: user.id }, transaction })) {
    throw forbidden();
  }
  return project;
}

// Durante una modifica blocca la issue fino al completamento della transazione.
export async function requireIssue(user, issueId, transaction) {
  const issue = await Issue.findByPk(issueId, { transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!issue) throw notFound('Issue');
  await requireProject(user, issue.projectId, transaction);
  return issue;
}

// Consente assegnazioni soltanto ad account esistenti che appartengono al progetto.
export async function requireAssignee(projectId, userId, transaction) {
  if (userId === null) return null;
  const user = await User.findByPk(userId, { transaction });
  if (!user) throw notFound('User');
  if (!await Membership.findOne({ where: { projectId, userId }, transaction })) {
    throw new ApiError(400, 'ASSIGNEE_NOT_MEMBER', "The assignee must belong to the issue's project.");
  }
  return user;
}

// Restituisce null per un ADMIN, oppure gli ID dei progetti dell'utente normale.
export async function visibleProjectIds(user, transaction) {
  if (user.role === 'ADMIN') return null;
  const memberships = await Membership.findAll({ where: { userId: user.id }, attributes: ['projectId'], transaction });
  return memberships.map((membership) => membership.projectId);
}
