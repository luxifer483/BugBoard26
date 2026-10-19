// Mostra soltanto le notifiche del destinatario autenticato e ne aggiorna lo stato letto.
import { Op } from 'sequelize';
import { Notification, Issue, sequelize } from '../models/index.js';
import { visibleProjectIds, requireProject } from '../services/access.js';
import { notificationResponse, listResponse } from '../services/responses.js';
import { notFound } from '../middleware/errors.js';

// Nasconde anche le notifiche dei progetti da cui l'utente e' stato rimosso.
export async function list(req, res) {
  const ids = await visibleProjectIds(req.user);
  const notifications = await Notification.findAll({ where: { recipientId: req.user.id },
    include: [{ model: Issue, as: 'issue', required: true, where: ids === null ? {} : { projectId: { [Op.in]: ids } } }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  const items = notifications.map(notificationResponse);
  res.json({ ...listResponse(items), unreadCount: items.filter((item) => !item.read).length });
}

// Non permette nemmeno agli ADMIN di marcare le notifiche di un altro account.
export async function read(req, res) {
  const result = await sequelize.transaction(async (transaction) => {
    const notification = await Notification.findOne({ where: { id: req.params.id, recipientId: req.user.id }, transaction });
    if (!notification) throw notFound('Notification');
    const issue = await Issue.findByPk(notification.issueId, { transaction });
    await requireProject(req.user, issue.projectId, transaction);
    await notification.update({ read: true }, { transaction });
    return notificationResponse(notification);
  });
  res.json(result);
}
