const supabase = require('../config/supabase');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.listInstitutionsByStatus = async (req, res) => {
  const { status, page, limit } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Intentamos listar por `status` (si la tabla lo soporta). Si no,
    // hacemos fallback a `verified` y emulamos estados: PENDING = verified=false,
    // APPROVED = verified=true, REJECTED = (no existe equivalente) -> se filtra por verified=false.
    let data, error, count;
    try {
      ({ data, error, count } = await supabase
        .from('institutions')
        .select('id, name, type, estado, ciudad, status, owner_id, created_at', { count: 'exact' })
        .eq('status', status)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1));
    } catch (err) {
      // Fallback a verified
      let verified = status === 'APPROVED';
      ({ data, error, count } = await supabase
        .from('institutions')
        .select('id, name, type, estado, ciudad, verified, owner_id, created_at', { count: 'exact' })
        .eq('verified', verified)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1));
    }

    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({ data, total, totalPages, page, limit });
  } catch (error) {
    console.error('Error listando instituciones por status:', error);
    res.status(500).json({ error: 'Error al listar instituciones' });
  }
};

exports.updateInstitutionStatus = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de institución inválido' });
  }

  try {
    // OJO: sin .single() a propósito. Con .single(), si el update no
    // encuentra ninguna fila, Supabase devuelve un error (PGRST116) en vez
    // de data: null -- eso hacía que el "if (!institution) 404" de abajo
    // nunca se alcanzara (el error caía primero al catch como un 500
    // genérico). Verificando el array evitamos depender de ese código
    // de error interno.
    // Intentamos actualizar el campo `status`. Si la tabla no dispone de
    // esa columna, usamos `verified` como fallback (APPROVED -> verified=true,
    // REJECTED -> verified=false)
    let institutions;
    try {
      const { data: insts, error: updateError } = await supabase
        .from('institutions')
        .update({ status })
        .eq('id', id)
        .select('id, name, type, status, owner_id');
      if (updateError) throw updateError;
      institutions = insts;
    } catch (err) {
      // fallback
      const toVerified = status === 'APPROVED';
      const { data: insts, error: updateError } = await supabase
        .from('institutions')
        .update({ verified: toVerified })
        .eq('id', id)
        .select('id, name, type, verified, owner_id');
      if (updateError) throw updateError;
      institutions = insts;
    }

    if (!institutions || institutions.length === 0) {
      return res.status(404).json({ error: 'Institución no encontrada' });
    }

    const institution = institutions[0];

    const { data: owner, error: ownerError } = await supabase
      .from('users')
      .select('email')
      .eq('id', institution.owner_id)
      .maybeSingle();

    if (ownerError) {
      console.error('Error buscando email del owner:', ownerError);
    }

    if (owner?.email) {
      const subject = status === 'APPROVED'
        ? 'Institución aprobada en EduLibre'
        : 'Institución rechazada en EduLibre';

      const text = status === 'APPROVED'
        ? `Tu institución "${institution.name}" ha sido aprobada y publicada en EduLibre.`
        : `Tu institución "${institution.name}" ha sido revisada y rechazada. Si necesitas asistencia, contacta al equipo de EduLibre.`;

      try {
        await transporter.sendMail({
          from: '"Edulibre" <noreply@edulibre.com>',
          to: owner.email,
          subject,
          text
        });
      } catch (emailError) {
        console.error('Error enviando notificación de estado de institución:', {
          error: emailError,
          ownerEmail: owner.email,
          institutionId: institution.id,
          status
        });
      }
    } else {
      console.error('No se encontró email de owner para institution id:', institution.id);
    }

    const message = status === 'APPROVED'
      ? 'Institución aprobada correctamente'
      : 'Institución rechazada correctamente';

    res.json({ message, institution });
  } catch (error) {
    console.error('Error actualizando status de institución:', error);
    res.status(500).json({ error: 'Error al actualizar el estado de la institución' });
  }
};
