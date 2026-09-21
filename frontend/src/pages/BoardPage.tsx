import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
  updateApplicationStatus,
} from '../api/applications';
import { ApplicationFormModal } from '../components/ApplicationFormModal';
import { KanbanColumn } from '../components/KanbanColumn';
import type { ApplicationStatus, JobApplication, JobApplicationInput } from '../types';
import { STATUS_ORDER } from '../types';

export function BoardPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<JobApplication | 'new' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    listApplications()
      .then(setApplications)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as ApplicationStatus;
    const appId = active.id as number;
    const current = applications.find((a) => a.id === appId);
    if (!current || current.status === newStatus) return;

    // Optimistic update so the card moves instantly; roll back on failure.
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)),
    );
    try {
      const updated = await updateApplicationStatus(appId, newStatus);
      setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));
    } catch {
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: current.status } : a)),
      );
    }
  }

  async function handleSave(input: JobApplicationInput) {
    if (editing && editing !== 'new') {
      const updated = await updateApplication(editing.id, input);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      const created = await createApplication(input);
      setApplications((prev) => [created, ...prev]);
    }
  }

  async function handleDelete() {
    if (editing && editing !== 'new') {
      await deleteApplication(editing.id);
      setApplications((prev) => prev.filter((a) => a.id !== (editing as JobApplication).id));
    }
  }

  if (isLoading) {
    return <div className="page-loading">Loading applications...</div>;
  }

  return (
    <div className="board-page">
      <div className="board-header">
        <h1>Board</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + New application
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              applications={applications.filter((a) => a.status === status)}
              onEdit={setEditing}
            />
          ))}
        </div>
      </DndContext>

      {editing && (
        <ApplicationFormModal
          initial={editing === 'new' ? undefined : editing}
          onSave={handleSave}
          onDelete={editing !== 'new' ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
