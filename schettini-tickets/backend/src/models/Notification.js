// backend/src/models/Notification.js (Ejemplo con Sequelize)
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Tu configuración de Sequelize

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // 'success', 'error', 'info', 'warning'
    allowNull: false,
  },
  related_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  related_type: {
    type: DataTypes.STRING, // 'ticket', 'user', 'department'
    allowNull: true,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, // Importante: por defecto es false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifications', // Asegúrate de que coincida con tu tabla real
  timestamps: false, // Si manejas created_at/updated_at manualmente
  hooks: {
    beforeUpdate: (notification) => {
      notification.updated_at = new Date();
    }
  }
});

module.exports = Notification;