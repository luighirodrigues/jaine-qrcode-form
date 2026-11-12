import { BrandHeader, Footer } from "@/components/brand";
import { LeadForm } from "@/components/lead-form";
import { siteContent } from "@/lib/site-content";

export default async function Home({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <div className="app-frame">
    <BrandHeader />
    <main className="page-shell">
      {status === "expired" ? <p className="feedback" role="status">Preencha seus dados para liberar o acesso ao PDF novamente.</p> : null}
      <h1 className="page-heading">{siteContent.formTitle}</h1>
      <p className="page-description">{siteContent.formDescription}</p>
      <LeadForm />
      <Footer />
    </main>
  </div>;
}
