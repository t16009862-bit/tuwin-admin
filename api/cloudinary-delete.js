const { deleteByUrl } = require('./_lib/cloudinary');
const { requireAdmin } = require('./_lib/auth');

// Used when a form lets someone remove an image before saving (e.g.
// Packages' Image_Set) — the asset already exists on Cloudinary at that
// point, so it needs an explicit delete or it's orphaned forever.
module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const url = req.body?.url;
    if (!url) return res.status(400).json({ error: 'Missing url' });

    await deleteByUrl(url);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('cloudinary-delete handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
