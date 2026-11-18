/**
 * Order total cell for the orders table; shows the net total after returns when it differs.
 *
 * Used by: pages/OrdersListPage.jsx
 */

import { formatCurrency } from "../../utils/Format";
import { orderNetTotal } from "../../utils/InvoiceHelpers";

// Same number the invoice shows: grand total minus returned value. The
// original total is shown struck-through underneath when they differ.
export function OrderTotal({ order }) {
  const net = orderNetTotal(order);
  const changed = Math.abs(net - Number(order.grandTotal || 0)) > 0.009;
  return (
    <>
      <span>{formatCurrency(net)}</span>
      {changed && (
        <span className="block text-[11px] font-normal text-mist-400 line-through dark:text-mist-500">
          {formatCurrency(order.grandTotal)}
        </span>
      )}
    </>
  );
}
