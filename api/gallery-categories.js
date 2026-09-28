const { getSheetsClient, getTabId } = require('./_lib/sheetsClient');
const { SHEET_ID } = require('./_lib/sheet');
const { SHEET_NAME, columnLetter, getLiveCategories } = require('./_lib/galleryColumns');
const { deleteByUrl } = require('./_lib/cloudinary');
const { requireAdmin } = require('./_lib/auth');

// Swaps two whole columns (header + every data cell) so reordering doesn't
// depend on the Sheets API's moveDimension index semantics — just read both
// columns' current contents and write each one into the other's place.
async function swapColumns(sheets, colA, colB) {
  const [resA, resB] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_NAME}!${colA}:${colA}` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${SHEET_NAME}!${colB}:${colB}` }),
  ]);
  const valuesA = resA.data.values || [];
  const valuesB = resB.data.values || [];
  const maxLen = Math.max(valuesA.length, valuesB.length);
  const pad = (arr) => Array.from({ length: maxLen }, (_, i) => arr[i] || ['']);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${SHEET_NAME}!${colA}1:${colA}${maxLen}`, values: pad(valuesB) },
        { range: `${SHEET_NAME}!${colB}1:${colB}${maxLen}`, values: pad(valuesA) },
      ],
    },
  });
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Missing category name' });

      const sheets = getSheetsClient();
      const categories = await getLiveCategories(sheets);

      if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: `Category "${name}" already exists` });
      }

      const col = columnLetter(categories.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!${col}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [[name]] },
      });

      return res.status(201).json({ ok: true, name });
    }

    if (req.method === 'DELETE') {
      const name = req.query.name;
      if (!name) return res.status(400).json({ error: 'Missing category name' });

      const sheets = getSheetsClient();
      const categories = await getLiveCategories(sheets);
      const match = categories.find((c) => c.name === name);
      if (!match) return res.status(404).json({ error: `Unknown category "${name}"` });

      // Grab whatever URLs are in the column before the column itself (and
      // its data) is removed, so each image's Cloudinary asset can be
      // cleaned up too — otherwise deleting a category would just orphan
      // every image that was in it.
      const current = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!${match.col}2:${match.col}`,
      });
      const urls = (current.data.values || []).map((r) => r[0]).filter(Boolean);

      const sheetId = await getTabId(SHEET_NAME);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: match.index,
                  endIndex: match.index + 1,
                },
              },
            },
          ],
        },
      });

      urls.forEach((url) => {
        deleteByUrl(url).catch((err) => console.warn('Cloudinary delete failed:', err.message));
      });

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PATCH') {
      const name = String(req.body?.name || '').trim();
      const direction = req.body?.direction;
      if (!name) return res.status(400).json({ error: 'Missing category name' });
      if (direction !== 'left' && direction !== 'right') {
        return res.status(400).json({ error: 'direction must be "left" or "right"' });
      }

      const sheets = getSheetsClient();
      const categories = await getLiveCategories(sheets);
      const index = categories.findIndex((c) => c.name === name);
      if (index === -1) return res.status(404).json({ error: `Unknown category "${name}"` });

      const partnerIndex = direction === 'left' ? index - 1 : index + 1;
      if (partnerIndex < 0 || partnerIndex >= categories.length) {
        return res.status(400).json({ error: `Category "${name}" is already at the ${direction} end` });
      }

      await swapColumns(sheets, categories[index].col, categories[partnerIndex].col);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('gallery-categories handler error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
