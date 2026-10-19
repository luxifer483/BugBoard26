// Gestisce i progetti e prepara le statistiche mostrate nel frontend.
import { Op } from 'sequelize';
import { Project, Membership, sequelize } from '../models/index.js';
import { visibleProjectIds, requireProject } from '../services/access.js';
import { projectResponse, listResponse } from '../services/responses.js';
import * as validate from '../services/validation.js';

// Mostra tutti i progetti agli ADMIN e solo quelli di appartenenza agli USER.
export async function list(req, res) {
  const ids = await visibleProjectIds(req.user);
  const projects = await Project.findAll({ where: ids === null ? {} : { id: { [Op.in]: ids } },
    order: [['updatedAt', 'DESC'], ['id', 'DESC']] });
  res.json(listResponse(await Promise.all(projects.map((project) => projectResponse(project)))));
}

// Legge un singolo progetto dopo il controllo di accesso.
export async function get(req, res) {
  res.json(await projectResponse(await requireProject(req.user, req.params.id)));
}

// Salva progetto e appartenenza del creatore nella stessa transazione.
export async function create(req, res) {
  const input = validate.body(req);
  const name = validate.text(input.name, 'name', 120);
  const description = validate.text(input.description, 'description', 2000);
  const result = await sequelize.transaction(async (transaction) => {
    const project = await Project.create({ name, description }, { transaction });
    await Membership.create({ projectId: project.id, userId: req.user.id }, { transaction });
    return projectResponse(project, transaction);
  });
  res.status(201).json(result);
}
