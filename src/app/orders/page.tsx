import { OrdersPage as Orders } from "@/components/orders/orders-page";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const globalSearch = typeof params.globalSearch === "string" ? params.globalSearch : "";
  const parsedId = typeof params.open === "string" ? Number(params.open) : NaN;
  const paymentStatus = typeof params.paymentStatus === "string" && ["PENDING", "PAID", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(params.paymentStatus) ? params.paymentStatus as "PENDING" | "PAID" | "FAILED" | "PARTIALLY_REFUNDED" | "REFUNDED" : "";
  return <Orders initialSearch={globalSearch} initialOpenId={Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null} initialPaymentStatus={paymentStatus} />;
}
