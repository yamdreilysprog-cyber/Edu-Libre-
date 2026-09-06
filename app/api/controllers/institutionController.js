const supabase = require('../config/supabase');

exports.getInstitutions = async (req, res) => {
  try {
    const { q: searchQuery, name, type, programType, estado, ciudad, area, acreditada, gestion, modality, isFree, duration, page, limit } = req.query;
    const offset = (page - 1) * limit;

    const needsProgramJoin = Boolean(area || programType || modality || typeof isFree === 'boolean' || duration);
    const programsSelect = needsProgramJoin
      ? 'programs!inner(id, name, type, modality, area, duration, duration_months, is_free)'
      : 'programs(id, name, type, modality, area, duration, duration_months, is_free)';

    const buildBaseQuery = (usePrograms, useStatus) => {
      const sel = `id, name, description, location, estado, ciudad, type, gestion, website, phone, is_accredited, ${usePrograms ? programsSelect : 'programs(id, name, type, modality, area, duration, duration_months, is_free)'} `;
      let query = supabase.from('institutions').select(sel, { count: 'exact' }).order('name');
      if (useStatus) query = query.eq('status', 'APPROVED');
      else query = query.eq('verified', true);
      query = query.range(offset, offset + limit - 1);
      return query;
    };

    let programMatchingInstIds = [];
    if (searchQuery) {
      const { data: matchingProgs } = await supabase
        .from('programs')
        .select('institution_id')
        .or(`name.ilike.%${searchQuery}%,area.ilike.%${searchQuery}%`);
      if (matchingProgs && matchingProgs.length > 0) {
        programMatchingInstIds = [...new Set(matchingProgs.map(p => p.institution_id))];
      }
    }

    const applyFilters = (query, withProgramFilters) => {
      if (searchQuery) {
        if (programMatchingInstIds.length > 0) {
          query = query.or(`name.ilike.%${searchQuery}%,id.in.(${programMatchingInstIds.join(',')})`);
        } else {
          query = query.ilike('name', `%${searchQuery}%`);
        }
      }
      if (name) query = query.ilike('name', `%${name}%`);
      if (type) query = query.eq('type', type);
      if (estado) query = query.ilike('estado', `%${estado}%`);
      if (ciudad) query = query.ilike('ciudad', `%${ciudad}%`);
      if (gestion) query = query.eq('gestion', gestion);
      if (typeof acreditada === 'boolean') query = query.eq('is_accredited', acreditada);

      if (withProgramFilters) {
        if (area) query = query.ilike('programs.area', `%${area}%`);
        if (programType) query = query.eq('programs.type', programType);
        if (modality) query = query.eq('programs.modality', modality);
        if (typeof isFree === 'boolean') query = query.eq('programs.is_free', isFree);
        if (duration) {
          if (duration === 'CORTA') {
            query = query.lte('programs.duration_months', 6);
          } else if (duration === 'MEDIA') {
            query = query.gt('programs.duration_months', 6).lte('programs.duration_months', 36);
          } else if (duration === 'LARGA') {
            query = query.gt('programs.duration_months', 36);
          }
        }
      }
      return query;
    };

    const runQuery = async (usePrograms, useStatus) => {
      let query = buildBaseQuery(usePrograms, useStatus);
      query = applyFilters(query, usePrograms);
      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count };
    };

    let result = await runQuery(true, true);
    if (result.count === 0 && !searchQuery && !area && !programType && !modality && !duration) {
      result = await runQuery(true, false);
    }

    if (result.data && result.data.length > 0) {
      result.data = result.data.map(inst => {
        let progs = Array.isArray(inst.programs) ? inst.programs : [];
        
        if (searchQuery) {
          const qLower = searchQuery.toLowerCase().trim();
          const instMatches = (inst.name || '').toLowerCase().includes(qLower) || (inst.description || '').toLowerCase().includes(qLower);
          if (!instMatches) {
            progs = progs.filter(p => 
              (p.name || '').toLowerCase().includes(qLower) || 
              (p.area || '').toLowerCase().includes(qLower) ||
              (p.type || '').toLowerCase().includes(qLower)
            );
          }
        }
        if (programType) {
          progs = progs.filter(p => (p.type || '').toUpperCase() === programType.toUpperCase());
        }
        if (modality) {
          progs = progs.filter(p => (p.modality || '').toUpperCase() === modality.toUpperCase());
        }
        if (typeof isFree === 'boolean') {
          progs = progs.filter(p => Boolean(p.is_free) === isFree);
        }
        if (area) {
          const areaLower = area.toLowerCase().trim();
          progs = progs.filter(p => (p.area || '').toLowerCase().includes(areaLower));
        }
        if (duration) {
          if (duration === 'CORTA') progs = progs.filter(p => p.duration_months <= 6);
          else if (duration === 'MEDIA') progs = progs.filter(p => p.duration_months > 6 && p.duration_months <= 36);
          else if (duration === 'LARGA') progs = progs.filter(p => p.duration_months > 36);
        }

        return { ...inst, programs: progs };
      }).filter(inst => {
        if (programType || modality || typeof isFree === 'boolean' || duration || area) {
          return inst.programs.length > 0;
        }
        if (searchQuery) {
          const qLower = searchQuery.toLowerCase().trim();
          const instMatches = (inst.name || '').toLowerCase().includes(qLower);
          return instMatches || inst.programs.length > 0;
        }
        return true;
      });
    }

    const total = result.data.length;
    const totalPages = Math.ceil(total / limit) || 1;
    return res.json({ data: result.data || [], total, totalPages, page, limit });
  } catch (error) {
    console.error('Error al buscar instituciones:', error);
    res.status(500).json({ error: 'Error al buscar instituciones' });
  }
};

exports.getInstitutionById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id <= 0) {
    return res.status(400).json({ error: 'ID de institución inválido' });
  }

  try {
    const { data: institution, error } = await supabase
      .from('institutions')
      .select('*, programs(*)')
      .eq('id', id)
      .single();

    if (error || !institution) {
      return res.status(404).json({ error: 'Institución no encontrada' });
    }

    res.json(institution);
  } catch (error) {
    console.error('Error al obtener institución:', error);
    res.status(500).json({ error: 'Error al obtener institución' });
  }
};

exports.createInstitution = async (req, res) => {
  const { name, website, location, estado, ciudad, type, description, phone, gestion } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
  }

  try {
    if (req.user.role === 'INSTITUTION') {
      const { data: existingInstitution, error: existingError } = await supabase
        .from('institutions')
        .select('id')
        .eq('owner_id', req.user.userId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existingInstitution) {
        return res.status(409).json({ error: 'Este usuario ya tiene una institución registrada' });
      }
    }

    const { data: institution, error } = await supabase
      .from('institutions')
      .insert({
        name,
        description,
        website,
        location,
        estado,
        ciudad,
        phone,
        type,
        gestion,
        owner_id: req.user.userId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Este usuario ya tiene una institución registrada' });
      }
      throw error;
    }

    res.status(201).json(institution);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear institución' });
  }
};
