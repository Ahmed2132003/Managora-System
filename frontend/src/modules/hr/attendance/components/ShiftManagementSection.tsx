type Shift = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_active: boolean;
};

type ShiftManagementSectionProps = {
  title: string;
  labels: {
    nameLabel: string;
    startTimeLabel: string;
    endTimeLabel: string;
    graceLabel: string;
    activeLabel: string;
    addShift: string;
    update: string;
    delete: string;
    clearEdit: string;
  };
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftGraceMinutes: string;
  shiftIsActive: boolean;
  editingShiftId: number | null;
  canManageSchedule: boolean;
  shifts: Shift[];
  onShiftNameChange: (value: string) => void;
  onShiftStartChange: (value: string) => void;
  onShiftEndChange: (value: string) => void;
  onShiftGraceChange: (value: string) => void;
  onShiftActiveChange: (value: boolean) => void;
  onSaveShift: () => void;
  onClearEdit: () => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (id: number) => void;
};

export function ShiftManagementSection(props: ShiftManagementSectionProps) {
  const {
    title,
    labels,
    shiftName,
    shiftStartTime,
    shiftEndTime,
    shiftGraceMinutes,
    shiftIsActive,
    editingShiftId,
    canManageSchedule,
    shifts,
    onShiftNameChange,
    onShiftStartChange,
    onShiftEndChange,
    onShiftGraceChange,
    onShiftActiveChange,
    onSaveShift,
    onClearEdit,
    onEditShift,
    onDeleteShift,
  } = props;

  return (
    <div className="schedule-card">
      <h3>{title}</h3>
      <div className="form-grid">
        <label className="form-field"><span>{labels.nameLabel}</span><input type="text" value={shiftName} onChange={(e) => onShiftNameChange(e.target.value)} /></label>
        <label className="form-field"><span>{labels.startTimeLabel}</span><input type="time" value={shiftStartTime} onChange={(e) => onShiftStartChange(e.target.value)} /></label>
        <label className="form-field"><span>{labels.endTimeLabel}</span><input type="time" value={shiftEndTime} onChange={(e) => onShiftEndChange(e.target.value)} /></label>
        <label className="form-field"><span>{labels.graceLabel}</span><input type="number" min={0} value={shiftGraceMinutes} onChange={(e) => onShiftGraceChange(e.target.value)} /></label>
      </div>
      <label className="form-toggle">
        <input type="checkbox" checked={shiftIsActive} onChange={(e) => onShiftActiveChange(e.target.checked)} />
        <span>{labels.activeLabel}</span>
      </label>
      <div className="schedule-actions">
        <button type="button" className="primary-button" onClick={onSaveShift} disabled={!canManageSchedule || !shiftName.trim()}>{editingShiftId ? labels.update : labels.addShift}</button>
        {editingShiftId && <button type="button" className="ghost-button" onClick={onClearEdit}>{labels.clearEdit}</button>}
      </div>
      <div className="schedule-list">
        {shifts.map((shift) => (
          <div key={shift.id} className="schedule-list__item">
            <span>{shift.name} ({shift.start_time} - {shift.end_time})</span>
            <div>
              <button type="button" className="ghost-button" onClick={() => onEditShift(shift)}>{labels.update}</button>
              <button type="button" className="ghost-button" onClick={() => onDeleteShift(shift.id)} disabled={!canManageSchedule}>{labels.delete}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}