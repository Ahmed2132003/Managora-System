import type { LoginContent } from "../types/login.types";

type SubscriptionCardProps = {
  content: LoginContent;
  isArabic: boolean;
  activationUsername: string;
  paymentCode: string;
  isSubscribing: boolean;
  onActivationUsernameChange: (value: string) => void;
  onPaymentCodeChange: (value: string) => void;
  onSubscribe: () => void;
};

export function SubscriptionCard({
  content,
  isArabic,
  activationUsername,
  paymentCode,
  isSubscribing,
  onActivationUsernameChange,
  onPaymentCodeChange,
  onSubscribe,
}: SubscriptionCardProps) {
  return (
    <div className="subscription-card">
      <h3>{content.subscriptionTitle}</h3>
      <p>{content.subscriptionSummary}</p>
      <ul>
        <li>{content.purchasePrice}</li>
        <li>{content.maintenancePrice}</li>
      </ul>
      <label className="field">
        <span>{content.activationUsernameLabel}</span>
        <input
          type="text"
          value={activationUsername}
          onChange={(e) => onActivationUsernameChange(e.currentTarget.value)}
          placeholder={isArabic ? "ادخل اسم المستخدم" : "Enter username"}
        />
      </label>
      <label className="field">
        <span>{content.paymentCodeLabel}</span>
        <input
          type="text"
          value={paymentCode}
          onChange={(e) => onPaymentCodeChange(e.currentTarget.value)}
          placeholder={isArabic ? "ادخل كود الدفع" : "Enter payment code"}
        />
      </label>
      <button
        type="button"
        className="action-button"
        onClick={onSubscribe}
        disabled={isSubscribing || !paymentCode.trim() || !activationUsername.trim()}
      >
        {isSubscribing ? content.subscribeNowLabel + "..." : content.subscribeNowLabel}
      </button>
      <small className="subscription-note">{content.subscriptionHint}</small>
    </div>
  );
}