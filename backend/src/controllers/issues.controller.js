// Riceve i dati delle issue e usa i modelli per le letture e i servizi per le modifiche composte.
import { Op } from 'sequelize';
import { Issue, ISSUE_TYPES, ISSUE_PRIORITIES, ISSUE_STATUSES } from '../models/index.js';
import { visibleProjectIds, requireProject, requireIssue } from '../services/access.js';
import { issueResponse, issueRelations, loadIssueResponse, listResponse } from '../services/responses.js';
import { createIssue, changeStatus, changeAssignee } from '../services/issues.js';
import * as validate from '../services/validation.js';

// Legge le issue del progetto indicato, oppure tutte quelle accessibili all'utente.
export async function list(req, res) {
  let where = {};
  if (req.params.projectId) {
    await requireProject(req.user, req.params.projectId);
    where.projectId = req.params.projectId;
  } else {
    const ids = await visibleProjectIds(req.user);
    if (ids !== null) where.projectId = { [Op.in]: ids };
  }
  const issues = await Issue.findAll({ where, include: issueRelations, order: [['updatedAt', 'DESC'], ['id', 'DESC']] });
  res.json(listResponse(issues.map(issueResponse)));
}

// Controlla l'accesso prima di restituire il dettaglio dell'issue.
export async function get(req, res) {
  await requireIssue(req.user, req.params.id);
  res.json(await loadIssueResponse(req.params.id));
}

// Prepara solo i campi ammessi: autore, stato e date inviati dal client non vengono accettati.
export async function create(req, res) {
  const input = validate.body(req);
  const values = {
    projectId: validate.id(input.projectId, 'projectId'),
    title: validate.text(input.title, 'title', 200),
    description: validate.text(input.description, 'description', 10000),
    type: validate.choice(input.type, 'type', ISSUE_TYPES),
    priority: validate.choice(input.priority, 'priority', ISSUE_PRIORITIES),
    assigneeId: validate.id(input.assigneeId, 'assigneeId', true),
  };
  res.status(201).json(await createIssue(req.user, values));
}

// Valida il nome dello stato e delega il controllo della transizione al servizio.
export async function status(req, res) {
  const status = validate.choice(validate.body(req).status, 'status', ISSUE_STATUSES);
  res.json(await changeStatus(req.user, req.params.id, status));
}

// Valida l'ID prima di richiedere il cambio assegnatario.
export async function assign(req, res) {
  const assigneeId = validate.id(validate.body(req).assigneeId, 'assigneeId', true);
  res.json(await changeAssignee(req.user, req.params.id, assigneeId));
}
