export interface InvoiceTemplateData {
  logoDataUri: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  billingCycle: string | null;
  paymentType: string;
  amount: string;
  currency: string;
}

export const invoiceTemplate = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { height: 28px; width: auto; }
  .brand-name { font-size: 18px; font-weight: bold; letter-spacing: -0.01em; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 22px; font-weight: bold; }
  .meta-line { color: #666; font-size: 12px; margin-top: 3px; }
  .status-badge { display: inline-block; margin-top: 8px; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: bold; letter-spacing: 0.03em; }
  .status-PAID { background: #e3f6ea; color: #1a7f4b; border: 1px solid #b7e6c8; }
  .status-PENDING { background: #fff4e0; color: #a15c00; border: 1px solid #ffdd9e; }
  .status-FAILED { background: #fde8e8; color: #b42318; border: 1px solid #f6c1c1; }
  .parties { display: flex; justify-content: space-between; margin-top: 28px; gap: 24px; }
  .party { flex: 1; }
  .label { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .value { font-size: 13px; line-height: 1.5; }
  .value strong { font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 32px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
  th { color: #888; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  .total-row td { font-weight: bold; font-size: 15px; border-top: 2px solid #1a1a1a; border-bottom: none; padding-top: 14px; }
  .footer { margin-top: 56px; padding-top: 16px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; gap: 24px; }
  .footer-address { font-size: 12px; color: #444; line-height: 1.6; }
  .footer-address strong { display: block; font-size: 13px; color: #1a1a1a; margin-bottom: 2px; }
  .footer-note { font-size: 11px; color: #999; text-align: right; max-width: 260px; line-height: 1.6; }
  .thank-you { text-align: center; margin-top: 24px; font-size: 12px; color: #888; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="<%= logoDataUri %>" alt="Colab Platforms" />
      <span class="brand-name">colabplatforms.ai</span>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">INVOICE</div>
      <div class="meta-line">#<%= invoiceNumber %></div>
      <div class="meta-line"><%= invoiceDate %></div>
      <div class="status-badge status-<%= status %>"><%= status %></div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="label">Billed to</div>
      <div class="value">
        <strong><%= customerName %></strong><br />
        <%= customerEmail %>
      </div>
    </div>
    <div class="party" style="text-align: right;">
      <div class="label">From</div>
      <div class="value">
        <strong>Colab Platforms</strong><br />
        B-202, Takshashila, Samant Estate,<br />
        Goregaon East, Mumbai - 400063
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Type</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <%= planName %>
          <% if (billingCycle) { %> (<%= billingCycle %>)<% } %>
        </td>
        <td><%= paymentType === "RECURRING" ? "Subscription renewal" : "One-time payment" %></td>
        <td style="text-align: right;"><%= currency %> <%= amount %></td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Total</td>
        <td style="text-align: right;"><%= currency %> <%= amount %></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-address">
      <strong>Colab Platforms</strong>
      B-202, Takshashila, Samant Estate,<br />
      Goregaon East, Mumbai - 400063
    </div>
    <div class="footer-note">
      This is a system-generated invoice for your Colab Platforms
      subscription and does not require a physical signature. For billing
      queries, contact support@colabplatforms.ai and reference the invoice
      number above.
    </div>
  </div>

  <div class="thank-you">Thank you for building with Colab Platforms</div>
</body>
</html>
`;
