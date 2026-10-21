// Associa metodi e percorsi HTTP ai controller, indicando autenticazione e permessi richiesti.
import { Router } from 'express';
import { authenticate, requireAdmin } from './middleware/auth.js';
import { uploadImage } from './middleware/upload.js';
import { id } from './services/validation.js';
import * as auth from './controllers/auth.controller.js';
import * as users from './controllers/users.controller.js';
import * as projects from './controllers/projects.controller.js';
import * as members from './controllers/members.controller.js';
import * as issues from './controllers/issues.controller.js';
import * as comments from './controllers/comments.controller.js';
import * as notifications from './controllers/notifications.controller.js';

const routes = Router();

// Controlla i parametri ID prima che il controller prepari una query.
for (const name of ['id', 'projectId', 'userId', 'issueId']) {
  routes.param(name, (req, res, next, value) => {
    req.params[name] = id(value, name);
    next();
  });
}

routes.post('/auth/login', auth.login);
routes.use(authenticate);

routes.get('/users/me', users.me);
routes.get('/users', requireAdmin, users.list);
routes.post('/users', requireAdmin, users.create);
routes.get('/projects', projects.list);
routes.post('/projects', requireAdmin, projects.create);
routes.get('/projects/:id', projects.get);
routes.get('/projects/:projectId/members', members.list);
routes.post('/projects/:projectId/members', requireAdmin, members.add);
routes.delete('/projects/:projectId/members/:userId', requireAdmin, members.remove);
routes.get('/projects/:projectId/issues', issues.list);
routes.get('/issues', issues.list);
routes.post('/issues', uploadImage, issues.create);
routes.get('/issues/:id', issues.get);
routes.get('/issues/:id/image', issues.image);
routes.patch('/issues/:id/status', issues.status);
routes.patch('/issues/:id/assignee', issues.assign);
routes.get('/issues/:issueId/comments', comments.list);
routes.post('/issues/:issueId/comments', comments.create);
routes.get('/notifications', notifications.list);
routes.patch('/notifications/:id/read', notifications.read);

export default routes;
