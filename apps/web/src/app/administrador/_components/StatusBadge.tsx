import { ACCOUNT_STATUS_LABELS } from "../_lib/labels";
import type { AccountStatus } from "../types";

const COLOR: Record<AccountStatus, string> = {
  active: "bg-exito text-paper",
  suspended: "bg-peligro text-paper",
  pending: "bg-alerta text-paper",
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${COLOR[status]}`}>
      {ACCOUNT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
