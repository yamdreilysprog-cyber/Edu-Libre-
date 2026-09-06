const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { register, registerInstitution, createUser, login, getProfile, updateProfile, updatePlan, verify } = require('../controllers/authController');
const { validateRequest } = require('../middlewares/validator');
const { registerSchema, registerInstitutionSchema, createUserSchema, loginSchema } = require('../middlewares/schemas');
const { authenticate } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

const router = Router();

// Antes este limiter estaba aplicado a TODO /api/auth desde index.js,
// incluyendo /profile, /update-plan, /create-user -- rutas que no tienen
// nada que ver con fuerza bruta de login. Eso quemaba las 10 peticiones/
// 15min con tráfico normal mientras probabas el flujo completo. Ahora solo
// protege register / register-institution / login.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }
});

router.get('/verify', verify);
router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/register-institution', authLimiter, validateRequest(registerInstitutionSchema), registerInstitution);
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/create-user', authenticate, checkRole(['ADMIN']), validateRequest(createUserSchema), createUser);

// Perfil y planes de pago
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/update-plan', authenticate, updatePlan);

module.exports = router;
