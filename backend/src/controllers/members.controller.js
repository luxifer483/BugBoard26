// Legge e modifica le appartenenze degli account ai progetti.
import { Project, Membership, User, sequelize } from '../models/index.js';
import { requireProject } from '../services/access.js';
import { memberResponse, listResponse } from '../services/responses.js';
import { ApiError, notFound } from '../middleware/errors.js';
import * as validate from '../services/validation.js';

// Restituisce i membri con i dati pubblici dell'account associato.
export async function list(req, res) {
  await requireProject(req.user, req.params.projectId);
  const members = await Membership.findAll({ where: { projectId: req.params.projectId },
    include: [{ model: User, as: 'user' }], order: [['joinedAt', 'ASC'], ['id', 'ASC']] });
  res.json(listResponse(members.map(memberResponse)));
}

// Aggiunge un account esistente; il ruolo dell'utente resta quello globale.
export async function add(req, res) {
  const userId = validate.id(validate.body(req).userId, 'userId');
  const projectId = req.params.projectId;
  const result = await sequelize.transaction(async (transaction) => {
    const project = await requireProject(req.user, projectId, transaction);
    const user = await User.findByPk(userId, { transaction });
    if (!user) throw notFound('User');
    if (await Membership.findOne({ where: { projectId, userId }, transaction })) {
      throw new ApiError(409, 'ALREADY_MEMBER', 'This user already belongs to the project.');
    }
    const member = await Membership.create({ projectId, userId }, { transaction });
    await project.update({ updatedAt: new Date() }, { transaction });
    member.user = user;
    return memberResponse(member);
  });
  res.status(201).json(result);
}

// Rimuove la membership: le successive richieste dell'utente non avranno piu' accesso.
export async function remove(req, res) {
  await sequelize.transaction(async (transaction) => {
    const project = await requireProject(req.user, req.params.projectId, transaction);
    const member = await Membership.findOne({ where: { projectId: project.id, userId: req.params.userId },
      transaction, lock: transaction.LOCK.UPDATE });
    if (!member) throw notFound('Membership');
    await member.destroy({ transaction });
    await project.update({ updatedAt: new Date() }, { transaction });
  });
  res.status(204).end();
}
