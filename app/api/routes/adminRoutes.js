const { Router } = require('express');
const { listInstitutionsByStatus, updateInstitutionStatus } = require('../controllers/adminController');
const { validateRequest, validateQuery } = require('../middlewares/validator');
const { adminInstitutionQuerySchema, institutionStatusUpdateSchema } = require('../middlewares/schemas');
const { authenticate } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

const router = Router();

router.use(authenticate);
router.use(checkRole(['ADMIN']));

router.get('/institutions', validateQuery(adminInstitutionQuerySchema), listInstitutionsByStatus);
router.put('/institutions/:id/status', validateRequest(institutionStatusUpdateSchema), updateInstitutionStatus);

module.exports = router;
