import type { FormEvent } from "react";

import type { LoginContent } from "../types/login.types";

type LoginFormProps = {
  content: LoginContent;
  username: string;
  password: string;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function LoginForm({
  content,
  username,
  password,
  isSubmitting,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <div className="login-card">
      <div className="login-card__header">
        <div>
          <h2>{content.formTitle}</h2>
          <p>{content.formSubtitle}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="login-form">
        <label className="field">
          <span>{content.usernameLabel}</span>
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.currentTarget.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>{content.passwordLabel}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.currentTarget.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="action-button" disabled={isSubmitting}>
          {isSubmitting ? content.loginLabel + "..." : content.loginLabel}
        </button>
      </form>
    </div>
  );
}