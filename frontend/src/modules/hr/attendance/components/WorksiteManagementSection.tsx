type Worksite = {
  id: number;
  name: string;
  lat: string;
  lng: string;
  radius_meters: number;
  is_active: boolean;
};

type WorksiteManagementSectionProps = {
  title: string;
  labels: {
    nameLabel: string;
    latLabel: string;
    lngLabel: string;
    radiusLabel: string;
    activeLabel: string;
    addWorksite: string;
    update: string;
    delete: string;
    clearEdit: string;
  };
  worksiteName: string;
  worksiteLat: string;
  worksiteLng: string;
  worksiteRadius: string;
  worksiteIsActive: boolean;
  editingWorksiteId: number | null;
  canManageSchedule: boolean;
  worksites: Worksite[];
  onWorksiteNameChange: (value: string) => void;
  onWorksiteLatChange: (value: string) => void;
  onWorksiteLngChange: (value: string) => void;
  onWorksiteRadiusChange: (value: string) => void;
  onWorksiteActiveChange: (value: boolean) => void;
  onSaveWorksite: () => void;
  onClearEdit: () => void;
  onEditWorksite: (worksite: Worksite) => void;
  onDeleteWorksite: (id: number) => void;
};

export function WorksiteManagementSection(props: WorksiteManagementSectionProps) {
  const {
    title,
    labels,
    worksiteName,
    worksiteLat,
    worksiteLng,
    worksiteRadius,
    worksiteIsActive,
    editingWorksiteId,
    canManageSchedule,
    worksites,
    onWorksiteNameChange,
    onWorksiteLatChange,
    onWorksiteLngChange,
    onWorksiteRadiusChange,
    onWorksiteActiveChange,
    onSaveWorksite,
    onClearEdit,
    onEditWorksite,
    onDeleteWorksite,
  } = props;

  return (
    <div className="schedule-card">
      <h3>{title}</h3>
      <div className="form-grid">
        <label className="form-field"><span>{labels.nameLabel}</span><input type="text" value={worksiteName} onChange={(e) => onWorksiteNameChange(e.target.value)} /></label>
        <label className="form-field"><span>{labels.latLabel}</span><input type="number" step="0.000001" value={worksiteLat} onChange={(e) => onWorksiteLatChange(e.target.value)} /></label>
        <label className="form-field"><span>{labels.lngLabel}</span><input type="number" step="0.000001" value={worksiteLng} onChange={(e) => onWorksiteLngChange(e.target.value)} /></label>
        <label className="form-field"><span>{labels.radiusLabel}</span><input type="number" min={1} value={worksiteRadius} onChange={(e) => onWorksiteRadiusChange(e.target.value)} /></label>
      </div>
      <label className="form-toggle">
        <input type="checkbox" checked={worksiteIsActive} onChange={(e) => onWorksiteActiveChange(e.target.checked)} />
        <span>{labels.activeLabel}</span>
      </label>
      <div className="schedule-actions">
        <button type="button" className="primary-button" onClick={onSaveWorksite} disabled={!canManageSchedule || !worksiteName.trim()}>{editingWorksiteId ? labels.update : labels.addWorksite}</button>
        {editingWorksiteId && <button type="button" className="ghost-button" onClick={onClearEdit}>{labels.clearEdit}</button>}
      </div>
      <div className="schedule-list">
        {worksites.map((worksite) => (
          <div key={worksite.id} className="schedule-list__item">
            <span>{worksite.name} ({worksite.radius_meters}m)</span>
            <div>
              <button type="button" className="ghost-button" onClick={() => onEditWorksite(worksite)}>{labels.update}</button>
              <button type="button" className="ghost-button" onClick={() => onDeleteWorksite(worksite.id)} disabled={!canManageSchedule}>{labels.delete}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}