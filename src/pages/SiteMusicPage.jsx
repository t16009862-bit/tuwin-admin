import { useEffect, useState } from 'react';
import { addSheetResource, getSheetResource, updateSheetResource } from '../api/client';

const DEFAULT_MUSIC = {
  enabled: 'true',
  title: 'Hall of Fame',
  artist: 'The Script ft. will.i.am',
  youtubeId: 'mk48xRzuNvA',
};

export default function SiteMusicPage() {
  const [row, setRow] = useState(null);
  const [form, setForm] = useState(DEFAULT_MUSIC);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const rows = await getSheetResource('site-music');
    const first = rows[0] ?? null;
    setRow(first);
    setForm(first ?? DEFAULT_MUSIC);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const setField = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      if (row?._row) await updateSheetResource('site-music', row._row, form);
      else await addSheetResource('site-music', form);
      await load();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Site Music</h1>
          <p>Controls the official YouTube player shown across the public website.</p>
        </div>
      </div>
      <div className="banner-info">Browsers block surprise autoplay with sound. Visitors get a clear Play button; their click starts the official video and audio.</div>
      <div className="card form-card">
        {loading ? <div className="loading-state">Loading music settings…</div> : (
          <form onSubmit={save}>
            {error && <div className="banner-error">{error}</div>}
            {saved && <div className="banner-success">Saved to Google Sheets. The public player will use this setting automatically.</div>}
            <div className="form-field">
              <label htmlFor="music-enabled">Player status</label>
              <select id="music-enabled" value={form.enabled ?? 'true'} onChange={setField('enabled')}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="music-title">Song title</label>
              <input id="music-title" value={form.title ?? ''} onChange={setField('title')} required />
            </div>
            <div className="form-field">
              <label htmlFor="music-artist">Artist</label>
              <input id="music-artist" value={form.artist ?? ''} onChange={setField('artist')} required />
            </div>
            <div className="form-field">
              <label htmlFor="music-youtube">Official YouTube video ID</label>
              <input id="music-youtube" value={form.youtubeId ?? ''} onChange={setField('youtubeId')} required pattern="[A-Za-z0-9_-]{11}" />
              <p className="field-help">For Hall of Fame, the official video ID is mk48xRzuNvA.</p>
            </div>
            <div className="form-actions">
              <a className="btn btn-secondary" href={`https://www.youtube.com/watch?v=${form.youtubeId}`} target="_blank" rel="noopener noreferrer">Preview official video ↗</a>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save music settings'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
