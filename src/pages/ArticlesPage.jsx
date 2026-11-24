import { useEffect, useRef, useState } from 'react';
import Modal from '../components/Modal';
import { getArticles, addArticle, updateArticle, deleteArticle, uploadToCloudinary } from '../api/client';

const EMPTY_FORM = {
  category: '',
  source: '',
  date: '',
  title: '',
  description: '',
  link_text: '',
  url: '',
  image_url: '',
  article_slug: '',
};

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110);
}

function ArticleForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const [isNewspaper, setIsNewspaper] = useState(Boolean(initial.newspaper || initial.article_slug));
  const [uploading, setUploading] = useState(null);
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const uploadNewspaperScan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Select a JPG, PNG, or other image file.'); return; }
    setError('');
    setUploading(0);
    try {
      const url = await uploadToCloudinary(file, setUploading, 'gallery');
      setForm((previous) => ({
        ...previous,
        image_url: url,
        url: isNewspaper && !previous.url ? url : previous.url,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading !== null) return;
    setSaving(true);
    setError('');
    try {
      const next = { ...form };
      if (isNewspaper) {
        if (!next.image_url) throw new Error('Upload the newspaper image before publishing.');
        next.article_slug = next.article_slug || slugify(`${next.date}-${next.source}-${next.title}`);
        next.url = next.url || next.image_url;
        next.link_text = next.link_text || 'View Newspaper';
        next.category = 'Recent Update';
      } else {
        next.article_slug = '';
      }
      await onSave(next);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="banner-error">{error}</div>}
      <div className="form-field">
        <label>
          <input
            type="checkbox"
            checked={isNewspaper}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsNewspaper(checked);
              setForm((f) => ({
                ...f,
                category: checked ? 'Recent Update' : f.category,
                link_text: checked && !f.link_text ? 'View Newspaper' : f.link_text,
                article_slug: checked ? f.article_slug : '',
              }));
            }}
          />{' '}Newspaper clipping (full image and automatic latest-news placement)
        </label>
        {isNewspaper && <p style={{ marginTop: 6, fontSize: 12, opacity: .75 }}>Upload the original newspaper page. It will be shown intact in the archive, with a thumbnail in Recent Updates.</p>}
      </div>
      <div className="form-field">
        <label>Category</label>
        <input value={form.category} onChange={setField('category')} required />
      </div>
      <div className="form-field">
        <label>Source</label>
        <input value={form.source} onChange={setField('source')} required />
      </div>
      <div className="form-field">
        <label>Date</label>
        <input
          type="date"
          value={form.date}
          onChange={setField('date')}
          required
        />
      </div>
      <div className="form-field">
        <label>Title</label>
        <input value={form.title} onChange={setField('title')} required />
      </div>
      <div className="form-field">
        <label>Description</label>
        <textarea rows={4} value={form.description} onChange={setField('description')} />
      </div>
      <div className="form-field">
        <label>Link Text</label>
        <input value={form.link_text} onChange={setField('link_text')} />
      </div>
      <div className="form-field">
        <label>{isNewspaper ? 'Original image or source URL' : 'URL'}</label>
        <input type="url" value={form.url || ''} onChange={setField('url')} required={!isNewspaper} />
      </div>
      <div className="form-field">
        <label>{isNewspaper ? 'Newspaper scan (image)' : 'Article image (optional)'}</label>
        {form.image_url && (
          <img src={form.image_url} alt="Article preview" style={{ maxWidth: 260, maxHeight: 210, objectFit: 'contain', display: 'block', marginBottom: 8, background: '#f8fafc' }} />
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading !== null}>
            {uploading !== null ? `Uploading… ${uploading}%` : (form.image_url ? 'Replace Image' : 'Upload Image')}
          </button>
          <input type="url" value={form.image_url || ''} onChange={setField('image_url')} placeholder="Or paste a hosted image URL" style={{ flex: '1 1 220px' }} />
        </div>
        <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={uploadNewspaperScan} />
      </div>
      {isNewspaper && (
        <div className="form-field">
          <label>Newspaper archive ID (generated automatically if blank)</label>
          <input value={form.article_slug || ''} onChange={setField('article_slug')} placeholder="e.g. daily-news-mumbai-2026-11-24" />
        </div>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || uploading !== null}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState(null); // null | 'add' | article being edited
  const [deletingRow, setDeletingRow] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setArticles(await getArticles());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (form) => {
    await addArticle(form);
    setModalMode(null);
    await load();
  };

  const handleEdit = async (form) => {
    await updateArticle(modalMode._row, form);
    setModalMode(null);
    await load();
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this article? This cannot be undone.')) return;
    setDeletingRow(row);
    try {
      await deleteArticle(row);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingRow(null);
    }
  };

  const isEditing = modalMode && modalMode !== 'add' && modalMode !== 'add-newspaper';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Articles</h1>
          <p>{articles.length} article{articles.length === 1 ? '' : 's'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setModalMode('add-newspaper')}>+ Add Newspaper</button>
          <button className="btn btn-primary" onClick={() => setModalMode('add')}>
            + Add Article
          </button>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading articles…</div>
        ) : articles.length === 0 ? (
          <div className="empty-state">No articles yet. Click "Add Article" to create one.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Category</th>
                <th>Source</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a._row}>
                  <td data-label="Image">
                    {a.image_url && <img src={a.image_url} alt="" loading="lazy" style={{ width: 54, height: 54, objectFit: 'contain', borderRadius: 6 }} />}
                  </td>
                  <td className="cell-truncate" data-label="Title" title={a.title}>
                    {a.title}
                  </td>
                  <td data-label="Category">{a.category}</td>
                  <td data-label="Source">{a.source}</td>
                  <td data-label="Date">{a.date}</td>
                  <td className="row-actions">
                    <button className="btn btn-secondary btn-small" onClick={() => setModalMode(a)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(a._row)}
                      disabled={deletingRow === a._row}
                    >
                      {deletingRow === a._row ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalMode === 'add' && (
        <Modal title="Add Article" onClose={() => setModalMode(null)}>
          <ArticleForm initial={EMPTY_FORM} onCancel={() => setModalMode(null)} onSave={handleAdd} />
        </Modal>
      )}
      {modalMode === 'add-newspaper' && (
        <Modal title="Add Newspaper Clipping" onClose={() => setModalMode(null)}>
          <ArticleForm
            initial={{ ...EMPTY_FORM, newspaper: true, category: 'Recent Update', link_text: 'View Newspaper' }}
            onCancel={() => setModalMode(null)}
            onSave={handleAdd}
          />
        </Modal>
      )}

      {isEditing && (
        <Modal title="Edit Article" onClose={() => setModalMode(null)}>
          <ArticleForm initial={modalMode} onCancel={() => setModalMode(null)} onSave={handleEdit} />
        </Modal>
      )}
    </div>
  );
}
