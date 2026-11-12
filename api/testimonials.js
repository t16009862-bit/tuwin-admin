const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./_lib/sheet');
const { getSheetsClient, getTabId } = require('./_lib/sheetsClient');
const { deleteByUrl } = require('./_lib/cloudinary');
const { requireAdmin } = require('./_lib/auth');

const SHEET_NAME = 'Testimonials';
const COLUMNS = ['Name', 'Quote', 'Credentials', 'Relationship', 'Image_Url', 'Sort_Order', 'Featured', 'Active'];

function booleanValue(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue ? 'TRUE' : 'FALSE';
  return value === true || String(value).toLowerCase() === 'true' ? 'TRUE' : 'FALSE';
}

function rowToValues(body) {
  return [
    String(body.Name ?? '').trim(),
    String(body.Quote ?? '').trim(),
    String(body.Credentials ?? '').trim(),
    String(body.Relationship ?? '').trim(),
    String(body.Image_Url ?? '').trim(),
    String(body.Sort_Order ?? '999').trim(),
    booleanValue(body.Featured),
    booleanValue(body.Active, true),
  ];
}

function validate(body) {
  if (!String(body?.Name ?? '').trim()) throw Object.assign(new Error('Name is required'), { status: 400 });
  if (!String(body?.Quote ?? '').trim()) throw Object.assign(new Error('Quote is required'), { status: 400 });
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const workbook = await fetchWorkbook();
      const rows = getSheetRows(workbook, SHEET_NAME)
        .sort((a, b) => (Number(a.Sort_Order) || 999) - (Number(b.Sort_Order) || 999));
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      validate(req.body);
      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:H`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowToValues(req.body)] },
      });
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });
      validate(req.body);

      const sheets = getSheetsClient();
      const current = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!E${row}`,
      });
      const previousImageUrl = current.data.values?.[0]?.[0];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A${row}:H${row}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowToValues(req.body)] },
      });

      if (previousImageUrl && previousImageUrl !== req.body?.Image_Url) {
        deleteByUrl(previousImageUrl).catch((err) => console.warn('Cloudinary delete failed:', err.message));
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();
      const current = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!E${row}`,
      });
      const imageUrl = current.data.values?.[0]?.[0];
      const sheetId = await getTabId(SHEET_NAME);

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row },
            },
          }],
        },
      });

      if (imageUrl) {
        deleteByUrl(imageUrl).catch((err) => console.warn('Cloudinary delete failed:', err.message));
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('testimonials handler error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
