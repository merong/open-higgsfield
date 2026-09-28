import type { ReactNode } from "react";
import { CaretDownIcon } from "@/icons";
import "./InspectorSection.scss";
export interface InspectorSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}
export function InspectorSection({
  title,
  description,
  children,
  defaultOpen = true,
}: InspectorSectionProps) {
  return (
    <details className="ohf-inspector" open={defaultOpen}>
      <summary>
        {title}
        <CaretDownIcon />
      </summary>
      {description && <p>{description}</p>}
      <div className="ohf-inspector-content">{children}</div>
    </details>
  );
}
