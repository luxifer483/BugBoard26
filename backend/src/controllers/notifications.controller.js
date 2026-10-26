// Mostra soltanto le notifiche del destinatario autenticato e ne aggiorna lo stato letto.
import { Op } from 'sequelize';
import { Notification, Issue, sequelize } from '../models/index.js';
import { visibleProjectIds, requireProject } from '../services/access.js';
import { notificationResponse, listResponse } from '../services/responses.js';
import { notFound } from '../middleware/errors.js';

// Le risoluzioni restano personali e leggibili anche dopo l'uscita dal progetto.
export async function list(req, res) {
  const ids = await visibleProjectIds(req.user);
  const notifications = await Notification.findAll({ where: { recipientId: req.user.id,
    ...(ids === null ? {} : { [Op.or]: [
      { '$issue.project_id$': { [Op.in]: ids } },
      { kind: 'RESOLUTION', '$issue.reporter_id$': req.user.id },
    ] }) },
    include: [{ model: Issue, as: 'issue', required: true }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  const items = notifications.map((notification) => notificationResponse(notification,
    ids === null || ids.some((id) => String(id) === String(notification.issue.projectId))));
  res.json({ ...listResponse(items), unreadCount: items.filter((item) => !item.read).length });
}

// Non permette nemmeno agli ADMIN di marcare le notifiche di un altro account.
export async function read(req, res) {
  const result = await sequelize.transaction(async (transaction) => {
    const notification = await Notification.findOne({ where: { id: req.params.id, recipientId: req.user.id }, transaction });
    if (!notification) throw notFound('Notification');
    const issue = await Issue.findByPk(notification.issueId, { transaction });
    const ids = await visibleProjectIds(req.user, transaction);
    const canAccessIssue = ids === null || ids.some((id) => String(id) === String(issue.projectId));
    if (!(notification.kind === 'RESOLUTION' && String(issue.reporterId) === String(req.user.id))) {
      await requireProject(req.user, issue.projectId, transaction);
    }
    await notification.update({ read: true }, { transaction });
    return notificationResponse(notification, canAccessIssue, issue);
  });
  res.json(result);
}
