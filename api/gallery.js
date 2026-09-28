const { fetchWorkbook, getSheetRows, getHeaderRow, SHEET_ID } = require('./_lib/sheet');
const { getSheetsClient } = require('./_lib/sheetsClient');
const { deleteByUrl } = require('./_lib/cloudinary');
const { SHEET_NAME, getLiveCategories, resolveColumn } = require('./_lib/galleryColumns');
const { requireAdmin } = require('./_lib/auth');

async function getColumnValues(sheets, col) {
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${col}2:${col}`,
  });
  return (current.data.values || []).map((r) => r[0] ?? '');
}

// Row right after the last non-blank cell in this column. Using an exact
// single-cell `values.update` (not `values.append`) is deliberate: append
// auto-detects a "table" by expanding into contiguous data in adjacent
// columns, so on a row where multiple categories are filled it was putting
// single-column appends into the wrong column entirely.
async function nextRowFor(sheets, col) {
  const values = await getColumnValues(sheets, col);
  let lastFilled = -1;
  values.forEach((v, i) => {
    if (String(v).trim()) lastFilled = i;
  });
  return lastFilled + 3; // values[i] lives at sheet row i+2; next free row is that +1
}

async function writeCell(sheets, col, row, value) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${col}${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
}

// Removes the value at `row` in `col`, shifting everything below up by one
// so gaps aren't left behind.
async function removeCell(sheets, col, row) {
  const values = await getColumnValues(sheets, col);
  const targetIdx = row - 2;
  const removedValue = values[targetIdx];
  if (removedValue === undefined) return undefined;

  values.splice(targetIdx, 1);
  values.push('');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${col}2:${col}${values.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: values.map((v) => [v]) },
  });
  return removedValue;
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    if (req.method === 'GET') {
      const workbook = await fetchWorkbook();
      const headers = getHeaderRow(workbook, SHEET_NAME);
      const rows = getSheetRows(workbook, SHEET_NAME);

      const categories = headers.map((name) => ({
        name,
        images: rows
          .filter((r) => String(r[name] ?? '').trim())
          .map((r) => ({ row: r._row, url: String(r[name]).trim() })),
      }));

      return res.status(200).json({ categories });
    }

    if (req.method === 'POST') {
      const { category, url } = req.body || {};
      if (!category) return res.status(400).json({ error: 'Missing category' });
      if (!url) return res.status(400).json({ error: 'Missing url' });

      const sheets = getSheetsClient();
      const col = resolveColumn(await getLiveCategories(sheets), category);
      const row = await nextRowFor(sheets, col);
      await writeCell(sheets, col, row, url);
      return res.status(201).json({ ok: true });
    }

    // Moves an image from one category to another without touching
    // Cloudinary (the asset itself doesn't change, just which list it's in).
    if (req.method === 'PATCH') {
      const { category, row, toCategory } = req.body || {};
      if (!category || !toCategory) {
        return res.status(400).json({ error: 'Missing category or toCategory' });
      }
      if (category === toCategory) {
        return res.status(400).json({ error: 'toCategory must differ from category' });
      }
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();
      const categories = await getLiveCategories(sheets);
      const fromCol = resolveColumn(categories, category);
      const toCol = resolveColumn(categories, toCategory);

      const url = await removeCell(sheets, fromCol, row);
      if (url === undefined || !url) return res.status(404).json({ error: 'Row not found' });

      const targetRow = await nextRowFor(sheets, toCol);
      await writeCell(sheets, toCol, targetRow, url);

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const category = req.query.category;
      const row = Number(req.query.row);
      if (!category) return res.status(400).json({ error: 'Missing category' });
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();
      const col = resolveColumn(await getLiveCategories(sheets), category);
      const removedUrl = await removeCell(sheets, col, row);
      if (removedUrl === undefined) return res.status(404).json({ error: 'Row not found' });

      if (removedUrl) {
        deleteByUrl(removedUrl).catch((err) => console.warn('Cloudinary delete failed:', err.message));
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('gallery handler error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
