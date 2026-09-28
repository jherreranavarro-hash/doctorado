export function FolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <path
        d="M3.5 7.2a2 2 0 0 1 2-2h3.8l1.8 2h7.4a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.2Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

export function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.3 19.2c.8-3 3-4.7 5.7-4.7s4.9 1.7 5.7 4.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 5.3a3.2 3.2 0 0 1 0 6.3" strokeLinecap="round" />
      <path d="M17.2 14.6c2.3.4 4 1.9 4.6 4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AcademicCapIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <path d="M2.5 9.5 12 5l9.5 4.5-9.5 4.5-9.5-4.5Z" strokeLinejoin="round" />
      <path d="M6.5 11.6v4.2c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4.2" strokeLinejoin="round" />
      <path d="M21.5 9.5v5.4" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path d="M9 5.5 15.5 12 9 18.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
