exports.validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validación fallida',
      details: result.error.errors
    });
  }
  req.body = result.data;
  next();
};

exports.validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      error: 'Parámetros de consulta inválidos',
      details: result.error.errors
    });
  }
  req.query = result.data;
  next();
};

exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
};
