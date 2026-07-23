import { AppShell } from "../components/Layout";
import { MemberCard, PageHeader } from "../components/bits";
import { useStore } from "../lib/store";

export default function Committee() {
  const { data } = useStore();
  const members = [...(data.committeeMembers || [])].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0),
  );
  return (
    <AppShell active="/committee">
      <PageHeader
        kicker="NLCC"
        title="Committee Members"
        subtitle="Meet the dedicated committee members who support and guide the Nepalese Language and Culture Centre."
      />
      {members.length ? (
        <section className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </section>
      ) : (
        <div className="card-panel mt-6 text-slate-500">
          No committee members listed yet.
        </div>
      )}
    </AppShell>
  );
}
