const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./sheet');
const { getSheetsClient, getTabId } = require('./sheetsClient');
const { requireAdmin } = require('./auth');

function columnLetter(index) {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// Builds a GET/POST/PUT/DELETE handler for a plain "one sheet row per
// entry" tab, shared by every tab that has no image uploads, dropdowns, or
// multi-row entries of its own.
function createTabHandler({ sheetName, columns, postProcessRow }) {
  const lastCol = columnLetter(columns.length - 1);
  const rangeAll = `${sheetName}!A:${lastCol}`;

  function rowToValues(body) {
    return columns.map((key) => (body[key] ?? '').toString());
  }

  return async function handler(req, res) {
    if (!requireAdmin(req, res)) return;
    try {
      if (req.method === 'GET') {
        const workbook = await fetchWorkbook();
        let rows = getSheetRows(workbook, sheetName);
        if (postProcessRow) rows = rows.map(postProcessRow);
        return res.status(200).json(rows);
      }

      if (req.method === 'POST') {
        const sheets = getSheetsClient();
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: rangeAll,
          valueInputOption: 'RAW',
          requestBody: { values: [rowToValues(req.body)] },
        });
        return res.status(201).json({ ok: true });
      }

      if (req.method === 'PUT') {
        const row = Number(req.query.row);
        if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

        const sheets = getSheetsClient();
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${sheetName}!A${row}:${lastCol}${row}`,
          valueInputOption: 'RAW',
          requestBody: { values: [rowToValues(req.body)] },
        });
        return res.status(200).json({ ok: true });
      }

      if (req.method === 'DELETE') {
        const row = Number(req.query.row);
        if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

        const sheets = getSheetsClient();
        const sheetId = await getTabId(sheetName);
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
        return res.status(200).json({ ok: true });
      }

      res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error(`${sheetName} handler error:`, err);
      return res.status(500).json({ error: err.message || 'Internal error' });
    }
  };
}

module.exports = { createTabHandler };
