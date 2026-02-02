// Asegúrate de que tu modelo tenga estos campos o similares
const mongoose = require('mongoose'); // O tu ORM/ODM de preferencia

const ticketSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, // ID del usuario que creó el ticket
      required: true,
      ref: 'User', // Referencia al modelo de usuario
    },
    department: {
      type: String, // O mongoose.Schema.Types.ObjectId si los departamentos son otro modelo
      required: [true, 'Por favor selecciona un departamento'],
    },
    subject: { // Asumo que "title" en tu UI es "subject" en el modelo
      type: String,
      required: [true, 'Por favor introduce un asunto'],
      maxlength: [100, 'El asunto no puede tener más de 100 caracteres'],
    },
    description: {
      type: String,
      required: [true, 'Por favor introduce una descripción'],
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'], // Estados posibles
      default: 'open',
    },
    priority: { // Opcional: si quieres añadir prioridad
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: { // Opcional: ID del agente asignado
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Podrías añadir un campo para 'comments' aquí o un modelo de 'Comment' separado
    // comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
  },
  {
    timestamps: true, // Esto añade createdAt y updatedAt automáticamente
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);