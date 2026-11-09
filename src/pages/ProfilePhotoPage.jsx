import { useEffect, useState } from 'react';
import { getProfilePhoto, updateProfilePhoto, uploadToCloudinary } from '../api/client';

const DEFAULT_PHOTO = 'https://tuwinh.com/tuwin-profile-2026.jpg';

export default function ProfilePhotoPage() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [pendingUrl, setPendingUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProfilePhoto()
      .then(({ url }) => {
        setCurrentUrl(url || DEFAULT_PHOTO);
        setPendingUrl(url || DEFAULT_PHOTO);
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage('');
    setError('');
    try {
      const url = await uploadToCloudinary(file, setProgress, 'profile');
      setPendingUrl(url);
      setMessage('Upload complete. Review the crop, then save it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!pendingUrl || pendingUrl === DEFAULT_PHOTO) {
      setError('Upload a new photo before saving.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { url } = await updateProfilePhoto(pendingUrl);
      setCurrentUrl(url);
      setPendingUrl(url);
      setMessage('Profile photo saved. The website will use it immediately.');
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
          <h1>Profile Photo</h1>
          <p>Change the circular photo shown on the website homepage.</p>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}
      {message && <div className="banner-success">{message}</div>}

      <div className="card profile-photo-card">
        <div className="profile-photo-preview">
          {pendingUrl ? (
            <img src={pendingUrl} alt="Website profile preview" />
          ) : (
            <div className="loading-state">Loading current photo…</div>
          )}
        </div>

        <div className="profile-photo-controls">
          <h2>Upload a replacement</h2>
          <p>Use a clear, high-resolution JPG, PNG, or WebP. The preview matches the website&apos;s circular crop.</p>

          <label className="btn btn-secondary profile-photo-picker">
            {uploading ? `Uploading… ${progress}%` : 'Choose Photo'}
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading || saving} />
          </label>

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
              {saving ? 'Saving…' : 'Save Profile Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
