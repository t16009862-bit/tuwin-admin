const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./sheet');
const { getSheetsClient } = require('./sheetsClient');
const { requireAdmin } = require('./auth');
const { deleteByUrl } = require('./cloudinary');

const SHEET_NAME = 'Bio';
const URL_HEADER = 'Press Kit URL';
const UPDATED_HEADER = 'Press Kit Updated';

function isAllowedPdfUrl(url) {
  return /^https:\/\/res\.cloudinary\.com\//i.test(url) && /\.pdf(?:$|\?)/i.test(url);
}

async function pressKitHandler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const workbook = await fetchWorkbook();
    const row = getSheetRows(workbook, SHEET_NAME)[0] || {};

    if (req.method === 'GET') {
      return res.status(200).json({
        url: String(row[URL_HEADER] || '').trim(),
        updatedAt: String(row[UPDATED_HEADER] || '').trim(),
      });
    }

    if (req.method === 'PUT') {
      const url = String(req.body?.url || '').trim();
      if (!isAllowedPdfUrl(url)) {
        return res.status(400).json({ error: 'Upload a PDF to Cloudinary before saving.' });
      }

      const oldUrl = String(row[URL_HEADER] || '').trim();
      const updatedAt = new Date().toISOString();
      const sheets = getSheetsClient();

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: [
            { range: `${SHEET_NAME}!G1:H1`, values: [[URL_HEADER, UPDATED_HEADER]] },
            { range: `${SHEET_NAME}!G2:H2`, values: [[url, updatedAt]] },
          ],
        },
      });

      if (oldUrl && oldUrl !== url && /^https:\/\/res\.cloudinary\.com\//i.test(oldUrl)) {
        deleteByUrl(oldUrl).catch((err) => console.warn('Could not delete previous press kit:', err.message));
      }

      return res.status(200).json({ ok: true, url, updatedAt });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('press kit handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

module.exports = { pressKitHandler };
