/* --------------------------- email service -------------------------------- */
//
// Sends emails via Google Apps Script (deployed as a web app by the admin).
// The Apps Script URL and secret token are stored in .env — never expose
// email credentials in the frontend.
//
// All emails are sent FROM: classroom@nlccuk.com (configured in the Apps Script).
//
// SETUP:
//   1. Go to script.google.com → New project
//   2. Paste the code from google-apps-script.gs
//   3. Deploy → Web app → Execute as: me → Anyone
//   4. Copy the deployment URL into .env as VITE_APPS_SCRIPT_URL
//   5. Set VITE_EMAIL_SECRET to match the SECRET in the script

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined;
const EMAIL_SECRET = import.meta.env.VITE_EMAIL_SECRET as string | undefined;

export const EMAIL_FROM_NAME = "Nepalese Language and Culture Centre (NLCC)";
export const ENQUIRY_EMAIL = "enquiry@nlccuk.com";

export interface EmailPayload {
  to: string;
  subject: string;
  body: string; // plain text or HTML
  isHtml?: boolean;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  if (!APPS_SCRIPT_URL || !EMAIL_SECRET) {
    return { ok: false, error: "Email service not configured. Set VITE_APPS_SCRIPT_URL and VITE_EMAIL_SECRET in .env" };
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: EMAIL_SECRET,
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        isHtml: payload.isHtml || false,
      }),
    });

    const data = await response.json() as { success?: boolean; error?: string };
    if (data.success) return { ok: true };
    return { ok: false, error: data.error || "Email sending failed." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error." };
  }
}

export const isEmailConfigured = Boolean(APPS_SCRIPT_URL && EMAIL_SECRET);

/* ------------------------- pre-built email helpers ------------------------ */

export async function sendStudentInvitation(opts: {
  parentName: string;
  parentEmail: string;
  studentName: string;
  studentEmail: string;
  className: string;
}): Promise<{ ok: boolean; error?: string }> {
  const body = [
    `Hello ${opts.parentName},`,
    "",
    `Your child ${opts.studentName} has been added to the NLCC class "${opts.className}".`,
    "",
    "To access the Student Portal:",
    `1. Go to the NLCC website and click "Student Login"`,
    `2. Click "Sign in with Google"`,
    `3. Sign in with the Google account: ${opts.studentEmail}`,
    "",
    "If you have any issues, please contact your teacher.",
    "",
    `— ${EMAIL_FROM_NAME}`,
  ].join("\n");

  return sendEmail({ to: opts.parentEmail, subject: `NLCC Student Portal — ${opts.studentName}'s account`, body });
}

export async function sendTeacherInvitation(opts: {
  teacherName: string;
  teacherEmail: string;
  orgName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const body = [
    `Hello ${opts.teacherName},`,
    "",
    `You have been added as a teacher for ${opts.orgName} on the NLCC Portal.`,
    "",
    "To access the Teacher Portal:",
    `1. Go to the NLCC website and click "Teacher Login"`,
    `2. Click "Sign in with Google"`,
    `3. Sign in with your Google account: ${opts.teacherEmail}`,
    "",
    `— ${EMAIL_FROM_NAME}`,
  ].join("\n");

  return sendEmail({ to: opts.teacherEmail, subject: `NLCC Teacher Portal — Your account`, body });
}

export async function sendContactEmail(opts: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const body = [
    `New enquiry from the NLCC website.`,
    "",
    `Name: ${opts.name}`,
    `Email: ${opts.email}`,
    `Phone: ${opts.phone}`,
    `Subject: ${opts.subject}`,
    "",
    `Message:`,
    opts.message,
  ].join("\n");

  // Contact emails go to enquiry@nlccuk.com
  // Reply-to is the sender's email
  return sendEmail({ to: ENQUIRY_EMAIL, subject: `[NLCC Contact] ${opts.subject}`, body });
}

export async function sendCustomEmail(opts: {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({ to: opts.to, subject: opts.subject, body: opts.body, isHtml: opts.isHtml });
}
