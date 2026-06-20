import { jsPDF } from 'jspdf';

export interface ContractPdfInput {
  id: string;
  title: string;
  scope: string;
  contract_type: 'fixed' | 'hourly';
  total_amount: number;
  hourly_rate?: number | null;
  weekly_cap_hours?: number | null;
  deposit_amount: number;
  deadline?: string | null;
  created_at: string;
  client_name: string;
  expert_name: string;
  client_signature?: string | null;
  expert_signature?: string | null;
  client_signed_at?: string | null;
  expert_signed_at?: string | null;
}

export function buildContractPdf(c: ContractPdfInput): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 48;
  let y = M;
  const W = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('NaijaLancers Hire Contract', M, y); y += 28;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Contract ID: ${c.id}`, M, y); y += 14;
  doc.text(`Issued: ${new Date(c.created_at).toLocaleString()}`, M, y); y += 20;

  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(c.title, M, y); y += 22;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Parties', M, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`Client:  ${c.client_name}`, M, y); y += 14;
  doc.text(`Expert:  ${c.expert_name}`, M, y); y += 22;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Engagement Type', M, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  if (c.contract_type === 'fixed') {
    doc.text(`Fixed-price contract`, M, y); y += 14;
    doc.text(`Total: NC ${c.total_amount.toLocaleString()} (escrowed at signing)`, M, y); y += 14;
  } else {
    doc.text(`Hourly contract`, M, y); y += 14;
    doc.text(`Rate: NC ${(c.hourly_rate || 0).toLocaleString()} / hour`, M, y); y += 14;
    if (c.weekly_cap_hours) { doc.text(`Weekly cap: ${c.weekly_cap_hours} hours`, M, y); y += 14; }
    doc.text(`Initial deposit (escrowed at signing): NC ${c.deposit_amount.toLocaleString()}`, M, y); y += 14;
  }
  if (c.deadline) { doc.text(`Deadline: ${new Date(c.deadline).toLocaleDateString()}`, M, y); y += 14; }
  y += 8;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Scope of Work', M, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const lines = doc.splitTextToSize(c.scope || '—', W - M * 2);
  lines.forEach((l: string) => { doc.text(l, M, y); y += 13; });
  y += 8;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Terms', M, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const terms = [
    '1. Funds are held in escrow by NaijaLancers and released to the Expert only upon Client approval or completion.',
    '2. 5% platform fee applies to the released amount. Refunds for cancellations return remaining escrow to the Client.',
    '3. Either party may open a dispute via the in-app dispute flow; outcomes are governed by NaijaLancers Terms.',
    '4. Hourly engagements: the Expert agrees not to bill above the weekly cap without written approval.',
    '5. Electronic signatures below have the same legal effect as handwritten signatures.',
  ];
  terms.forEach(t => {
    const ls = doc.splitTextToSize(t, W - M * 2);
    ls.forEach((l: string) => { doc.text(l, M, y); y += 12; });
    y += 2;
  });
  y += 14;

  // Signatures
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Signatures', M, y); y += 18;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const colW = (W - M * 2 - 24) / 2;
  doc.line(M, y + 30, M + colW, y + 30);
  doc.line(M + colW + 24, y + 30, W - M, y + 30);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(14);
  doc.text(c.client_signature || '_____________', M + 6, y + 24);
  doc.text(c.expert_signature || '_____________', M + colW + 30, y + 24);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Client • ${c.client_name}`, M, y + 46);
  doc.text(`Expert • ${c.expert_name}`, M + colW + 24, y + 46);
  if (c.client_signed_at) doc.text(`Signed: ${new Date(c.client_signed_at).toLocaleString()}`, M, y + 60);
  if (c.expert_signed_at) doc.text(`Signed: ${new Date(c.expert_signed_at).toLocaleString()}`, M + colW + 24, y + 60);

  return doc.output('blob');
}

export function downloadContractPdf(c: ContractPdfInput) {
  const blob = buildContractPdf(c);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `contract-${c.id}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
