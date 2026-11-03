// Detects off-platform contact details (phones, wallets, bank/app mentions, emails)
const PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'phone number', re: /(?:\+?234|\b0)[\s-]?[789][01]\d(?:[\s-]?\d){7}\b/ },
  { label: 'phone number', re: /\+\d[\d\s-]{9,15}\d/ },
  { label: 'crypto wallet', re: /\b0x[a-fA-F0-9]{40}\b/ },
  { label: 'email address', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { label: 'bank details', re: /\b\d{10}\b/ },
  { label: 'outside payment app', re: /\b(whats\s?app|wa\.me|telegram|t\.me|opay|palmpay|moniepoint|kuda|account\s?(no|number))\b/i },
]

export function detectContactLeak(text: string): string | null {
  if (!text) return null
  for (const p of PATTERNS) if (p.re.test(text)) return p.label
  return null
}
