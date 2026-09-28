const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./_lib/sheet');
const { getSheetsClient, getTabId } = require('./_lib/sheetsClient');
const { deleteByUrl } = require('./_lib/cloudinary');
const { requireAdmin } = require('./_lib/auth');

const SHEET_NAME = 'Sponsors';
const COLUMNS = ['Name', 'Image_Url', 'Status', 'Description'];
const STATUSES = ['current', 'former'];

function rowToValues(body) {
  return COLUMNS.map((key) => (body[key] ?? '').toString());
}

function validateStatus(status) {
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error(`Status must be one of: ${STATUSES.join(', ')}`), { status: 400 });
  }
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    if (req.method === 'GET') {
      const workbook = await fetchWorkbook();
      const rows = getSheetRows(workbook, SHEET_NAME);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      validateStatus(req.body?.Status);

      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:D`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowToValues(req.body)] },
      });
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });
      validateStatus(req.body?.Status);

      const sheets = getSheetsClient();

      // If the image was replaced, the old Cloudinary asset would otherwise
      // be orphaned — read what's currently stored so it can be cleaned up
      // once the new value is safely saved.
      const current = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!B${row}`,
      });
      const previousImageUrl = current.data.values?.[0]?.[0];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A${row}:D${row}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowToValues(req.body)] },
      });

      const newImageUrl = req.body?.Image_Url;
      if (previousImageUrl && previousImageUrl !== newImageUrl) {
        deleteByUrl(previousImageUrl).catch((err) =>
          console.warn('Cloudinary delete failed:', err.message)
        );
      }

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();

      const current = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!B${row}`,
      });
      const imageUrl = current.data.values?.[0]?.[0];

      const sheetId = await getTabId(SHEET_NAME);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: row - 1,
                  endIndex: row,
                },
              },
            },
          ],
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
    console.error('sponsors handler error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
