import { Controller } from "react-hook-form";
import { TextInput } from "@mantine/core";

export function BasicInfoSection({ content, form, statusOptions, userOptions, userSelectDisabled, departmentOptions, jobTitleOptions, shiftOptions }: any) {
  return (
    <section className="panel employee-profile__subpanel">
      <div className="panel__header"><div><h2>{content.section.basicTitle}</h2><p>{content.section.basicSubtitle}</p></div></div>
      <div className="employee-profile__grid">
        <label className="form-field"><span>{content.fields.employeeCode}</span><Controller name="employee_code" control={form.control} render={({ field }) => <TextInput value={field.value} onChange={field.onChange} error={form.formState.errors.employee_code?.message} />} /></label>
        <label className="form-field"><span>{content.fields.fullName}</span><Controller name="full_name" control={form.control} render={({ field }) => <TextInput value={field.value} onChange={field.onChange} error={form.formState.errors.full_name?.message} />} /></label>
        <label className="form-field"><span>{content.fields.nationalId}</span><Controller name="national_id" control={form.control} render={({ field }) => <TextInput value={field.value} onChange={field.onChange} error={form.formState.errors.national_id?.message} />} /></label>
        <label className="form-field"><span>{content.fields.hireDate}</span><Controller name="hire_date" control={form.control} render={({ field }) => <TextInput type="date" value={field.value} onChange={field.onChange} error={form.formState.errors.hire_date?.message} />} /></label>
        <label className="form-field"><span>{content.fields.status}</span><Controller name="status" control={form.control} render={({ field }) => <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>{statusOptions.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.manager}</span><Controller name="manager_id" control={form.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)}><option value="">{content.fields.managerPlaceholder}</option>{userOptions.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.user}</span><Controller name="user_id" control={form.control} render={({ field }) => <select value={field.value} onChange={(event) => field.onChange(event.target.value)} disabled={userSelectDisabled}><option value="">{content.fields.userPlaceholder}</option>{userOptions.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.department}</span><Controller name="department_id" control={form.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)}><option value="">{content.fields.department}</option>{departmentOptions.map((department: any) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.jobTitle}</span><Controller name="job_title_id" control={form.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)}><option value="">{content.fields.jobTitle}</option>{jobTitleOptions.map((job: any) => <option key={job.id} value={job.id}>{job.name}</option>)}</select>} /></label>
        <label className="form-field"><span>{content.fields.shift}</span><Controller name="shift_id" control={form.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)}><option value="">{content.fields.shift}</option>{shiftOptions.map((shift: any) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}</select>} /></label>
      </div>
    </section>
  );
}