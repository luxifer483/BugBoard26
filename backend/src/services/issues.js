// Esegue modifiche composte su issue e notifiche, usando una sola transazione PostgreSQL.
import { Issue, Project, sequelize } from '../models/index.js';
import { requireProject, requireIssue, requireAssignee } from './access.js';
import { loadIssueResponse } from './responses.js';
import { notify, notifyAssignment, notifyParticipants, notifyResolution } from './notifications.js';
import { ApiError } from '../middleware/errors.js';

// Aggiorna la data di attivita' del progetto senza modificare gli altri campi.
export function touchProject(projectId, transaction) {
  return Project.update({ updatedAt: new Date() }, { where: { id: projectId }, transaction });
}

// Salva una nuova issue: autore e stato iniziale sono stabiliti dal server.
export async function createIssue(user, input) {
  return sequelize.transaction(async (transaction) => {
    await requireProject(user, input.projectId, transaction);
    await requireAssignee(input.projectId, input.assigneeId, transaction);
    const issue = await Issue.create({ ...input, reporterId: user.id, status: 'TODO' }, { transaction });
    await touchProject(issue.projectId, transaction);
    await notifyAssignment(issue, user, transaction);
    return loadIssueResponse(issue.id, transaction);
  });
}

// Consente il cambio di stato solo all'assegnatario e non duplica le notifiche.
export async function changeStatus(user, issueId, status) {
  return sequelize.transaction(async (transaction) => {
    const issue = await requireIssue(user, issueId, transaction);
    if (issue.assigneeId === null || String(issue.assigneeId) !== String(user.id)) {
      throw new ApiError(403, 'NOT_ISSUE_ASSIGNEE', 'Only the assigned user can change this issue\'s status.');
    }
    if (issue.status === status) return loadIssueResponse(issue.id, transaction);
    if (!((issue.status === 'TODO' && status === 'IN_PROGRESS')
        || (issue.status === 'IN_PROGRESS' && status === 'CLOSED'))) {
      throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'Move an issue from TODO to IN_PROGRESS, then to CLOSED.');
    }
    await issue.update({ status, updatedAt: new Date() }, { transaction });
    await touchProject(issue.projectId, transaction);
    if (status === 'CLOSED') {
      await notifyResolution(issue, transaction);
      const recipients = String(issue.assigneeId) === String(issue.reporterId) ? [] : [issue.assigneeId];
      await notify(issue, user, `Issue BUG-26-${issue.id} status changed to ${status}`, recipients, transaction);
    } else {
      await notifyParticipants(issue, user, `Issue BUG-26-${issue.id} status changed to ${status}`, transaction);
    }
    return loadIssueResponse(issue.id, transaction);
  });
}

// Salva il nuovo assegnatario, oppure rimuove l'assegnazione quando viene passato null.
export async function changeAssignee(user, issueId, assigneeId) {
  return sequelize.transaction(async (transaction) => {
    const issue = await requireIssue(user, issueId, transaction);
    await requireAssignee(issue.projectId, assigneeId, transaction);
    if ((issue.assigneeId === null ? null : String(issue.assigneeId)) === assigneeId) {
      return loadIssueResponse(issue.id, transaction);
    }
    await issue.update({ assigneeId, updatedAt: new Date() }, { transaction });
    await touchProject(issue.projectId, transaction);
    await notifyAssignment(issue, user, transaction);
    return loadIssueResponse(issue.id, transaction);
  });
}
