import { useEffect, useId, useRef, type ReactNode } from "react";

import { IconButton } from "@/components/IconButton";
import { CloseIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./Dialog.scss";

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  width?: number;
  closeLabel: string;
  /* Extra head content between the title and the close button. */
  head?: ReactNode;
  /* Inline draws the panel in the flow with no <dialog> around it — for
     previews and the showcase, where a modal would take over the page. */
  inline?: boolean;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  title,
  onClose,
  width = 480,
  closeLabel,
  head,
  inline = false,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  /* The element owns its modality: showModal() traps focus and paints the
     backdrop. Where the runtime lacks it (jsdom), the open attribute stands in. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      if (!el.open) el.setAttribute("open", "");
    } else if (!open && el.open) {
      if (typeof el.close === "function") el.close();
      el.removeAttribute("open");
    }
  }, [open]);

  const panel = (
    <div
      className={cx("ohf-dialog-panel", inline && className)}
      style={{ width, maxWidth: inline ? "100%" : undefined }}
      tabIndex={-1}
      role={inline ? "dialog" : undefined}
      aria-labelledby={inline ? titleId : undefined}
    >
      <div className="ohf-dialog-head">
        <div className="ohf-dialog-title" id={titleId}>
          {title}
        </div>
        {head}
        <IconButton
          ghost
          size={28}
          icon={<CloseIcon />}
          aria-label={closeLabel}
          onClick={onClose}
        />
      </div>
      <div className="ohf-dialog-body">{children}</div>
    </div>
  );

  if (inline) return open ? panel : null;
  return (
    <dialog
      ref={ref}
      className={className}
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {panel}
    </dialog>
  );
}
