const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  listAdminForms,
  createAdminForm,
  updateAdminForm,
  deleteAdminForm,
  listClientForms
} = require('../controllers/systemFormController');

const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(authorize('admin'));

adminRouter.get('/', listAdminForms);
adminRouter.post('/', createAdminForm);
adminRouter.put('/:id', updateAdminForm);
adminRouter.delete('/:id', deleteAdminForm);

const clientRouter = express.Router();
clientRouter.use(protect);
clientRouter.use(authorize('client'));

clientRouter.get('/', listClientForms);

module.exports = { adminRouter, clientRouter };
