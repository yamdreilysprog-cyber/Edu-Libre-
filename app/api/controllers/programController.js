const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const isPremiumPlan = (plan) => ['PRO', 'ULTRA'].includes(plan);

exports.createProgram = async (req, res) => {
  const { name, description, duration, durationMonths, modality, area, type, institutionId, isFree, isActive, study_plan } = req.body;
  const institutionIdNumber = parseInt(institutionId, 10);
  
  if (!name || !duration || !durationMonths || !modality || !area || !type || !institutionIdNumber || !study_plan) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para crear el programa' });
  }

  if (institutionIdNumber <= 0) {
    return res.status(400).json({ error: 'institutionId inválido' });
  }

  try {
    const userId = Number(req.user.userId);

    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .select('id, owner_id')
      .eq('id', institutionIdNumber)
      .single();

    if (institutionError || !institution) {
      return res.status(404).json({ error: 'Institución no encontrada' });
    }

    if (req.user.role === 'INSTITUTION' && institution.owner_id !== userId) {
      return res.status(403).json({ error: 'No autorizado para crear programas en esta institución' });
    }

    const { data: program, error } = await supabase
      .from('programs')
      .insert({
        name,
        description,
        duration,
        duration_months: durationMonths,
        modality,
        area,
        type,
        institution_id: institutionIdNumber,
        is_free: isFree ?? false,
        is_active: isActive ?? true,
        study_plan
      })
      .select()
      .single();

    if (error) {
        console.error('Supabase Insert Error:', error);
        throw error;
    }

    res.status(201).json(program);
  } catch (error) {
    console.error('Program Creation Error:', error);
    res.status(400).json({ error: 'Error al crear programa', details: error.message });
  }
};

exports.updateProgram = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, description, duration, durationMonths, modality, area, type, isFree, isActive, study_plan } = req.body;

  if (!id || id <= 0) {
    return res.status(400).json({ error: 'ID de programa inválido' });
  }

  try {
    // 1. Check if program exists and get institution_id
    const { data: program, error: fetchError } = await supabase
      .from('programs')
      .select('institution_id')
      .eq('id', id)
      .single();

    if (fetchError || !program) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    // 2. Check authorization
    const userId = Number(req.user.userId);
    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .select('owner_id')
      .eq('id', program.institution_id)
      .single();

    if (institutionError || !institution) {
      return res.status(404).json({ error: 'Institución no encontrada' });
    }

    if (req.user.role === 'INSTITUTION' && institution.owner_id !== userId) {
      return res.status(403).json({ error: 'No autorizado para editar este programa' });
    }

    // 3. Update program
    const { data: updatedProgram, error: updateError } = await supabase
      .from('programs')
      .update({
        name,
        description,
        duration,
        duration_months: durationMonths,
        modality,
        area,
        type,
        is_free: isFree ?? false,
        is_active: isActive ?? true,
        study_plan
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(updatedProgram);
  } catch (error) {
    console.error('Program Update Error:', error);
    res.status(500).json({ error: 'Error al actualizar programa', details: error.message });
  }
};

exports.getPrograms = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let userPlan = 'FREE';
    let userRole = null;
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userRole = decoded.role;
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('plan')
                .eq('id', decoded.userId)
                .single();
            
            if (!userError && user?.plan) {
                userPlan = user.plan;
            }
        } catch (err) {
            console.error("JWT verification failed:", err);
            userRole = null;
        }
    }

    let query = supabase
        .from('programs')
        .select('*, institutions(name)', { count: 'exact' })
        .range(offset, offset + limitNum - 1);

    if (userRole !== 'ADMIN' && !isPremiumPlan(userPlan)) {
        query = query.eq('exclusive', false);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error("Supabase query error in getPrograms:", error);
        throw error;
    }

    res.json({ data, total: count, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error("Full Error in getPrograms:", error);
    res.status(500).json({ error: 'Error al obtener programas', details: error.message });
  }
};

exports.getProgramById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id <= 0) {
    return res.status(400).json({ error: 'ID de programa inválido' });
  }

  try {
    const { data: program, error } = await supabase
      .from('programs')
      .select('*, institutions(*)')
      .eq('id', id)
      .single();

    if (error || !program) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }

    res.json(program);
  } catch (error) {
    console.error('Error al obtener programa por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
};
