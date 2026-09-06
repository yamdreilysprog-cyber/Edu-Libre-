const { Router } = require('express');
const { createProgram, updateProgram, getPrograms, getProgramById } = require('../controllers/programController');
const { authenticate } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const { validateRequest, validateQuery } = require('../middlewares/validator');
const { programSchema, programQuerySchema } = require('../middlewares/schemas');

const router = Router();

router.get('/', validateQuery(programQuerySchema), getPrograms);
router.get('/:id', getProgramById);
router.post('/', authenticate, checkRole(['ADMIN', 'INSTITUTION']), validateRequest(programSchema), createProgram);
router.put('/:id', authenticate, checkRole(['ADMIN', 'INSTITUTION']), validateRequest(programSchema), updateProgram);

module.exports = router;
