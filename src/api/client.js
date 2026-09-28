async function request(url, options = {}) {
  const adminKey = typeof window !== 'undefined' ? window.sessionStorage.getItem('tuwin_admin_key') : '';
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(adminKey ? { 'X-Admin-Key': adminKey } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function setAdminAccessKey(key) {
  window.sessionStorage.setItem('tuwin_admin_key', key);
}

export function clearAdminAccessKey() {
  window.sessionStorage.removeItem('tuwin_admin_key');
}

export const verifyAdminAccess = () => request('/api/rankings');

// Shared by the PSA-record and site-music editors. Each resource maps to a
// dedicated Google Sheet tab through api/_lib/simpleTabs.js.
export const getSheetResource = (resource) => request(`/api/${resource}`);
export const addSheetResource = (resource, entry) =>
  request(`/api/${resource}`, { method: 'POST', body: JSON.stringify(entry) });
export const updateSheetResource = (resource, row, entry) =>
  request(`/api/${resource}?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteSheetResource = (resource, row) =>
  request(`/api/${resource}?row=${row}`, { method: 'DELETE' });

// Articles
export const getArticles = () => request('/api/articles');
export const addArticle = (article) =>
  request('/api/articles', { method: 'POST', body: JSON.stringify(article) });
export const updateArticle = (row, article) =>
  request(`/api/articles?row=${row}`, { method: 'PUT', body: JSON.stringify(article) });
export const deleteArticle = (row) =>
  request(`/api/articles?row=${row}`, { method: 'DELETE' });

// Gallery
export const getGallery = () => request('/api/gallery');
export const addGalleryImage = (category, url) =>
  request('/api/gallery', { method: 'POST', body: JSON.stringify({ category, url }) });
export const deleteGalleryImage = (category, row) =>
  request(`/api/gallery?category=${encodeURIComponent(category)}&row=${row}`, { method: 'DELETE' });
export const moveGalleryImage = (category, row, toCategory) =>
  request('/api/gallery', { method: 'PATCH', body: JSON.stringify({ category, row, toCategory }) });
export const addGalleryCategory = (name) =>
  request('/api/gallery-categories', { method: 'POST', body: JSON.stringify({ name }) });
export const deleteGalleryCategory = (name) =>
  request(`/api/gallery-categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
export const reorderGalleryCategory = (name, direction) =>
  request('/api/gallery-categories', { method: 'PATCH', body: JSON.stringify({ name, direction }) });

// Bio
export const getBios = () => request('/api/bio');
export const addBio = (bio) => request('/api/bio', { method: 'POST', body: JSON.stringify(bio) });
export const updateBio = (row, bio) =>
  request(`/api/bio?row=${row}`, { method: 'PUT', body: JSON.stringify(bio) });
export const deleteBio = (row) => request(`/api/bio?row=${row}`, { method: 'DELETE' });

// Sponsors
export const getSponsors = () => request('/api/sponsors');
export const addSponsor = (sponsor) =>
  request('/api/sponsors', { method: 'POST', body: JSON.stringify(sponsor) });
export const updateSponsor = (row, sponsor) =>
  request(`/api/sponsors?row=${row}`, { method: 'PUT', body: JSON.stringify(sponsor) });
export const deleteSponsor = (row) => request(`/api/sponsors?row=${row}`, { method: 'DELETE' });

// Packages
export const getPackages = () => request('/api/packages');
export const addPackage = (pkg) =>
  request('/api/packages', { method: 'POST', body: JSON.stringify(pkg) });
export const updatePackage = (row, pkg) =>
  request(`/api/packages?row=${row}`, { method: 'PUT', body: JSON.stringify(pkg) });
export const deletePackage = (row) => request(`/api/packages?row=${row}`, { method: 'DELETE' });

// Rankings
export const getRankings = () => request('/api/rankings');
export const addRanking = (ranking) =>
  request('/api/rankings', { method: 'POST', body: JSON.stringify(ranking) });
export const updateRanking = (row, ranking) =>
  request(`/api/rankings?row=${row}`, { method: 'PUT', body: JSON.stringify(ranking) });
export const deleteRanking = (row) => request(`/api/rankings?row=${row}`, { method: 'DELETE' });

// Upcoming Tournaments
export const getUpcoming = () => request('/api/upcoming');
export const addUpcoming = (tournament) =>
  request('/api/upcoming', { method: 'POST', body: JSON.stringify(tournament) });
export const updateUpcoming = (row, tournament) =>
  request(`/api/upcoming?row=${row}`, { method: 'PUT', body: JSON.stringify(tournament) });
export const deleteUpcoming = (row) => request(`/api/upcoming?row=${row}`, { method: 'DELETE' });

// Coach & Club
export const getCoachClub = () => request('/api/coach-club');
export const addCoachClub = (entry) =>
  request('/api/coach-club', { method: 'POST', body: JSON.stringify(entry) });
export const updateCoachClub = (row, entry) =>
  request(`/api/coach-club?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteCoachClub = (row) => request(`/api/coach-club?row=${row}`, { method: 'DELETE' });

// Contact
export const getContacts = () => request('/api/contact');
export const addContact = (entry) =>
  request('/api/contact', { method: 'POST', body: JSON.stringify(entry) });
export const updateContact = (row, entry) =>
  request(`/api/contact?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteContact = (row) => request(`/api/contact?row=${row}`, { method: 'DELETE' });

// Career Achievements
export const getCareerAchievements = () => request('/api/career-achievements');
export const addCareerAchievement = (entry) =>
  request('/api/career-achievements', { method: 'POST', body: JSON.stringify(entry) });
export const updateCareerAchievement = (row, entry) =>
  request(`/api/career-achievements?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteCareerAchievement = (row) =>
  request(`/api/career-achievements?row=${row}`, { method: 'DELETE' });

// Career Highlights
export const getCareerHighlights = () => request('/api/career-highlights');
export const addCareerHighlight = (entry) =>
  request('/api/career-highlights', { method: 'POST', body: JSON.stringify(entry) });
export const updateCareerHighlight = (row, entry) =>
  request(`/api/career-highlights?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteCareerHighlight = (row) =>
  request(`/api/career-highlights?row=${row}`, { method: 'DELETE' });

// Competency Blueprint
export const getCompetencyBlueprints = () => request('/api/competency-blueprint');
export const addCompetencyBlueprint = (entry) =>
  request('/api/competency-blueprint', { method: 'POST', body: JSON.stringify(entry) });
export const updateCompetencyBlueprint = (row, entry) =>
  request(`/api/competency-blueprint?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteCompetencyBlueprint = (row) =>
  request(`/api/competency-blueprint?row=${row}`, { method: 'DELETE' });

// Training History
export const getTrainingHistory = () => request('/api/training-history');
export const addTrainingHistory = (entry) =>
  request('/api/training-history', { method: 'POST', body: JSON.stringify(entry) });
export const updateTrainingHistory = (row, entry) =>
  request(`/api/training-history?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteTrainingHistory = (row) =>
  request(`/api/training-history?row=${row}`, { method: 'DELETE' });

// Biography
export const getBiography = () => request('/api/biography');
export const updateBiographyDescription = (description) =>
  request('/api/biography', { method: 'PUT', body: JSON.stringify({ description }) });
export const addBiographySection = (entry) =>
  request('/api/biography', { method: 'POST', body: JSON.stringify(entry) });
export const updateBiographySection = (row, entry) =>
  request(`/api/biography?row=${row}`, { method: 'PUT', body: JSON.stringify(entry) });
export const deleteBiographySection = (row) =>
  request(`/api/biography?row=${row}`, { method: 'DELETE' });

// Cloudinary delete goes through the backend (needs the API secret) — used
// when an image is removed from a set (e.g. Packages' Image_Set) before the
// row is saved, so it doesn't just get orphaned on Cloudinary.
export const deleteCloudinaryAsset = (url) =>
  request('/api/cloudinary-delete', { method: 'POST', body: JSON.stringify({ url }) });

// Cloudinary — direct unsigned upload from the browser, no backend involved.
export async function uploadToCloudinary(file, onProgress, folder = 'gallery') {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured (missing REACT_APP_CLOUDINARY_* env vars)');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.secure_url);
        } else {
          reject(new Error(data.error?.message || 'Cloudinary upload failed'));
        }
      } catch {
        reject(new Error('Cloudinary upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Cloudinary upload failed'));
    xhr.send(formData);
  });
}
