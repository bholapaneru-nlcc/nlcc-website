import type { ReactNode } from "react";
import { AppShell } from "../components/Layout";
import { PageHeader } from "../components/bits";

function TextBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm [border-left:5px_solid_#1155cc]">
      <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
      <p className="mt-2 leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

export default function About() {
  return (
    <AppShell active="/about">
      <PageHeader
        kicker="NLCC"
        title="About Us"
        subtitle="Nepalese Language and Culture Centre supports children and families by promoting Nepali language, culture, values and identity through regular classes, community events and cultural programmes."
      />

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <TextBlock title="Our Purpose">
          We aim to preserve and promote Nepali language, culture and identity for
          children and families in the UK, so the next generation can stay connected
          to their heritage.
        </TextBlock>
        <TextBlock title="Our Community">
          NLCC supports families through classes, events, cultural programmes and
          community participation — welcoming everyone who shares our mission.
        </TextBlock>
        <TextBlock title="What We Offer">
          Weekly Nepali language classes (online and in person), cultural
          celebrations, festivals such as Dashain and Tihar, sports days and family
          events throughout the year.
        </TextBlock>
        <TextBlock title="Get Involved">
          Whether you can volunteer, teach, donate or simply attend our events, there
          is a place for you in the NLCC community. Reach out via the Contact page.
        </TextBlock>
      </section>
    </AppShell>
  );
}
