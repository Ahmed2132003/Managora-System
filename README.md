# Company OS

One platform for HR + Attendance + Payroll + Accounting + Dashboards (10–300 employees).

## Repo Structure
- `backend/` Django + DRF API
- `frontend/` React + TypeScript + Vite
- `infra/` Docker, deployment, and environment setup
- `docs/` Architecture notes and decisions

## Development Setup (Phase 1)
> Phase 1 focuses on project foundation + multi-tenant skeleton + auth.

### Requirements
- Git
- Docker + Docker Compose
- Node.js (later)
- Python (later)

## Branching
- `main`: stable releases
- `develop`: integration branch
- `feature/*`: feature branches per phase

## Decisions (Fixed)
- Multi-tenant: `Company` + `user.company_id`
- Auth: SimpleJWT
- API Docs: drf-spectacular
- Front: React TS + Vite + Router + TanStack Query
- Token storage (MVP): localStorage + refresh

## Manual E2E Payroll Script (Phase 5)
1. Create an employee and assign a salary structure with a basic salary.
2. Add a recurring allowance component to the salary structure.
3. Record attendance with late minutes and absent days for the period.
4. Create an unpaid leave request for the same period.
5. Create a loan advance with an installment amount.
6. Create a payroll period for the month.
7. Generate payroll runs for the period.
8. Verify payroll totals (earnings, deductions, net) per employee.
9. Download the payslip PNG for an employee.
10. Lock the payroll period.
11. Attempt to generate again; it should fail due to the lock.

## Notifications + Internal Messaging
- Leave workflow notifications now create **in-app notifications** plus optional email.
- New internal direct chat endpoints are available:
  - list conversations
  - list conversation messages (supports incremental loading with `after_id`)
  - send a private message (creates both chat message + in-app notification)
- Push subscription endpoint is available for browser service workers (`/api/push-subscriptions/`) to support closed-tab/browser notifications.

### Backend environment variables
- `NOTIFICATIONS_EMAIL_ENABLED` (default `1`)
DEFAULT_FROM_EMAIL`
### Frontend environment variables
- `VITE_WEB_PUSH_PUBLIC_KEY` (required to enable browser push subscription from the Messages page)."# Managora-System" 

## Phase 8: Performance Optimization

### Redis Caching (HR Reference Data)
- Cached datasets:
  - Departments
  - Job Titles
  - Leave Types
- Caching is implemented in the HR service layer (`hr/employees/services.py`, `hr/leaves/services.py`) using centralized helpers in `hr/common/cache.py`.
- Cache keys are versioned and company-scoped (example: `departments:company:12:v1`).
- Invalidation is granular via Django signals on create/update/delete for the affected model only.

### Celery Background Processing
- Redis is used as Celery broker and result backend.
- Payroll generation is executed asynchronously via `hr.payroll.tasks.generate_payroll_period`.
- Analytics reports can be dispatched asynchronously via `analytics.tasks.run_analytics_report`.
- Task lifecycle monitoring hooks are wired with Celery signals (`task_prerun`, `task_postrun`, `task_failure`) in `core/celery_signals.py`.

### Running workers
```bash
cd backend
celery -A config worker -l info
celery -A config beat -l info
```