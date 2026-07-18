export interface InvoiceTemplateData {
  invoiceNumber: string;
  invoiceDate: string;
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
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: bold; }
  .invoice-title { font-size: 28px; font-weight: bold; text-align: right; }
  .meta { text-align: right; color: #555; font-size: 13px; margin-top: 4px; }
  .section { margin-top: 32px; }
  .label { color: #777; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .value { font-size: 14px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
  th { color: #777; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  .total-row td { font-weight: bold; font-size: 15px; border-top: 2px solid #1a1a1a; border-bottom: none; }
  .footer { margin-top: 48px; color: #999; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">AI Colab Chat</div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="meta">#<%= invoiceNumber %></div>
      <div class="meta"><%= invoiceDate %></div>
    </div>
  </div>

  <div class="section">
    <div class="label">Billed to</div>
    <div class="value"><%= customerName %></div>
    <div class="value"><%= customerEmail %></div>
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

  <div class="footer">This is a system-generated invoice and does not require a signature.</div>
</body>
</html>
`;
