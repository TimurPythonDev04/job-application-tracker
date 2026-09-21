import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import type { JobApplication } from '../types';

interface Props {
  application: JobApplication;
  onEdit: (application: JobApplication) => void;
}

export function ApplicationCard({ application, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="app-card"
      {...listeners}
      {...attributes}
      onClick={() => onEdit(application)}
    >
      <div className="app-card-position">{application.position}</div>
      <div className="app-card-company">{application.company}</div>
      <div className="app-card-date">
        Applied {new Date(application.applied_date).toLocaleDateString()}
      </div>
    </div>
  );
}
