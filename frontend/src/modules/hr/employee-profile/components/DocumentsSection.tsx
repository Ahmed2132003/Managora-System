import { Controller } from "react-hook-form";
import { TextInput } from "@mantine/core";
import { env } from "../../../../shared/config/env";

export function DocumentsSection(props: any) {
  const { content, language, employeeId, documentForm, handleUploadDocument, uploadDocumentMutation, documentTypeOptionsByLanguage, documentCategoryOptionsByLanguage, linkedEntityOptionsByLanguage, documentCategoryFilter, setDocumentCategoryFilter, documentSearch, setDocumentSearch, documentsQuery, handleDeleteDocument, deleteDocumentMutation } = props;
  return (
    <section className="panel employee-profile__subpanel">
      <div className="panel__header"><div><h2>{content.section.documentsTitle}</h2><p>{content.section.documentsSubtitle}</p></div></div>
      {!employeeId && <p className="helper-text">{content.documents.saveHint}</p>}
      <div className="employee-profile__documents">
        <div className="employee-profile__document-header">
          <label className="form-field"><span>{content.documents.docType}</span><Controller name="doc_type" control={documentForm.control} render={({ field }) => <select value={field.value} onChange={(event) => field.onChange(event.target.value)} disabled={!employeeId}>{documentTypeOptionsByLanguage[language].map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>} /></label>
          <label className="form-field"><span>{content.documents.category}</span><Controller name="category" control={documentForm.control} render={({ field }) => <select value={field.value} onChange={(event) => field.onChange(event.target.value)} disabled={!employeeId}>{documentCategoryOptionsByLanguage[language].map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>} /></label>
          <label className="form-field"><span>{content.documents.linkedType}</span><Controller name="linked_entity_type" control={documentForm.control} render={({ field }) => <select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value)} disabled={!employeeId}><option value="">-</option>{linkedEntityOptionsByLanguage[language].map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>} /></label>
          <label className="form-field"><span>{content.documents.linkedId}</span><Controller name="linked_entity_id" control={documentForm.control} render={({ field }) => <TextInput value={field.value} onChange={field.onChange} disabled={!employeeId} />} /></label>
          <label className="form-field"><span>{content.documents.title}</span><Controller name="title" control={documentForm.control} render={({ field }) => <TextInput value={field.value} onChange={field.onChange} error={documentForm.formState.errors.title?.message} disabled={!employeeId} />} /></label>
          <label className="form-field"><span>{content.documents.file}</span><Controller name="file" control={documentForm.control} render={({ field }) => <input type="file" onChange={(event) => field.onChange(event.target.files?.[0] ?? null)} disabled={!employeeId} />} /></label>
          <button type="button" className="primary-button" onClick={documentForm.handleSubmit(handleUploadDocument)} disabled={!employeeId || uploadDocumentMutation.isPending}>{content.buttons.upload}</button>
        </div>
        <div className="employee-profile__document-filters">
          <label className="form-field"><span>{content.documents.category}</span><select value={documentCategoryFilter} onChange={(event) => setDocumentCategoryFilter(event.target.value)}><option value="">{content.documents.allCategories}</option>{documentCategoryOptionsByLanguage[language].map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="form-field"><span>{content.documents.search}</span><input value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder={content.documents.searchPlaceholder} /></label>
        </div>
        {documentsQuery.isLoading ? <div className="employee-profile__loading">{content.documents.loading}</div> : documentsQuery.data?.length ? (
          <div className="employee-profile__document-list"><div className="employee-profile__document-list-header"><span>{content.documents.docType}</span><span>{content.documents.category}</span><span>{content.documents.linkedId}</span><span>{content.documents.uploaded}</span><span>{content.documents.ocrText}</span><span>{content.documents.actions}</span></div><div className="employee-profile__document-list-body">{documentsQuery.data.map((doc: any) => <div className="employee-profile__document-row" key={doc.id}><span>{doc.doc_type}</span><span>{doc.category}</span><span>{doc.linked_entity_id || "-"}</span><span>{doc.created_at ? doc.created_at.slice(0, 10) : ""}</span><span className="employee-profile__ocr-preview">{doc.ocr_text ? doc.ocr_text.slice(0, 80) : "-"}</span><div className="employee-profile__document-actions"><a className="ghost-button" href={`${env.API_BASE_URL}${doc.file}`} target="_blank" rel="noreferrer">{content.buttons.download}</a><button type="button" className="ghost-button ghost-button--danger" onClick={() => handleDeleteDocument(doc.id)} disabled={deleteDocumentMutation.isPending}>{content.buttons.delete}</button></div></div>)}</div></div>
        ) : <p className="helper-text">{content.documents.empty}</p>}
      </div>
    </section>
  );
}