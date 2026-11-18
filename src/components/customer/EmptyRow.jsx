/**
 * Empty-state row shown inside a CustomerDetailPage section when it has no rows.
 *
 * Used by: pages/CustomerDetailPage.jsx
 */

import { Inbox } from "lucide-react";

export function EmptyRow({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox size={24} className="text-mist-300 dark:text-mist-500" />
      <p className="text-sm text-mist-500 dark:text-mist-300">{text}</p>
    </div>
  );
}
