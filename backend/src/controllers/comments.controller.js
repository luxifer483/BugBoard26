// Legge e inserisce commenti associati a una issue, usando l'utente autenticato come autore.
import { Comment, User, sequelize } from '../models/index.js';
import { requireIssue } from '../services/access.js';
import { commentResponse, listResponse } from '../services/responses.js';
import { touchProject } from '../services/issues.js';
import { notifyParticipants } from '../services/notifications.js';
import * as validate from '../services/validation.js';

// Legge i commenti dal piu' vecchio al piu' recente dopo il controllo del progetto.
export async function list(req, res) {
  await requireIssue(req.user, req.params.issueId);
  const comments = await Comment.findAll({ where: { issueId: req.params.issueId },
    include: [{ model: User, as: 'author' }], order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  res.json(listResponse(comments.map(commentResponse)));
}

// Salva commento e notifiche insieme; un errore annulla l'intera operazione.
export async function create(req, res) {
  const content = validate.text(validate.body(req).content, 'content', 5000);
  const result = await sequelize.transaction(async (transaction) => {
    const issue = await requireIssue(req.user, req.params.issueId, transaction);
    const comment = await Comment.create({ issueId: issue.id, authorId: req.user.id, content }, { transaction });
    await issue.update({ updatedAt: comment.createdAt }, { transaction });
    await touchProject(issue.projectId, transaction);
    await notifyParticipants(issue, req.user, `New comment on BUG-26-${issue.id}`, transaction);
    comment.author = req.user;
    return commentResponse(comment);
  });
  res.status(201).json(result);
}
