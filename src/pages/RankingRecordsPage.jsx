import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import {
  addSheetResource,
  deleteSheetResource,
  getSheetResource,
  updateSheetResource,
} from '../api/client';

const SUMMARY_FIELDS = [
  { key: 'publishedDate', label: 'Ranking publication date', type: 'date' },
  { key: 'recordCheckedDate', label: 'Record checked date', type: 'date' },
  { key: 'worldRanking', label: 'Current world ranking', type: 'number', min: '1' },
  { key: 'highestRanking', label: 'Highest world ranking', type: 'number', min: '1' },
  { key: 'totalPoints', label: 'Total points', type: 'number', step: '0.01', min: '0' },
  { key: 'countingPoints', label: 'Counting points', type: 'number', step: '0.01', min: '0' },
  { key: 'divisor', label: 'Divisor', type: 'number', min: '1' },
  { key: 'emptyDivisorPlaces', label: 'Empty divisor places', type: 'number', min: '0' },
];

const SECTIONS = [
  {
    resource: 'tournament-points',
    title: 'Tournament points',
    description: 'Current, expired, and pending point-bearing tournaments. Pending rows stay outside the official calculation.',
    fields: [
      { key: 'date', label: 'Points date', type: 'date', required: false },
      { key: 'tournament', label: 'Tournament' },
      { key: 'result', label: 'Result / finish' },
      { key: 'points', label: 'Points', type: 'number', step: '0.01', min: '0' },
      { key: 'expires', label: 'Expiry date', type: 'date', required: false },
      { key: 'status', label: 'Status', type: 'select', options: ['Current', 'Expired', 'Pending'] },
    ],
  },
  {
    resource: 'medical-zeros',
    title: 'Medical zeros',
    description: 'Kept separate from counting tournaments and every other type of zero.',
    fields: [
      { key: 'date', label: 'Recorded date', type: 'date' },
      { key: 'tournament', label: 'Tournament' },
      { key: 'expires', label: 'Expiry date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Expired'] },
    ],
  },
  {
    resource: 'ranking-zeros',
    title: 'Other ranking zeros',
    description: 'Only actual non-medical PSA zero entries belong here. Empty divisor places do not.',
    fields: [
      { key: 'date', label: 'Recorded date', type: 'date' },
      { key: 'tournament', label: 'Tournament' },
      { key: 'reason', label: 'Reason' },
      { key: 'expires', label: 'Expiry date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Expired'] },
    ],
  },
  {
    resource: 'withdrawals',
    title: 'No-penalty withdrawals',
    description: 'Withdrawal history is not mixed into tournament points, medical zeros, or other ranking zeros.',
    fields: [
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date' },
      { key: 'tournament', label: 'Tournament' },
      { key: 'status', label: 'PSA status', type: 'select', options: ['No penalty'] },
    ],
  },
  {
    resource: 'match-history',
    title: 'Match history',
    description: 'Official opponents, rounds, scores, and game-by-game results shown on the public archive.',
    fields: [
      { key: 'date', label: 'Match date', type: 'date', required: false },
      { key: 'year', label: 'Year', type: 'number', min: '2000' },
      { key: 'tournament', label: 'Tournament' },
      { key: 'round', label: 'Round' },
      { key: 'opponent', label: 'Opponent' },
      { key: 'score', label: 'Match score' },
      { key: 'games', label: 'Game scores' },
      { key: 'result', label: 'Result', type: 'select', options: ['Won', 'Lost'] },
    ],
  },
];

function emptyEntry(fields) {
  return fields.reduce((entry, field) => {
    entry[field.key] = field.options?.[0] ?? '';
    return entry;
  }, {});
}

function EntryForm({ fields, initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="banner-error">{error}</div>}
      {fields.map((field) => (
        <div className="form-field" key={field.key}>
          <label htmlFor={`field-${field.key}`}>{field.label}</label>
          {field.type === 'select' ? (
            <select id={`field-${field.key}`} value={form[field.key] ?? ''} onChange={setField(field.key)} required={field.required !== false}>
              {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : (
            <input
              id={`field-${field.key}`}
              type={field.type || 'text'}
              value={form[field.key] ?? ''}
              onChange={setField(field.key)}
              required={field.required !== false}
              step={field.step}
              min={field.min}
            />
          )}
        </div>
      ))}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save to Google Sheet'}</button>
      </div>
    </form>
  );
}

function SummaryEditor() {
  const [row, setRow] = useState(null);
  const [form, setForm] = useState(emptyEntry(SUMMARY_FIELDS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSheetResource('ranking-summary')
      .then((rows) => {
        const first = rows[0] ?? null;
        setRow(first);
        if (first) setForm(first);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const average = useMemo(() => {
    const points = Number(form.countingPoints);
    const divisor = Number(form.divisor);
    return Number.isFinite(points) && divisor > 0 ? (points / divisor).toFixed(2) : '—';
  }, [form.countingPoints, form.divisor]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      if (row?._row) {
        await updateSheetResource('ranking-summary', row._row, form);
      } else {
        await addSheetResource('ranking-summary', form);
      }
      const rows = await getSheetResource('ranking-summary');
      setRow(rows[0] ?? null);
      setForm(rows[0] ?? form);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <h2>Ranking calculation summary</h2>
          <p>The public average is calculated automatically as counting points ÷ divisor. Current preview: {average}.</p>
        </div>
      </div>
      <div className="card form-card">
        {loading ? <div className="loading-state">Loading ranking summary…</div> : (
          <form onSubmit={handleSubmit}>
            {error && <div className="banner-error">{error}</div>}
            {saved && <div className="banner-success">Saved. The public website will read this update automatically.</div>}
            <div className="form-grid">
              {SUMMARY_FIELDS.map((field) => (
                <div className="form-field" key={field.key}>
                  <label htmlFor={`summary-${field.key}`}>{field.label}</label>
                  <input
                    id={`summary-${field.key}`}
                    type={field.type}
                    value={form[field.key] ?? ''}
                    onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))}
                    required
                    step={field.step}
                    min={field.min}
                  />
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save summary'}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function CrudSection({ config }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await getSheetResource(config.resource));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Config objects are static module data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.resource]);

  const save = async (entry) => {
    if (modal?._row) await updateSheetResource(config.resource, modal._row, entry);
    else await addSheetResource(config.resource, entry);
    setModal(null);
    await load();
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${config.title.toLowerCase()} entry? This cannot be undone.`)) return;
    setDeletingRow(row);
    try {
      await deleteSheetResource(config.resource, row);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingRow(null);
    }
  };

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add entry</button>
      </div>
      {error && <div className="banner-error">{error}</div>}
      <div className="card table-scroll">
        {loading ? <div className="loading-state">Loading {config.title.toLowerCase()}…</div> : rows.length === 0 ? (
          <div className="empty-state">No entries. This category is intentionally separate.</div>
        ) : (
          <table className="table wide-table">
            <thead>
              <tr>{config.fields.map((field) => <th key={field.key}>{field.label}</th>)}<th></th></tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry._row}>
                  {config.fields.map((field) => <td key={field.key} data-label={field.label}>{entry[field.key] || '—'}</td>)}
                  <td className="row-actions">
                    <button className="btn btn-secondary btn-small" onClick={() => setModal(entry)}>Edit</button>
                    <button className="btn btn-danger btn-small" onClick={() => remove(entry._row)} disabled={deletingRow === entry._row}>{deletingRow === entry._row ? 'Deleting…' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={`${modal === 'add' ? 'Add' : 'Edit'} ${config.title} entry`} onClose={() => setModal(null)}>
          <EntryForm fields={config.fields} initial={modal === 'add' ? emptyEntry(config.fields) : modal} onCancel={() => setModal(null)} onSave={save} />
        </Modal>
      )}
    </section>
  );
}

export default function RankingRecordsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>PSA Records</h1>
          <p>Every entry is stored in the TuwinPortfolio Google Sheet and then read by the public website.</p>
        </div>
        <a className="btn btn-secondary" href="https://tuwinh.com/rankings/match-history" target="_blank" rel="noopener noreferrer">View public page ↗</a>
      </div>
      <div className="banner-info">Counting tournaments, medical zeros, other ranking zeros, empty divisor places, withdrawals, and matches are kept as separate data types.</div>
      <SummaryEditor />
      {SECTIONS.map((section) => <CrudSection key={section.resource} config={section} />)}
    </div>
  );
}
