import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function TypingIndicator({ userName, className = '' }: TypingIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-muted-foreground text-sm ${className}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 bg-primary/60 rounded-full"
            animate={{
              y: [0, -4, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      <span className="text-xs">
        {userName ? `${userName} is typing...` : 'typing...'}
      </span>
    </div>
  );
}
