const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { hashPassword, verifyPassword } = require('../services/authService');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.register = async (req, res) => {
  let { name, email, password, nombre, apellido } = req.body;
  if (!name && nombre) {
    name = [nombre, apellido].filter(Boolean).join(' ').trim();
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Configuración interna incorrecta' });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos: name, email o password' });
  }

  try {
    const hashed = await hashPassword(password);
    const verificationToken = uuidv4();
    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password: hashed, role: 'STUDENT', isVerified: false, verificationToken })
      .select('id, name, email, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }
      throw error;
    }

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Configuración de email incompleta en .env');
    }

    const verificationLink = `http://${req.headers.host}/api/auth/verify?token=${verificationToken}`;

    try {
      await transporter.sendMail({
        from: '"Edulibre" <noreply@edulibre.com>',
        to: email,
        subject: 'Verifica tu cuenta',
        text: `Haz clic en el siguiente enlace para verificar tu cuenta: ${verificationLink}`
      });
    } catch (emailError) {
      console.error('ERROR CRÍTICO AL ENVIAR CORREO:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command
      });
      // No abortamos el registro si el mail falla, pero queda logueado.
    }

    res.status(201).json({
      message: 'Cuenta creada exitosamente. Por favor verifica tu correo electrónico para continuar.',
      redirect: '/registro-exitoso'
    });
  } catch (error) {
    console.error('Error en registro:', {
      body: req.body,
      message: error?.message || error,
      stack: error?.stack || null
    });
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Registro PÚBLICO de instituciones (sin login). Crea el usuario y la
// institución en un solo request. La institución queda en status
// 'PENDING' hasta que un Admin la apruebe vía /api/admin.
exports.registerInstitution = async (req, res) => {
  const { name, email, password, institution } = req.body;

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Configuración interna incorrecta' });
  }

  try {
    const hashed = await hashPassword(password);
    const verificationToken = uuidv4();

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ name, email, password: hashed, role: 'INSTITUTION', isVerified: false, verificationToken })
      .select('id, name, email, role')
      .single();

    if (userError) {
      if (userError.code === '23505') {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }
      throw userError;
    }

    const { data: createdInstitution, error: institutionError } = await supabase
      .from('institutions')
      .insert({
        name: institution.name,
        description: institution.description,
        website: institution.website,
        location: institution.location,
        estado: institution.estado,
        ciudad: institution.ciudad,
        phone: institution.phone,
        type: institution.type,
        gestion: institution.gestion,
        owner_id: user.id
        // NOTAR: no se fija 'status' aquí para ser compatible con esquemas
        // que usan `verified` en lugar de `status`. Si la tabla tiene
        // status con DEFAULT 'PENDING', se aplicará automáticamente.
      })
      .select('id, name, type, status, verified')
      .single();

    if (institutionError) {
      // Sin institución no dejamos al usuario a medio crear.
      await supabase.from('users').delete().eq('id', user.id);
      if (institutionError.code === '23505') {
        return res.status(409).json({ error: 'Ya existe una institución registrada con esos datos' });
      }
      return res.status(400).json({ error: 'No se pudo registrar la institución', details: institutionError.message });
    }

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Configuración de email incompleta en .env');
    }

    const verificationLink = `http://${req.headers.host}/api/auth/verify?token=${verificationToken}`;

    try {
      await transporter.sendMail({
        from: '"Edulibre" <noreply@edulibre.com>',
        to: email,
        subject: 'Verifica tu cuenta de institución',
        text: `Haz clic para verificar tu cuenta: ${verificationLink}. Una vez verificada, nuestro equipo revisará los datos de tu institución antes de publicarla.`
      });
    } catch (emailError) {
      console.error('ERROR CRÍTICO AL ENVIAR CORREO:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command
      });
    }

    res.status(201).json({
      message: 'Solicitud recibida. Verifica tu correo electrónico; luego nuestro equipo revisará los datos de tu institución antes de publicarla.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      institution: createdInstitution
    });
  } catch (error) {
    console.error('Error en registro de institución:', {
      body: req.body,
      message: error?.message || error,
      stack: error?.stack || null
    });
    res.status(500).json({ error: 'Error al registrar institución' });
  }
};

exports.createUser = async (req, res) => {
  const { name, email, password, role, institution } = req.body;
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Configuración interna incorrecta' });
  }

  try {
    const hashed = await hashPassword(password);
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ name, email, password: hashed, role, isVerified: true })
      .select('id, name, email, role')
      .single();

    if (userError) {
      if (userError.code === '23505') {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }
      throw userError;
    }

    let createdInstitution = null;
    if (role === 'INSTITUTION') {
      // Intentamos crear la institución como aprobada. Si la DB no tiene
      // la columna `status`, guardamos `verified: true` como fallback.
      const institutionPayload = {
        name: institution.name,
        description: institution.description,
        website: institution.website,
        location: institution.location,
        estado: institution.estado,
        ciudad: institution.ciudad,
        phone: institution.phone,
        type: institution.type,
        gestion: institution.gestion,
        owner_id: user.id
      };

      // Primero intentamos insertar con status = 'APPROVED' (por compatibilidad
      // con instalaciones que sí usen ese campo). Si falla, reintentamos
      // usando `verified: true`.
      let institutionData = null;
      try {
        const { data, error } = await supabase
          .from('institutions')
          .insert({ ...institutionPayload, status: 'APPROVED' })
          .select('id, name, description, website, location, estado, ciudad, phone, type, owner_id, status, verified')
          .single();
        if (error) throw error;
        institutionData = data;
      } catch (err) {
        // Fallback: intentar insertar sin `status`, marcando verified=true
        const { data, error } = await supabase
          .from('institutions')
          .insert({ ...institutionPayload, verified: true })
          .select('id, name, description, website, location, estado, ciudad, phone, type, owner_id, verified')
          .single();
        if (error) {
          await supabase.from('users').delete().eq('id', user.id);
          if (error.code === '23505') {
            return res.status(409).json({ error: 'Error al crear institución: ya existe un registro con la misma llave única' });
          }
          return res.status(400).json({ error: 'No se pudo crear la institución asociada', details: error.message });
        }
        institutionData = data;
      }

      createdInstitution = institutionData;

      if (institutionError) {
        await supabase.from('users').delete().eq('id', user.id);
        if (institutionError.code === '23505') {
          return res.status(409).json({ error: 'Error al crear institución: ya existe un registro con la misma llave única' });
        }
        return res.status(400).json({ error: 'No se pudo crear la institución asociada', details: institutionError.message });
      }

      createdInstitution = institutionData;
    }

    const responsePayload = {
      message: 'Usuario creado exitosamente',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };

    if (createdInstitution) {
      responsePayload.institution = createdInstitution;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Configuración interna incorrecta' });
  }
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, role, isVerified')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Debes verificar tu cuenta. Revisa tu bandeja de entrada.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    let institution = null;
    if (user.role === 'INSTITUTION') {
        const { data } = await supabase
            .from('institutions')
            .select('id')
            .eq('owner_id', user.id)
            .single();
        institution = data;
    }

    res.json({ 
        token, 
        role: user.role, 
        user: { 
            id: user.id, 
            role: user.role, 
            institutionId: institution ? institution.id : null 
        } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

exports.verify = async (req, res) => {
  const { token } = req.query;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({ isVerified: true, verificationToken: null })
      .eq('verificationToken', token)
      .select('id')
      .single();


    if (error || !user) {
      return res.status(400).send('Token inválido o cuenta ya verificada.');
    }

    res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar cuenta' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, estado, ciudad')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, phone, estado, ciudad } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({ name, phone, estado, ciudad })
      .eq('id', req.user.userId)
      .select('id, name, email, role, phone, estado, ciudad')
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

exports.updatePlan = async (req, res) => {
  const { plan } = req.body;
  if (!['FREE', 'BASIC', 'PRO', 'ULTRA'].includes(plan)) {
    return res.status(400).json({ error: 'Plan de pago inválido' });
  }
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({ plan })
      .eq('id', req.user.userId)
      .select('id, name, email, plan')
      .single();

    if (error) throw error;

    res.json({ message: 'Plan actualizado exitosamente', plan: user.plan });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar plan de pago' });
  }
};
