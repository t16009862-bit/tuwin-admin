import { useEffect, useRef, useState } from 'react';
import Modal from '../components/Modal';
import {
  addTestimonial,
  deleteTestimonial,
  getTestimonials,
  updateTestimonial,
  uploadToCloudinary,
} from '../api/client';

const EMPTY_FORM = {
  Name: '',
  Quote: '',
  Credentials: '',
  Relationship: '',
  Image_Url: '',
  Sort_Order: '1',
  Featured: false,
  Active: true,
};

function asBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return value === true || String(value).toLowerCase() === 'true';
}

function TestimonialForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...initial,
    Featured: asBoolean(initial.Featured),
    Active: asBoolean(initial.Active, true),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setChecked = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.checked }));

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setUploading(0);
    try {
      const url = await uploadToCloudinary(file, setUploading, 'testimonials');
      setForm((current) => ({ ...current, Image_Url: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="banner-error">{error}</div>}
      <div className="form-field">
        <label>Player or coach name</label>
        <input value={form.Name} onChange={setField('Name')} required />
      </div>
      <div className="form-field">
        <label>Testimonial</label>
        <textarea rows={8} value={form.Quote} onChange={setField('Quote')} required />
      </div>
      <div className="form-field">
        <label>Credentials</label>
        <input value={form.Credentials} onChange={setField('Credentials')} placeholder="World #17 • India #1" />
      </div>
      <div className="form-field">
        <label>Relationship to Tuwin</label>
        <input value={form.Relationship} onChange={setField('Relationship')} placeholder="Coach, training partner, fellow PSA professional…" />
      </div>
      <div className="form-field">
        <label>Photo</label>
        {form.Image_Url && (
          <img src={form.Image_Url} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12, display: 'block', marginBottom: 8 }} />
        )}
        <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading !== null}>
          {uploading !== null ? `Uploading… ${uploading}%` : form.Image_Url ? 'Replace Photo' : 'Upload Photo'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      </div>
      <div className="form-field">
        <label>Display order</label>
        <input type="number" min="1" step="1" value={form.Sort_Order} onChange={setField('Sort_Order')} />
      </div>
      <div className="form-field" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
          <input type="checkbox" checked={form.Featured} onChange={setChecked('Featured')} style={{ width: 'auto' }} /> Featured
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
          <input type="checkbox" checked={form.Active} onChange={setChecked('Active')} style={{ width: 'auto' }} /> Visible on website
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving || uploading !== null}>
          {saving ? 'Saving…' : 'Save Testimonial'}
        </button>
      </div>
    </form>
  );
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setTestimonials(await getTestimonials());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form) => {
    await addTestimonial(form);
    setModalMode(null);
    await load();
  };

  const handleEdit = async (form) => {
    await updateTestimonial(modalMode._row, form);
    setModalMode(null);
    await load();
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this testimonial? This cannot be undone.')) return;
    setDeletingRow(row);
    try {
      await deleteTestimonial(row);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingRow(null);
    }
  };

  const isEditing = modalMode && modalMode !== 'add';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Testimonials</h1>
          <p>Add endorsements from players, coaches, and squash professionals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalMode('add')}>+ Add Testimonial</button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading testimonials…</div>
        ) : testimonials.length === 0 ? (
          <div className="empty-state">No testimonials yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Photo</th><th>Name</th><th>Credentials</th><th>Testimonial</th><th>Order</th><th>Visible</th><th></th></tr>
            </thead>
            <tbody>
              {testimonials.map((testimonial) => (
                <tr key={testimonial._row}>
                  <td data-label="Photo">{testimonial.Image_Url && <img src={testimonial.Image_Url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10 }} />}</td>
                  <td data-label="Name"><strong>{testimonial.Name}</strong></td>
                  <td data-label="Credentials">{testimonial.Credentials}</td>
                  <td className="cell-truncate" data-label="Testimonial" title={testimonial.Quote}>{testimonial.Quote}</td>
                  <td data-label="Order">{testimonial.Sort_Order}</td>
                  <td data-label="Visible">{asBoolean(testimonial.Active, true) ? 'Yes' : 'No'}</td>
                  <td className="row-actions">
                    <button className="btn btn-secondary btn-small" onClick={() => setModalMode(testimonial)}>Edit</button>
                    <button className="btn btn-danger btn-small" onClick={() => handleDelete(testimonial._row)} disabled={deletingRow === testimonial._row}>
                      {deletingRow === testimonial._row ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalMode === 'add' && (
        <Modal title="Add Testimonial" onClose={() => setModalMode(null)}>
          <TestimonialForm initial={EMPTY_FORM} onCancel={() => setModalMode(null)} onSave={handleAdd} />
        </Modal>
      )}
      {isEditing && (
        <Modal title={`Edit ${modalMode.Name}`} onClose={() => setModalMode(null)}>
          <TestimonialForm initial={modalMode} onCancel={() => setModalMode(null)} onSave={handleEdit} />
        </Modal>
      )}
    </div>
  );
}
