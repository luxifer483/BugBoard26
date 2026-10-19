// Definisce campi e relazioni delle sei tabelle esistenti; qui non viene salvato alcun dato.
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ROLES = ['USER', 'ADMIN'];
export const ISSUE_TYPES = ['BUG', 'FEATURE', 'DOCUMENTATION', 'QUESTION'];
export const ISSUE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const ISSUE_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'];

// Restituisce una nuova definizione di colonna per ciascun modello.
function id() {
  return { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true };
}
function date(field) {
  return { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field };
}
function reference(field, allowNull = false) {
  return { type: DataTypes.BIGINT, allowNull, field };
}
function text(length, field) {
  return { type: DataTypes.STRING(length), allowNull: false, ...(field ? { field } : {}),
    validate: { notEmpty: true, len: [1, length] } };
}
function choice(values, defaultValue) {
  return { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [values] },
    ...(defaultValue ? { defaultValue } : {}) };
}

export class User extends Model {}
User.init({
  id: id(), fullName: text(120, 'full_name'),
  email: { ...text(254), unique: true, validate: { isEmail: true, len: [1, 254] } },
  passwordHash: text(100, 'password_hash'), role: choice(ROLES), createdAt: date('created_at'),
}, { sequelize, tableName: 'app_users', modelName: 'User' });

export class Project extends Model {}
Project.init({
  id: id(), name: text(120), description: text(2000),
  status: choice(['ACTIVE', 'ARCHIVED'], 'ACTIVE'),
  createdAt: date('created_at'), updatedAt: date('updated_at'),
}, { sequelize, tableName: 'projects', modelName: 'Project' });

export class Membership extends Model {}
Membership.init({
  id: id(), projectId: reference('project_id'), userId: reference('user_id'), joinedAt: date('joined_at'),
}, { sequelize, tableName: 'project_memberships', modelName: 'Membership',
  indexes: [{ unique: true, fields: ['project_id', 'user_id'], name: 'uk_membership_project_user' }] });

export class Issue extends Model {}
Issue.init({
  id: id(), projectId: reference('project_id'), reporterId: reference('reporter_id'),
  assigneeId: reference('assignee_id', true), title: text(200), description: text(10000),
  type: choice(ISSUE_TYPES), priority: choice(ISSUE_PRIORITIES), status: choice(ISSUE_STATUSES, 'OPEN'),
  createdAt: date('created_at'), updatedAt: date('updated_at'),
}, { sequelize, tableName: 'issues', modelName: 'Issue' });

export class Comment extends Model {}
Comment.init({
  id: id(), issueId: reference('issue_id'), authorId: reference('author_id'),
  content: text(5000), createdAt: date('created_at'),
}, { sequelize, tableName: 'issue_comments', modelName: 'Comment' });

export class Notification extends Model {}
Notification.init({
  id: id(), recipientId: reference('recipient_id'), issueId: reference('issue_id'),
  message: text(500), read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdAt: date('created_at'),
}, { sequelize, tableName: 'notifications', modelName: 'Notification' });

// Collega gli oggetti, usando gli stessi nomi di chiave esterna del vecchio schema.
Membership.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Membership.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Project.hasMany(Membership, { as: 'memberships', foreignKey: 'projectId' });
Issue.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Issue.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });
Issue.belongsTo(User, { as: 'assignee', foreignKey: 'assigneeId' });
Comment.belongsTo(Issue, { as: 'issue', foreignKey: 'issueId' });
Comment.belongsTo(User, { as: 'author', foreignKey: 'authorId' });
Notification.belongsTo(Issue, { as: 'issue', foreignKey: 'issueId' });
Notification.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

export { sequelize };
