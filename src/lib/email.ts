/* --------------------------------- email ---------------------------------- */
//
// Sends contact-form submissions as a real email — used by the Contact page.
//
// This is a static single-page site (no server), so we send via Web3Forms,
// a free service built exactly for this: you POST the form data to their API
// and they email it to the address registered with your access key. No backend
// required, and the public "access key" is safe to ship in the client bundle.
//
// SETUP (see SETUP.md):
//   1. Go to https://web3forms.com and enter bhola.paneru@nlccuk.com
//   2. Copy the access key you receive by email
//   3. Put it in .env as VITE_WEB3FORMS_KEY=<your-key>
//
// If no key is set, submissions still save into the Admin > Contact Messages
// inbox (and the user is told email delivery isn't configured yet).

const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
export const EMAIL_ENABLED = Boolean(ACCESS_KEY && ACCESS_KEY.trim());

export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

export type SendStatus = "ok" | "skipped" | "error";

export interface SendResult {
  status: SendStatus;
  message: string;
}

/** Build a nicely formatted, human-readable message body for the email. */
function buildBody(p: ContactPayload): string {
  return [
    "New enquiry submitted via the NLCC Contact Us page.",
    "",
    "Name:    " + p.name,
    "Email:   " + p.email,
    "Phone:   " + p.phone,
    "Subject: " + p.subject,
    "",
    "Message:",
    p.message,
    "",
    "— Sent automatically from nepali-language-and-culture-centre website",
  ].join("\n");
}

export async function sendContactEmail(payload: ContactPayload): Promise<SendResult> {
  if (!EMAIL_ENABLED) {
    return {
      status: "skipped",
      message: "Email delivery is not configured yet, but your message has been saved.",
    };
  }

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject: `[NLCC Contact] ${payload.subject}`,
        from_name: "NLCC Website",
        // Reply-to the person who filled in the form.
        name: payload.name,
        email: payload.email,
        // Web3Forms maps these named fields into the email body automatically.
        phone: payload.phone,
        message: buildBody(payload),
      }),
    });

    const data = (await res.json()) as { success?: boolean; message?: string };

    if (data.success) {
      return { status: "ok", message: "Thank you. Your message has been sent." };
    }
    return {
      status: "error",
      message: data.message || "Could not send the email. Your message was still saved.",
    };
  } catch {
    return {
      status: "error",
      message: "Network error — your message was saved but the email may not have been sent.",
    };
  }
}

/* --------------------- student login details to parent --------------------- */
//
// When an admin adds a student, this emails the parent the child's login
// details so they can sign in to the student portal at /students.

export async function sendStudentLoginEmail(opts: {
  parentName: string;
  parentEmail: string;
  studentName: string;
  studentEmail: string;
  password: string;
  className: string;
}): Promise<boolean> {
  if (!EMAIL_ENABLED) return false;
  const body = [
    `Hello ${opts.parentName},`,
    "",
    `Your child ${opts.studentName} has been added to the NLCC class "${opts.className}".`,
    "",
    "Student Portal login details:",
    "Email:    " + opts.studentEmail,
    "Password: " + opts.password,
    "",
    "Sign in at the Student Portal link on the website (/students).",
    "Please keep these details safe.",
    "",
    "— Nepalese Language and Culture Centre",
  ].join("\n");

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject: `[NLCC] ${opts.studentName}'s student portal login`,
        from_name: "NLCC",
        name: opts.parentName,
        email: opts.parentEmail,
        message: body,
      }),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

