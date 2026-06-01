const express = require('express');
const router = express.Router();
const { handleGoogleFormsWebhook } = require('../controllers/googleFormsWebhookController');

/** Webhook público: validación por x-webhook-secret (sin JWT). */
const verifyWebhookSecret = (req, res, next) => {
  const expected = process.env.WEBHOOK_SECRET;
  const received = req.headers['x-webhook-secret'];
  if (!expected || received !== expected) {
    return res.status(401).json({ success: false, message: 'Webhook no autorizado' });
  }
  next();
};

router.post('/google-forms', verifyWebhookSecret, handleGoogleFormsWebhook);

module.exports = router;
