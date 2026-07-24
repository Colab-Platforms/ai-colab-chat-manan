import prisma from "@root/prisma.js";
import { sendEmail } from "@/utils/email.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import {
  getPaginationOptions,
  formatPaginationResponse,
} from "@/utils/paginationUtils.js";
import { buildPrismaQuery } from "prisma-qb";

const getSupportInbox = () =>
  process.env.SUPPORT_INBOX_EMAIL || "support@colabplatforms.com";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderRequestEmail = ({
  heading,
  fields,
  message,
}: {
  heading: string;
  fields: { label: string; value: string }[];
  message: string;
}) => {
  const fieldsHtml = fields
    .map(
      (f) =>
        `<p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.value)}</p>`,
    )
    .join("");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f5f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 12px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:700;font-size:18px;">
          ${escapeHtml(heading)}
        </div>
        <div style="padding:24px;">
          ${fieldsHtml}
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Message</p>
            <p style="margin:0;font-size:14px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(message)}</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    heading,
    ...fields.map((f) => `${f.label}: ${f.value}`),
    "",
    "Message:",
    message,
  ].join("\n");

  return { html, text };
};

export const submitTicket = async (
  data: {
    name: string;
    email: string;
    category?: string;
    subject: string;
    message: string;
  },
  userId?: number,
) => {
  const template = renderRequestEmail({
    heading: "New Support Ticket",
    fields: [
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      { label: "Category", value: data.category || "General" },
      { label: "Subject", value: data.subject },
    ],
    message: data.message,
  });

  const record = await prisma.supportRequest.create({
    data: {
      userId: userId ?? null,
      type: "TICKET",
      name: data.name,
      email: data.email,
      category: data.category || null,
      subject: data.subject,
      message: data.message,
    },
  });

  await sendEmail({
    to: getSupportInbox(),
    subject: `[Support Ticket] ${data.subject}`,
    html: template.html,
    text: template.text,
  });

  return record;
};

export const submitContactMessage = async (
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  },
  userId?: number,
) => {
  const template = renderRequestEmail({
    heading: "New Contact Us Message",
    fields: [
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      { label: "Subject", value: data.subject },
    ],
    message: data.message,
  });

  const record = await prisma.supportRequest.create({
    data: {
      userId: userId ?? null,
      type: "CONTACT",
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    },
  });

  await sendEmail({
    to: getSupportInbox(),
    subject: `[Contact Us] ${data.subject}`,
    html: template.html,
    text: template.text,
  });

  return record;
};

export const listSupportRequests = async (
  type: "TICKET" | "CONTACT",
  query: any,
) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 10);

  const { where: qbWhere, orderBy } = buildPrismaQuery({
    query,
    searchFields: [
      { field: "name" },
      { field: "email" },
      { field: "subject" },
    ],
    filterFields: [{ key: "status", field: "status", type: "string" }],
    sortFields: [
      { key: "createdAt", field: "createdAt" },
      { key: "name", field: "name" },
      { key: "status", field: "status" },
    ],
    defaultSort: { key: "createdAt", order: "desc" },
    allowedQueryKeys: ["page", "pageSize"],
  });

  const where = { ...qbWhere, type };

  const [requests, totalRecords] = await Promise.all([
    prisma.supportRequest.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.supportRequest.count({ where }),
  ]);

  return formatPaginationResponse(requests, totalRecords, page, pageSize);
};

export const updateSupportRequestStatus = async (
  id: number,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
) => {
  const existing = await prisma.supportRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Support request not found", STATUS_CODES.NOT_FOUND);
  }

  return prisma.supportRequest.update({ where: { id }, data: { status } });
};
