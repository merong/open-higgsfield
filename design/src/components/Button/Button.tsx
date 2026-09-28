import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react";

import { Kbd } from "@/components/Kbd";
import { Spinner } from "@/components/Spinner";
import { cx } from "@/lib/cx";

import "./Button.scss";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "model"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  kbd?: string;
  /* Busy is a run in flight: still lime, still disabled. Loading is the
     control's own wait: the icon becomes a spinner. */
  busy?: boolean;
  loading?: boolean;
  disabled?: boolean;
  href?: string;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  kbd,
  busy = false,
  loading = false,
  disabled = false,
  href,
  type,
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const cls = cx(
    "ohf-btn",
    `ohf-btn--${variant}`,
    `ohf-btn--${size}`,
    className,
  );
  const blocked = disabled || busy || loading;
  const body = (
    <>
      {loading ? (
        <Spinner />
      ) : icon ? (
        <span className="ohf-btn-icon">{icon}</span>
      ) : null}
      {children !== undefined && (
        <span className="ohf-btn-label">{children}</span>
      )}
      {kbd && <Kbd>{kbd}</Kbd>}
    </>
  );
  if (href !== undefined) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        className={cls}
        href={blocked ? undefined : href}
        role="link"
        aria-disabled={blocked || undefined}
        data-busy={busy || undefined}
        data-loading={loading || undefined}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        tabIndex={blocked ? -1 : rest.tabIndex}
        onClick={(event) => {
          if (blocked) {
            event.preventDefault();
            return;
          }
          rest.onClick?.(event);
        }}
      >
        {body}
      </a>
    );
  }
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type={type ?? "button"}
      className={cls}
      disabled={disabled || busy || loading}
      data-busy={busy || undefined}
      data-loading={loading || undefined}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {body}
    </button>
  );
}
