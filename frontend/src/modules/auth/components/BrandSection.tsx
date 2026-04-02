import type { LoginContent } from "../types/login.types";

type BrandSectionProps = {
  content: LoginContent;
};

export function BrandSection({ content }: BrandSectionProps) {
  return (
    <header className="login-topbar">
      <div className="login-brand">
        <img src="/managora-logo.png" alt="Managora logo" />
        <div>
          <span className="login-brand__title">{content.brand}</span>
          <span className="login-brand__subtitle">{content.subtitle}</span>
        </div>
      </div>
    </header>
  );
}