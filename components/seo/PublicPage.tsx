import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import BreadcrumbSchema from "./BreadcrumbSchema";
export default function PublicPage({title,path,children}: {title:string;path:string;children:React.ReactNode}) {
 return <div className="font-franklin bg-white text-[#0a1f33]"><SiteHeader /><main id="main-content" className="mx-auto max-w-5xl px-5 py-14 sm:px-8"><BreadcrumbSchema items={[{name:title,path}]} /><nav aria-label="Breadcrumb" className="mb-6 text-sm"><a href="/" className="underline">Home</a> / {title}</nav><h1 className="mb-8 text-4xl font-semibold leading-tight">{title}</h1><div className="space-y-8 leading-relaxed">{children}</div></main><SiteFooter /></div>;
}
