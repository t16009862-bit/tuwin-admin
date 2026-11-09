const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./_lib/sheet');
const { getSheetsClient } = require('./_lib/sheetsClient');
const { requireAdmin } = require('./_lib/auth');

const SHEET_NAME = 'Bio';
const HEADER = 'Profile Image';

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const workbook = await fetchWorkbook();
      const row = getSheetRows(workbook, SHEET_NAME)[0];
      return res.status(200).json({
        url: String(row?.[HEADER] || '').trim(),
      });
    }

    if (req.method === 'PUT') {
      const url = String(req.body?.url || '').trim();
      if (!/^https:\/\/res\.cloudinary\.com\//i.test(url)) {
        return res.status(400).json({ error: 'Please upload an image before saving' });
      }

      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: [
            { range: `${SHEET_NAME}!F1`, values: [[HEADER]] },
            { range: `${SHEET_NAME}!F2`, values: [[url]] },
          ],
        },
      });

      return res.status(200).json({ ok: true, url });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('profile photo handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
