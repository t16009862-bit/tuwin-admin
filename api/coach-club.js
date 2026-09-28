const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./_lib/sheet');
const { getSheetsClient, getTabId } = require('./_lib/sheetsClient');
const { deleteByUrl } = require('./_lib/cloudinary');
const { requireAdmin } = require('./_lib/auth');

const SHEET_NAME = 'Coach&Club';
// The sheet name contains "&", which A1 range notation requires quoting —
// unlike every other tab here, so this can't just be `${SHEET_NAME}!...`.
const RANGE_PREFIX = `'${SHEET_NAME}'`;
const IMAGE_COL = 'D';

// Each Profile "point" lives in its own row: a coach's row holds Name,
// the first point, Biography and Image Url; any further points go in the
// immediately-following rows with only the Profile cell filled. Groups rows
// (already blank-row-filtered) into one entry per coach by walking them in
// order and attaching a blank-Name row to the previous entry only if it's
// physically the very next row (no gap) — a gap or a non-blank Name starts
// a new entry.
function groupEntries(rows) {
  const entries = [];
  let current = null;
  let lastRow = null;

  for (const row of rows) {
    const name = String(row.Name ?? '').trim();
    const profile = String(row.Profile ?? '').trim();
    const adjacent = current !== null && lastRow !== null && row._row === lastRow + 1;

    if (name) {
      current = {
        startRow: row._row,
        rows: [row._row],
        Name: name,
        points: profile ? [profile] : [],
        Biography: String(row.Biography ?? ''),
        'Image Url': String(row['Image Url'] ?? ''),
      };
      entries.push(current);
    } else if (adjacent) {
      current.rows.push(row._row);
      if (profile) current.points.push(profile);
    } else {
      current = null;
    }
    lastRow = row._row;
  }

  return entries;
}

async function getLiveEntries(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${RANGE_PREFIX}!A2:D`,
  });
  const values = res.data.values || [];
  const rows = values
    .map((line, i) => ({
      _row: i + 2,
      Name: line[0] ?? '',
      Profile: line[1] ?? '',
      Biography: line[2] ?? '',
      'Image Url': line[3] ?? '',
    }))
    .filter((r) => r.Name.trim() || r.Profile.trim() || r.Biography.trim() || r['Image Url'].trim());
  return groupEntries(rows);
}

function pointsFromBody(body) {
  return (Array.isArray(body?.Profile) ? body.Profile : [body?.Profile])
    .map((p) => String(p ?? '').trim())
    .filter(Boolean);
}

// Grows or shrinks the coach's row block to match the new point count, then
// writes every row: the first gets Name/point[0]/Biography/Image Url, the
// rest get just their point in the Profile column (everything else blank).
async function writeEntry(sheets, entry, body) {
  const points = pointsFromBody(body);
  const desiredRowCount = Math.max(points.length, 1);
  const currentRows = entry.rows;

  if (desiredRowCount > currentRows.length) {
    const sheetId = await getTabId(SHEET_NAME);
    const insertAfter = currentRows[currentRows.length - 1];
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: insertAfter, // 0-indexed row right after insertAfter (1-indexed)
                endIndex: insertAfter + (desiredRowCount - currentRows.length),
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });
  } else if (desiredRowCount < currentRows.length) {
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
                startIndex: currentRows[desiredRowCount] - 1,
                endIndex: currentRows[currentRows.length - 1],
              },
            },
          },
        ],
      },
    });
  }

  const startRow = entry.startRow;
  const data = [
    {
      range: `${RANGE_PREFIX}!A${startRow}:D${startRow}`,
      values: [[body.Name ?? '', points[0] ?? '', body.Biography ?? '', body['Image Url'] ?? '']],
    },
  ];
  for (let i = 1; i < desiredRowCount; i++) {
    data.push({
      range: `${RANGE_PREFIX}!A${startRow + i}:D${startRow + i}`,
      values: [['', points[i] ?? '', '', '']],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data },
  });
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    if (req.method === 'GET') {
      const workbook = await fetchWorkbook();
      const rows = getSheetRows(workbook, SHEET_NAME);
      const entries = groupEntries(rows).map((e) => ({
        _row: e.startRow,
        Name: e.Name,
        Profile: e.points,
        Biography: e.Biography,
        'Image Url': e['Image Url'],
      }));
      return res.status(200).json(entries);
    }

    if (req.method === 'POST') {
      const points = pointsFromBody(req.body);
      const sheets = getSheetsClient();

      const append = await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${RANGE_PREFIX}!A:D`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [req.body.Name ?? '', points[0] ?? '', req.body.Biography ?? '', req.body['Image Url'] ?? ''],
          ],
        },
      });

      // append tells us exactly which row it landed on — needed to place
      // any further points directly beneath it.
      const match = append.data.updates.updatedRange.match(/![A-Z]+(\d+)/);
      const startRow = Number(match[1]);

      if (points.length > 1) {
        const data = points.slice(1).map((point, i) => ({
          range: `${RANGE_PREFIX}!A${startRow + i + 1}:D${startRow + i + 1}`,
          values: [['', point, '', '']],
        }));
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: { valueInputOption: 'RAW', data },
        });
      }

      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();
      const entries = await getLiveEntries(sheets);
      const entry = entries.find((e) => e.startRow === row);
      if (!entry) return res.status(404).json({ error: 'Entry not found' });

      const previousImage = entry['Image Url'];

      await writeEntry(sheets, entry, req.body);

      const newImage = req.body?.['Image Url'];
      if (previousImage && previousImage !== newImage) {
        deleteByUrl(previousImage).catch((err) =>
          console.warn('Cloudinary delete failed:', err.message)
        );
      }

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const row = Number(req.query.row);
      if (!row || row < 2) return res.status(400).json({ error: 'Missing or invalid row' });

      const sheets = getSheetsClient();
      const entries = await getLiveEntries(sheets);
      const entry = entries.find((e) => e.startRow === row);
      if (!entry) return res.status(404).json({ error: 'Entry not found' });

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
                  startIndex: entry.rows[0] - 1,
                  endIndex: entry.rows[entry.rows.length - 1],
                },
              },
            },
          ],
        },
      });

      const image = entry['Image Url'];
      if (image) {
        deleteByUrl(image).catch((err) => console.warn('Cloudinary delete failed:', err.message));
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('coach-club handler error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
};
