const cloudinary = require('cloudinary').v2;

let configured = false;

function configureCloudinary() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

// Derives the Cloudinary public_id from an upload URL, e.g.
// https://res.cloudinary.com/<cloud>/image/upload/v169.../gallery/abc123.jpg
// -> gallery/abc123
function publicIdFromUrl(url) {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}

// Best-effort delete: failures are swallowed by callers since a missing
// Cloudinary asset should never block removing the row from the sheet.
async function deleteByUrl(url) {
  const publicId = publicIdFromUrl(url);
  if (!publicId) return false;

  configureCloudinary();
  const resourceType = url.includes('/raw/upload/') ? 'raw' : 'image';
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  return true;
}

module.exports = { deleteByUrl };
