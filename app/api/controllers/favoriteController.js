const supabase = require('../config/supabase');

exports.addFavorite = async (req, res) => {
  const { institutionId } = req.body;
  if (!institutionId) {
    return res.status(400).json({ error: 'institutionId es requerido' });
  }
  try {
    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert({ user_id: req.user.userId, institution_id: parseInt(institutionId) })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'La institución ya está en favoritos' });
      }
      throw error;
    }

    res.status(201).json(favorite);
  } catch (error) {
    res.status(400).json({ error: 'Error al añadir a favoritos' });
  }
};

exports.removeFavorite = async (req, res) => {
  const { institutionId } = req.params;
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.user.userId)
      .eq('institution_id', parseInt(institutionId));

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar de favoritos' });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('institution_id, institutions(*)')
      .eq('user_id', req.user.userId);

    if (error) throw error;

    const data = favorites.map(f => f.institutions).filter(Boolean);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
};
