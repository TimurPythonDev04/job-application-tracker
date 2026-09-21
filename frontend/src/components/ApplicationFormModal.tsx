import { useState } from 'react';
import type { FormEvent } from 'react';

import type { ApplicationStatus, JobApplication, JobApplicationInput } from '../types';
import { STATUS_LABELS, STATUS_ORDER } from '../types';

interface Props {
  initial?: JobApplication;
  onSave: (input: JobApplicationInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const emptyForm = {
  company: '',
  position: '',
  status: 'applied' as ApplicationStatus,
  applied_date: new Date().toISOString().slice(0, 10),
  job_url: '',
  notes: '',
};

export function ApplicationFormModal({ initial, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState(
    initial
      ? {
          company: initial.company,
          position: initial.position,
          status: initial.status,
          applied_date: initial.applied_date,
          job_url: initial.job_url,
          notes: initial.notes,
        }
      : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      setError('Could not save this application. Please check the fields and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{initial ? 'Edit application' : 'New application'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Company
            <input
              required
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </label>
          <label>
            Position
            <input
              required
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Applied date
            <input
              type="date"
              required
              value={form.applied_date}
              onChange={(e) => setForm({ ...form, applied_date: e.target.value })}
            />
          </label>
          <label>
            Job URL
            <input
              type="url"
              placeholder="https://..."
              value={form.job_url}
              onChange={(e) => setForm({ ...form, job_url: e.target.value })}
            />
          </label>
          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            {onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDelete().then(onClose)}
              >
                Delete
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
