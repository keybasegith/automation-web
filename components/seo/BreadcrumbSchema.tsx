import JsonLd from "@/lib/seo/jsonLd";
import { buildBreadcrumbs, type BreadcrumbCrumb } from "@/lib/seo/schema/breadcrumbs";
import { schemaDocument } from "@/lib/seo/schema/types";
export default function BreadcrumbSchema({ items }: { items: BreadcrumbCrumb[] }) {
  return <JsonLd data={schemaDocument([buildBreadcrumbs([{ name: "Home", path: "/" }, ...items])])} />;
}
