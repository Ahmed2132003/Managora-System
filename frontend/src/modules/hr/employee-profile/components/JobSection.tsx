import { Controller } from "react-hook-form";
import type { EmployeeFormReturn, PageContent, SimpleEntity } from "../types/employeeProfile.types";

type JobSectionProps = {
  content: PageContent;
  form: EmployeeFormReturn;
  departmentOptions: SimpleEntity[];
  jobTitleOptions: SimpleEntity[];
  shiftOptions: SimpleEntity[];
};

export function JobSection({ content, form, departmentOptions, jobTitleOptions, shiftOptions }: JobSectionProps) {
  return (
    <section className="panel employee-profile__subpanel">
      <div className="panel__header"><div><h2>{content.section.jobTitle}</h2><p>{content.section.jobSubtitle}</p></div></div>
      <div className="employee-profile__grid">
        <label className="form-field"><span>{content.fields.department}</span><Controller name="department_id" control={form.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)}><option value="">{content.fields.department}</option>{departmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.jobTitle}</span><Controller name="job_title_id" control={form.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)}><option value="">{content.fields.jobTitle}</option>{jobTitleOptions.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.shift}</span><Controller name="shift_id" control={form.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)}><option value="">{content.fields.shift}</option>{shiftOptions.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}</select>} /></label>
      </div>
    </section>
  );
}