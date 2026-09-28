const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./_lib/sheet');
const { getSheetsClient, getTabId } = require('./_lib/sheetsClient');
const { requireAdmin } = require('./_lib/auth');

// Sheet name is spelled "Biograpahy" in the real spreadsheet.
const SHEET_NAME = 'Biograpahy';

// The single overall description lives only in A2 (column "description").
// Every row (including row 2) can also carry a Title/Heading/Description
// "section" in columns B:D — those are a plain list, one per row.
function sectionFromRow(row) {
  return {
    _row: row._row,
    Title: row.Title ?? '',
    Heading: row.Heading ?? '',
    Description: row.Description ?? '',
  };
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    if (req.method === 'GET') {
      const workbook = await fetchWorkbook();
      const rows = getSheetRows(workbook, SHEET_NAME);
      const description = String(rows.find((r) => r._row === 2)?.description ?? '');
      const sections = rows
        .filter(
          (r) =>
            String(r.Title ?? '').trim() ||
            String(r.Heading ?? '').trim() ||
            String(r.Description ?? '').trim()
        )
        .map(sectionFromRow);
      return res.status(200).json({ description, sections });
    }

    if (req.method === 'PUT' && !req.query.row) {
      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A2`,
        valueInputOption: 'RAW',
        requestBody: { values: [[req.body.description ?? '']] },
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!B:D`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[req.body.Title ?? '', req.body.Heading ?? '', req.body.Description ?? '']],
        },
      });
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!B${row}:D${row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[req.body.Title ?? '', req.body.Heading ?? '', req.body.Description ?? '']],
        },
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();

      // Row 2 also carries the overall description in column A — if that's
      // the row being deleted, read it live first so it can be re-written
      // onto whichever row becomes the new row 2 after the shift.
      let description = null;
      if (row === 2) {
        const live = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${SHEET_NAME}!A2`,
        });
        description = live.data.values?.[0]?.[0] ?? '';
      }

      const sheetId = await getTabId(SHEET_NAME);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row },
              },
            },
          ],
        },
      });

      if (description !== null) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${SHEET_NAME}!A2`,
          valueInputOption: 'RAW',
          requestBody: { values: [[description]] },
        });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('biography handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
