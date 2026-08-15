import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className }: PanelProps) {
  return (
    <section className={`rounded-md border border-n-100 bg-n-0 ${className ?? ""}`}>
      <h2 className="border-b border-n-100 px-4 py-3 text-sm font-semibold text-n-950">{title}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}
