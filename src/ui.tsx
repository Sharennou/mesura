import { ArrowLeft, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "./context";

export function Icon({
  as: Component,
  size = 20,
}: {
  as: LucideIcon;
  size?: number;
}) {
  return <Component aria-hidden="true" size={size} strokeWidth={1.9} />;
}
export function PageTitle({
  title,
  eyebrow,
  back = true,
  children,
}: {
  title: string;
  eyebrow?: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const { back: goBack } = useApp();
  return (
    <div className="page-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="heading-row">
        {back && (
          <button className="circle back" aria-label="Revenir" onClick={goBack}>
            <Icon as={ArrowLeft} />
          </button>
        )}
        <h1 tabIndex={-1}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
export function Button({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`secondary ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function ErrorMessage({ children }: { children?: ReactNode }) {
  return children ? (
    <div className="error-message" role="alert">
      <Icon as={Info} />
      <span>{children}</span>
    </div>
  ) : null;
}
