const { createTabHandler } = require('./genericCrud');
const { pressKitHandler } = require('./pressKit');
const { fetchWorkbook, getSheetRows, SHEET_ID } = require('./sheet');
const { getSheetsClient } = require('./sheetsClient');
const { requireAdmin } = require('./auth');

async function profilePhotoHandler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const workbook = await fetchWorkbook();
      const row = getSheetRows(workbook, 'Bio')[0];
      return res.status(200).json({ url: String(row?.['Profile Image'] || '').trim() });
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
            { range: 'Bio!F1', values: [['Profile Image']] },
            { range: 'Bio!F2', values: [[url]] },
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
}

// Plain CRUD tabs, merged behind a single Vercel serverless function
// (api/[tab].js) to stay under the Hobby plan's 12-function limit. Each key
// here is the URL segment used at /api/<key>.
const TABS = {
  'press-kit': pressKitHandler,
  'profile-photo': profilePhotoHandler,

  rankings: createTabHandler({
    sheetName: 'Rankings',
    columns: ['date', 'ranking'],
  }),

  'ranking-summary': createTabHandler({
    sheetName: 'RankingSummary',
    columns: [
      'publishedDate',
      'recordCheckedDate',
      'worldRanking',
      'highestRanking',
      'totalPoints',
      'countingPoints',
      'divisor',
      'emptyDivisorPlaces',
      'otherRankingZeros',
    ],
  }),

  'tournament-points': createTabHandler({
    sheetName: 'TournamentPoints',
    columns: ['date', 'tournament', 'result', 'points', 'expires', 'status'],
  }),

  'medical-zeros': createTabHandler({
    sheetName: 'MedicalZeros',
    columns: ['date', 'tournament', 'expires', 'status'],
  }),

  'ranking-zeros': createTabHandler({
    sheetName: 'RankingZeros',
    columns: ['date', 'tournament', 'reason', 'expires', 'status'],
  }),

  withdrawals: createTabHandler({
    sheetName: 'Withdrawals',
    columns: ['startDate', 'endDate', 'tournament', 'status'],
  }),

  'match-history': createTabHandler({
    sheetName: 'MatchHistory',
    columns: ['date', 'year', 'tournament', 'round', 'opponent', 'score', 'games', 'result'],
  }),

  'site-music': createTabHandler({
    sheetName: 'SiteMusic',
    columns: ['enabled', 'title', 'artist', 'youtubeId'],
  }),

  'career-achievements': createTabHandler({
    sheetName: 'CareerAchievements',
    columns: ['Title', 'heading', 'description', 'footer'],
  }),

  'career-highlights': createTabHandler({
    sheetName: 'CareerHighlights',
    columns: ['year', 'title', 'description', 'tag', 'icon'],
    // Existing rows have "year" entered as a plain number, so xlsx hands it
    // back as a JS number — coerce to text here rather than pushing that
    // string-vs-number distinction onto the frontend.
    postProcessRow: (row) => ({ ...row, year: String(row.year ?? '') }),
  }),

  'competency-blueprint': createTabHandler({
    sheetName: 'CompetencyBlueprint',
    columns: ['blueprints'],
  }),

  'training-history': createTabHandler({
    sheetName: 'TrainingHistory',
    columns: ['title', 'heading', 'description'],
  }),

  contact: createTabHandler({
    sheetName: 'Contact',
    columns: ['Locations', 'email', 'phone numbers'],
    // A pre-existing row had its phone numbers entered as a plain number,
    // so xlsx may hand it back as a JS number — coerce every cell to text.
    postProcessRow: (row) => ({ ...row, 'phone numbers': String(row['phone numbers'] ?? '') }),
  }),
};

module.exports = { TABS };
