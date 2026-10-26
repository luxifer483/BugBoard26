// Prepara gli oggetti JSON gia' attesi dal frontend; non esegue salvataggi.
import { User, Project, Issue, IssueImage, Membership } from '../models/index.js';

export const issueRelations = [
  { model: Project, as: 'project' }, { model: User, as: 'reporter' }, { model: User, as: 'assignee' },
  { model: IssueImage, as: 'image', attributes: ['issueId', 'contentType'] },
];

export function userResponse(user) {
  return { id: Number(user.id), fullName: user.fullName, email: user.email, role: user.role, avatarUrl: '' };
}

export function memberResponse(member) {
  return { projectId: Number(member.projectId), userId: Number(member.userId), fullName: member.user.fullName,
    email: member.user.email, role: member.user.role, joinedAt: member.joinedAt };
}

export async function projectResponse(project, transaction) {
  // In una transazione le query condividono una connessione: le eseguiamo in ordine.
  const memberCount = await Membership.count({ where: { projectId: project.id }, transaction });
  const totalIssues = await Issue.count({ where: { projectId: project.id }, transaction });
  const openIssues = await Issue.count({ where: { projectId: project.id, status: 'TODO' }, transaction });
  const closedIssues = await Issue.count({ where: { projectId: project.id, status: 'CLOSED' }, transaction });
  return { id: Number(project.id), name: project.name, description: project.description, status: project.status,
    memberCount, totalIssues, openIssues, closedIssues, createdAt: project.createdAt, updatedAt: project.updatedAt };
}

export function issueResponse(issue) {
  return { id: Number(issue.id), code: `BUG-26-${issue.id}`, title: issue.title, description: issue.description,
    type: issue.type, priority: issue.priority, status: issue.status,
    project: { id: Number(issue.project.id), name: issue.project.name },
    reporter: userResponse(issue.reporter), assignee: issue.assignee ? userResponse(issue.assignee) : null,
    image: issue.image ? { contentType: issue.image.contentType } : null,
    createdAt: issue.createdAt, updatedAt: issue.updatedAt };
}

// Rilegge anche progetto e persone per restituire la risposta dopo una scrittura.
export async function loadIssueResponse(issueId, transaction) {
  const issue = await Issue.findByPk(issueId, { include: issueRelations, transaction });
  return issueResponse(issue);
}

export function commentResponse(comment) {
  return { id: Number(comment.id), issueId: Number(comment.issueId), content: comment.content,
    author: userResponse(comment.author), createdAt: comment.createdAt };
}

// Aggiunge il titolo anche alle notifiche esistenti, solo se la issue e ancora accessibile.
export function notificationResponse(notification, canAccessIssue = true, issue = notification.issue) {
  return { id: Number(notification.id), issueId: canAccessIssue ? Number(notification.issueId) : null, message: notification.message,
    issueTitle: canAccessIssue ? issue.title : null,
    read: notification.read, createdAt: notification.createdAt };
}

export function listResponse(items) {
  return { items, totalCount: items.length };
}
