import { useDroppable } from '@dnd-kit/core';

import { ApplicationCard } from './ApplicationCard';
import type { ApplicationStatus, JobApplication } from '../types';
import { STATUS_LABELS } from '../types';

interface Props {
  status: ApplicationStatus;
  applications: JobApplication[];
  onEdit: (application: JobApplication) => void;
}

export function KanbanColumn({ status, applications, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={`kanban-column status-${status}`}>
      <div className="kanban-column-header">
        <span>{STATUS_LABELS[status]}</span>
        <span className="kanban-count">{applications.length}</span>
      </div>
      <div ref={setNodeRef} className={`kanban-column-body ${isOver ? 'drag-over' : ''}`}>
        {applications.map((app) => (
          <ApplicationCard key={app.id} application={app} onEdit={onEdit} />
        ))}
        {applications.length === 0 && <div className="kanban-empty">No applications</div>}
      </div>
    </div>
  );
}
