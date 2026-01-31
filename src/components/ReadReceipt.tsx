import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptProps {
  isRead: boolean;
  isSent?: boolean;
  className?: string;
}

export function ReadReceipt({ isRead, isSent = true, className = '' }: ReadReceiptProps) {
  if (!isSent) return null;

  return (
    <span className={`inline-flex items-center ${className}`}>
      {isRead ? (
        <CheckCheck className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Check className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </span>
  );
}
