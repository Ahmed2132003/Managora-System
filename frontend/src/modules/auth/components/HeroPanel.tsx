import type { FormEvent } from "react";

import { LoginForm } from "./LoginForm.tsx";
import { SubscriptionCard } from "./SubscriptionCard.tsx";
import type { LoginContent } from "../types/login.types";

type HeroPanelProps = {
  content: LoginContent;
  isArabic: boolean;
  username: string;
  password: string;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  activationUsername: string;
  paymentCode: string;
  isSubscribing: boolean;
  onActivationUsernameChange: (value: string) => void;
  onPaymentCodeChange: (value: string) => void;
  onSubscribe: () => void;
};

export function HeroPanel({
  content,
  isArabic,
  username,
  password,
  isSubmitting,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  activationUsername,
  paymentCode,
  isSubscribing,
  onActivationUsernameChange,
  onPaymentCodeChange,
  onSubscribe,
}: HeroPanelProps) {
  return (
    <section className="hero-panel">
      <div className="hero-panel__intro">
        <h1>{content.heroTitle}</h1>
        <p>{content.heroSubtitle}</p>
      </div>
      <img className="hero-panel__logo" src="/managora-logo.png" alt="Managora logo" />

      <LoginForm
        content={content}
        username={username}
        password={password}
        isSubmitting={isSubmitting}
        onUsernameChange={onUsernameChange}
        onPasswordChange={onPasswordChange}
        onSubmit={onSubmit}
      />

      <SubscriptionCard
        content={content}
        isArabic={isArabic}
        activationUsername={activationUsername}
        paymentCode={paymentCode}
        isSubscribing={isSubscribing}
        onActivationUsernameChange={onActivationUsernameChange}
        onPaymentCodeChange={onPaymentCodeChange}
        onSubscribe={onSubscribe}
      />
    </section>
  );
}