import { useEffect, useRef, useState } from 'react';
import {
  getPressKit,
  updatePressKit,
  uploadDocumentToCloudinary,
} from '../api/client';

const STATIC_FALLBACK = 'https://tuwinh.com/tuwin_portfolio.pdf';
const MAX_FILE_SIZE = 15 * 1024 * 1024;

export default function PressKitPage() {
  const inputRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [pendingUrl, setPendingUrl] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getPressKit()
      .then(({ url, updatedAt: lastUpdated }) => {
        const activeUrl = url || STATIC_FALLBACK;
        setCurrentUrl(activeUrl);
        setPendingUrl(activeUrl);
        setUpdatedAt(lastUpdated || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Choose a PDF file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('The PDF must be smaller than 15 MB.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage('');
    setError('');
    try {
      const url = await uploadDocumentToCloudinary(file, setProgress);
      setPendingUrl(url);
      setMessage('Upload complete. Open the preview if needed, then save it to the website.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!pendingUrl || pendingUrl === currentUrl) return;

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await updatePressKit(pendingUrl);
      setCurrentUrl(result.url);
      setPendingUrl(result.url);
      setUpdatedAt(result.updatedAt);
      setMessage('Press kit published. The website Media page now uses this PDF.');
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
          <h1>Press Kit</h1>
          <p>Upload and replace the official PDF shown on the website Media page.</p>
        </div>
        <a className="btn btn-secondary" href="https://tuwinh.com/media" target="_blank" rel="noopener noreferrer">
          View Media Page ↗
        </a>
      </div>

      {error && <div className="banner-error">{error}</div>}
      {message && <div className="banner-success">{message}</div>}

      <div className="card press-kit-card">
        <div className="press-kit-preview">
          {loading ? (
            <div className="loading-state">Loading current press kit…</div>
          ) : (
            <iframe src={`${pendingUrl}#page=1&view=FitH`} title="Press kit preview" />
          )}
        </div>

        <div className="press-kit-controls">
          <span className="press-kit-label">Official website asset</span>
          <h2>Replace the media kit</h2>
          <p>
            Upload one polished PDF, review it, and save. The website will switch to the new file without a code deployment.
          </p>
          <ul className="press-kit-checklist">
            <li>PDF only</li>
            <li>Maximum file size: 15 MB</li>
            <li>Use an A4 portrait layout for the best presentation</li>
          </ul>

          {updatedAt && (
            <p className="press-kit-updated">Last changed: {new Date(updatedAt).toLocaleString()}</p>
          )}

          <div className="press-kit-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || saving}
            >
              {uploading ? `Uploading… ${progress}%` : 'Choose PDF'}
            </button>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleFile} />
            <a className="btn btn-secondary" href={pendingUrl || currentUrl} target="_blank" rel="noopener noreferrer">
              Open Preview ↗
            </a>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPendingUrl(currentUrl)}
              disabled={uploading || saving || pendingUrl === currentUrl}
            >
              Undo Preview
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={uploading || saving || !pendingUrl || pendingUrl === currentUrl}
            >
              {saving ? 'Publishing…' : 'Publish Press Kit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
