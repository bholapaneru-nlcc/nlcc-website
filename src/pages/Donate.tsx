import { AppShell } from "../components/Layout";
import { PageHeader } from "../components/bits";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-800">{value}</span>
    </p>
  );
}

export default function Donate() {
  return (
    <AppShell active="/donate">
      <PageHeader
        kicker="Support NLCC"
        title="Donate"
        subtitle="Your support helps us continue teaching Nepali language, culture and values to the next generation."
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-panel animate-fade-up">
          <h2 className="text-xl font-extrabold text-slate-900">Support Our Work</h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            Donations help us cover venue costs, learning materials, certificates,
            events and the future development of the Organisation. Every contribution —
            big or small — makes a real difference to the families we support.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>📚 Learning materials &amp; books</li>
            <li>🏫 Venue hire for classes &amp; events</li>
            <li>🏅 Certificates, awards &amp; prizes</li>
            <li>🎉 Community cultural programmes</li>
          </ul>
          <a
            href="/contact"
            className="mt-5 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-700"
          >
            Contact us about donating
          </a>
        </div>

        <div className="card-panel animate-fade-up">
          <h2 className="text-xl font-extrabold text-slate-900">Bank Details</h2>
          <div className="mt-3">
            <Detail label="Account Name" value="Nepalese Language and Culture Centre" />
            <Detail label="Account Type" value="Business" />
            <Detail label="Sort Code" value="20-45-45" />
            <Detail label="Account Number" value="83959783" />
            <Detail label="Reference" value="Donation + Your Name" />
          </div>
          <p className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm font-semibold leading-relaxed text-brand">
            Thank you for your generous donation. Your support is greatly appreciated
            and helps us continue our work. We are truly grateful for your kindness and
            generosity.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
