import type { AttendanceOtpPurpose } from "../../../../shared/hr/hooks";
import type { SelfAttendanceContent } from "../config/selfAttendanceContent";

type ClockInOutSectionProps = {
  content: SelfAttendanceContent;
  isArabic: boolean;
  otpPurpose: AttendanceOtpPurpose;
  requestId: number | null;
  expiresIn: number;
  otpCode: string;
  canVerify: boolean;
  isRequestPending: boolean;
  isVerifyPending: boolean;
  checkInCodeValue: string;
  checkOutCodeValue: string;
  isCheckInCodeSubmitting: boolean;
  isCheckOutCodeSubmitting: boolean;  
  onRequestOtp: (purpose: AttendanceOtpPurpose) => void;
  onOtpCodeChange: (value: string) => void;
  onVerifyOtp: () => void;
  onCheckInCodeChange: (value: string) => void;
  onSubmitCheckInCode: () => void;
  onCheckOutCodeChange: (value: string) => void;
  onSubmitCheckOutCode: () => void;  
};

export function ClockInOutSection({
  content,
  isArabic,
  otpPurpose,
  requestId,
  expiresIn,
  otpCode,
  canVerify,
  isRequestPending,
  isVerifyPending,
  checkInCodeValue,
  checkOutCodeValue,
  isCheckInCodeSubmitting,
  isCheckOutCodeSubmitting,  
  onRequestOtp,
  onOtpCodeChange,
  onVerifyOtp,
  onCheckInCodeChange,
  onSubmitCheckInCode,
  onCheckOutCodeChange,
  onSubmitCheckOutCode,  
}: ClockInOutSectionProps) {  
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>{content.otpTitle}</h2>
          <p>{content.otpSubtitle}</p>
        </div>
        <span className="pill">{content.todayLabel}</span>
      </div>

      <div className="attendance-form">
        <div className="attendance-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onRequestOtp("checkin")}
            disabled={isRequestPending}
          >
            {isRequestPending && otpPurpose === "checkin" ? content.otpSending : content.otpRequestCheckIn}
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={() => onRequestOtp("checkout")}
            disabled={isRequestPending}
          >
            {isRequestPending && otpPurpose === "checkout" ? content.otpSending : content.otpRequestCheckOut}
          </button>
        </div>

        <div className="attendance-fields" style={{ marginTop: 12 }}>
          <label className="attendance-field">
            <span>{content.otpCodeLabel}</span>
            <input
              inputMode="numeric"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => onOtpCodeChange(e.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
              disabled={requestId === null || expiresIn === 0}
            />
          </label>
        </div>

        <div className="attendance-actions" style={{ marginTop: 12, alignItems: "center" }}>
          <span className="attendance-note" style={{ margin: 0 }}>
            {requestId === null
              ? content.otpRequestFirst
              : expiresIn > 0
              ? content.otpExpiresIn(expiresIn)
              : content.otpExpired}
          </span>

          <button type="button" className="primary-button" onClick={onVerifyOtp} disabled={!canVerify}>
            {isVerifyPending ? content.otpVerifying : content.otpVerifySubmit}
          </button>
        </div>

        <span className="attendance-note">
          {isArabic
            ? "ملاحظة: لا يتم اعتماد الحركة إلا بعد تأكيد الموارد البشرية/المدير."
            : "Note: the record will be approved only after HR/Manager confirmation."}
        </span>

        <hr style={{ width: "100%", borderColor: "var(--border)", opacity: 0.5 }} />

        <div className="attendance-fields">
          <label className="attendance-field">
            <span>{isArabic ? "كود الحضور" : "Attendance code"}</span>
            <input
              placeholder={isArabic ? "أدخل الكود" : "Enter rotating code"}
              value={checkInCodeValue}
              onChange={(event) => onCheckInCodeChange(event.currentTarget.value.toUpperCase().slice(0, 12))}
            />
          </label>
          <label className="attendance-field">
            <span>{isArabic ? "كود الانصراف" : "Departure code"}</span>
            <input
              placeholder={isArabic ? "أدخل كود الانصراف" : "Enter departure code"}
              value={checkOutCodeValue}
              onChange={(event) => onCheckOutCodeChange(event.currentTarget.value.toUpperCase().slice(0, 12))}
            />
          </label>
        </div>
        <div className="attendance-actions" style={{ display: "grid", gap: 8 }}>
          <button
            type="button"
            className="primary-button"
            onClick={onSubmitCheckInCode}
            disabled={!checkInCodeValue || isCheckInCodeSubmitting}
          >
            {isCheckInCodeSubmitting
              ? isArabic
                ? "جاري الإرسال..."
                : "Submitting..."
              : isArabic
                ? "إرسال كود الحضور"
                : "Submit attendance code"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={onSubmitCheckOutCode}
            disabled={!checkOutCodeValue || isCheckOutCodeSubmitting}
          >
            {isCheckOutCodeSubmitting
              ? isArabic
                ? "جاري الإرسال..."
                : "Submitting..."
              : isArabic
                ? "إرسال كود الانصراف"
                : "Submit departure code"}
          </button>
        </div>
      </div>
    </div>
  );
}