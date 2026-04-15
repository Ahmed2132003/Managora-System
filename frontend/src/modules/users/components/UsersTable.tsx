import type { Content, Role, User } from "../types/users";

type UsersTableProps = {
  content: Content;
  users: User[];
  isLoading: boolean;
  isError: boolean;
  isForbidden: boolean;
  isArabic: boolean;  
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
};

export function UsersTable({
  content,
  users,
  isLoading,
  isError,
  isForbidden,
  isArabic,  
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: UsersTableProps) {
  return (
    <section className="panel users-panel">
      <div className="panel__header">
        <div>
          <h2>{content.table.title}</h2>
          <p>{content.table.subtitle}</p>
        </div>
        <span className="pill pill--accent">{users.length}</span>
      </div>

      {isLoading && <div className="users-state users-state--loading">{content.table.loading}</div>}
      {isError && (
        <div className="users-state users-state--error">
          {isForbidden
            ? (isArabic ? "غير مصرح لك بعرض المستخدمين." : "Unauthorized to view users.")
            : (isArabic ? "حصل خطأ أثناء تحميل المستخدمين." : "Something went wrong while loading users.")}
        </div>
      )}      
      {!isLoading && users.length === 0 && (
        <div className="users-state">
          <strong>{content.table.emptyTitle}</strong>
          <span>{content.table.emptySubtitle}</span>
        </div>
      )}

      {users.length > 0 && (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>{content.table.username}</th>
                <th>{content.table.email}</th>
                <th>{content.table.roles}</th>
                <th>{content.table.active}</th>
                <th>{content.table.created}</th>
                <th>{content.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <strong>{user.username}</strong>
                      <span>{user.email || "-"}</span>
                    </div>
                  </td>
                  <td>{user.email || "-"}</td>
                  <td>
                    <div className="role-list">
                      {(user.roles ?? []).length === 0 ? (
                        <span className="role-pill role-pill--empty">-</span>
                      ) : (
                        (user.roles ?? []).map((role: Role) => (
                          <span key={role.id} className="role-pill">
                            {role.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill${user.is_active ? " status-pill--active" : ""}`}>
                      {user.is_active ? content.status.active : content.status.inactive}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      if (!user.date_joined) return "-";
                      const parsedDate = new Date(user.date_joined);
                      if (Number.isNaN(parsedDate.getTime())) return "-";
                      return parsedDate.toLocaleDateString(isArabic ? "ar-EG" : "en-GB");
                    })()}
                  </td>
                  <td>
                    <div className="table-actions">
                      {canEdit && (
                        <button type="button" className="ghost-button" onClick={() => onEdit(user)}>
                          {isArabic ? "تعديل" : "Edit"}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="ghost-button ghost-button--danger"
                          onClick={() => onDelete(user)}
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}