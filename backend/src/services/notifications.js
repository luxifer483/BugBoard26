// Salva le notifiche nella stessa transazione dell'operazione che le ha generate.
import { User, Membership, Notification } from '../models/index.js';

// Esclude l'attore e i destinatari senza accesso; evita due notifiche alla stessa persona.
export async function notify(issue, actor, message, recipientIds, transaction) {
  if (!transaction) throw new Error('Notifications require the operation transaction.');
  const ids = [...new Set(recipientIds.filter(Boolean).map(String))].filter((id) => id !== String(actor.id));
  for (const id of ids) {
    const user = await User.findByPk(id, { transaction });
    if (user && (user.role === 'ADMIN' || await Membership.findOne({
      where: { projectId: issue.projectId, userId: id }, transaction,
    }))) {
      await Notification.create({ recipientId: id, issueId: issue.id, message }, { transaction });
    }
  }
}

// Prepara il messaggio di assegnazione e richiede il salvataggio al nuovo assegnatario.
export function notifyAssignment(issue, actor, transaction) {
  return notify(issue, actor, `Issue BUG-26-${issue.id} has been assigned to you`, [issue.assigneeId], transaction);
}

// Richiede la notifica a reporter e assegnatario, sempre con i controlli della funzione notify.
export function notifyParticipants(issue, actor, message, transaction) {
  return notify(issue, actor, message, [issue.reporterId, issue.assigneeId], transaction);
}
