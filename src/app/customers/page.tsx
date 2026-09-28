import { CustomersPage as Customers } from "@/components/customers/customers-page";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const globalSearch = typeof params.globalSearch === "string" ? params.globalSearch : "";
  const parsedId = typeof params.open === "string" ? Number(params.open) : NaN;
  return <Customers initialSearch={globalSearch} initialOpenId={Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null} />;
}
