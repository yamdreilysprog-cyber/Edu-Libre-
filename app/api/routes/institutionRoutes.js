const { Router } = require('express');
const { getInstitutions, getInstitutionById, createInstitution } = require('../controllers/institutionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const { validateRequest, validateQuery } = require('../middlewares/validator');
const { institutionSchema, institutionQuerySchema } = require('../middlewares/schemas');

const router = Router();

router.get('/', validateQuery(institutionQuerySchema), getInstitutions);
router.get('/:id', getInstitutionById);
router.post('/', authenticate, checkRole(['ADMIN', 'INSTITUTION']), validateRequest(institutionSchema), createInstitution);

module.exports = router;
