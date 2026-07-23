import { useMemo, useState, type FormEvent } from "react";
import { AppShell } from "../components/Layout";
import { PageHeader } from "../components/bits";
import { useStore } from "../lib/store";
import { EMAIL_ENABLED, sendContactEmail, type SendStatus } from "../lib/email";

type FormState = { name: string; phone: string; email: string; subject: string; message: string };
type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { name: "", phone: "", email: "", subject: "", message: "" };

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30";
const errorInputClass =
  "mt-1.5 w-full rounded-lg border border-rose-400 bg-rose-50/40 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-300";
const labelClass = "text-sm font-bold text-slate-700";

/* ------------------------------ validation -------------------------------- */

const isEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const isPhone = (v: string) => {
  // Accept +, spaces, dashes, parentheses; require at least 7 digits.
  const digits = v.replace(/\D/g, "");
  return /^[+\d][\d\s()+-]*$/.test(v.trim()) && digits.length >= 7 && digits.length <= 15;
};

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = "Please enter your name.";
  else if (form.name.trim().length < 2) errors.name = "Name is too short.";

  if (!form.phone.trim()) errors.phone = "Please enter your phone number.";
  else if (!isPhone(form.phone)) errors.phone = "Enter a valid phone number.";

  if (!form.email.trim()) errors.email = "Please enter your email.";
  else if (!isEmail(form.email)) errors.email = "Enter a valid email address.";

  if (!form.subject.trim()) errors.subject = "Please enter a subject.";
  else if (form.subject.trim().length < 3) errors.subject = "Subject is too short.";

  if (!form.message.trim()) errors.message = "Please enter a message.";
  else if (form.message.trim().length < 10)
    errors.message = "Message must be at least 10 characters.";

  return errors;
}

/* --------------------------------- page ----------------------------------- */

export default function Contact() {
  const { data, save } = useStore();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    name: false, phone: false, email: false, subject: false, message: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: SendStatus; message: string } | null>(null);

  const update = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Re-validate this field live once it's been touched.
    if (touched[key]) {
      setErrors(validate({ ...form, [key]: value }));
    }
  };

  const blur = (key: keyof FormState) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validate(form));
  };

  const isValid = useMemo(() => Object.keys(validate(form)).length === 0, [form]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setTouched({ name: true, phone: true, email: true, subject: true, message: true });
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    // Always keep a copy in the admin inbox, and email it if configured.
    save({
      ...data,
      contactMessages: [
        { id: Date.now().toString(), createdAt: new Date().toISOString(), ...form },
        ...(data.contactMessages || []),
      ],
    });

    const sendResult = await sendContactEmail(form);
    setResult(sendResult);

    setForm(EMPTY);
    setErrors({});
    setTouched({ name: false, phone: false, email: false, subject: false, message: false });
    setSubmitting(false);
  };

  const field = (key: keyof FormState) => (errors[key] ? errorInputClass : inputClass);

  return (
    <AppShell active="/contact">
      <PageHeader
        kicker="Contact"
        title="Contact Us"
        subtitle="Have a question, want to volunteer, or need information about classes? Send us a message — all fields are required."
      />

      <section className="card-panel mt-6 max-w-3xl animate-fade-up">
        {result ? (
          <p
            className={`mb-5 rounded-lg px-4 py-3 text-sm font-bold ${
              result.status === "error"
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {result.status === "ok" ? "✓ " : result.status === "error" ? "⚠ " : ""}
            {result.message}
          </p>
        ) : null}
        {!EMAIL_ENABLED ? (
          <p className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            Note: email delivery isn’t configured yet, so messages are saved to the
            admin inbox only. Add a Web3Forms key in <code className="font-mono">.env</code> to
            email submissions to {data.settings.contactEmail}.
          </p>
        ) : null}

        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="cf-name">Name *</label>
              <input
                id="cf-name"
                className={field("name")}
                name="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                onBlur={() => blur("name")}
                placeholder="Your full name"
              />
              {errors.name ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.name}</p> : null}
            </div>
            <div>
              <label className={labelClass} htmlFor="cf-phone">Phone *</label>
              <input
                id="cf-phone"
                className={field("phone")}
                name="phone"
                required
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                onBlur={() => blur("phone")}
                placeholder="+44 7700 900123"
              />
              {errors.phone ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.phone}</p> : null}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="cf-email">Email *</label>
              <input
                id="cf-email"
                className={field("email")}
                type="email"
                name="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                onBlur={() => blur("email")}
                placeholder="you@example.com"
              />
              {errors.email ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.email}</p> : null}
            </div>
            <div>
              <label className={labelClass} htmlFor="cf-subject">Subject *</label>
              <input
                id="cf-subject"
                className={field("subject")}
                name="subject"
                required
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                onBlur={() => blur("subject")}
                placeholder="What is this about?"
              />
              {errors.subject ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.subject}</p> : null}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="cf-message">Message *</label>
            <textarea
              id="cf-message"
              className={`${field("message")} min-h-[140px] resize-y`}
              name="message"
              required
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              onBlur={() => blur("message")}
              placeholder="Write your message here... (at least 10 characters)"
            />
            {errors.message ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.message}</p> : null}
          </div>

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="rounded-lg bg-brand px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send Message"}
          </button>

          <p className="border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-500">
            Alternatively, you can email{" "}
            <a href={`mailto:${data.settings.contactEmail}`} className="font-bold text-ink hover:underline">
              {data.settings.contactEmail}
            </a>{" "}
            or visit the Watling Community Centre on Sundays between{" "}
            <strong className="text-slate-700">10:00 am and 12:00 pm</strong> during term time.
          </p>
        </form>
      </section>
    </AppShell>
  );
}
