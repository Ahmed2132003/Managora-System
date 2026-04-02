import type { Content } from "../types/users";

type UsersHeaderProps = {
  content: Content;
  usersCount: number;
  activeUsers: number;
  inactiveUsers: number;
  rolesCount: number;
  canCreate: boolean;
  onCreate: () => void;
};

export function UsersHeader({
  content,
  usersCount,
  activeUsers,
  inactiveUsers,
  rolesCount,
  canCreate,
  onCreate,
}: UsersHeaderProps) {
  return (
    <section className="hero-panel users-hero">
      <div className="users-hero__header">
        <div className="hero-panel__intro">
          <h1>{content.pageTitle}</h1>
          <p>{content.pageSubtitle}</p>
        </div>
        {canCreate && (
          <button type="button" className="primary-button" onClick={onCreate}>
            {content.createUser}
          </button>
        )}
      </div>

      <div className="hero-panel__stats">
        {[
          { label: content.stats.totalUsers, value: usersCount },
          { label: content.stats.activeUsers, value: activeUsers },
          { label: content.stats.inactiveUsers, value: inactiveUsers },
          { label: content.stats.totalRoles, value: rolesCount },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card__top">
              <span>{stat.label}</span>
              <span className="stat-card__change">{content.pageTitle}</span>
            </div>
            <strong>{stat.value}</strong>
            <div className="stat-card__spark" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}