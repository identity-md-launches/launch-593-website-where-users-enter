import { Bot, Boxes, Code2, Sprout, Asterisk, Terminal } from 'lucide-react';

export function FrogMark({ className = '' }: { className?: string }) {
  return <svg className={className} width="40" height="40" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M13 30c-3-18 18-19 19-7 4-13 23-10 20 7 8 21-4 25-20 25S5 48 13 30" fill="currentColor"/><ellipse cx="23" cy="27" rx="7" ry="8" fill="#f7f8ef"/><ellipse cx="42" cy="27" rx="7" ry="8" fill="#f7f8ef"/><circle cx="25" cy="29" r="3" fill="#11291d"/><circle cx="40" cy="29" r="3" fill="#11291d"/><path d="M18 42q14 12 29-1" stroke="#11291d" strokeWidth="3" strokeLinecap="round"/></svg>;
}
export function XMark() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-7.4L5.5 22H2.3l7.3-8.5L.8 2h6.5l4.4 6.7L18.9 2ZM17.8 20h1.7L6.4 3.9H4.6L17.8 20Z"/></svg>; }
export function ProjectMark({ index = 0 }: { index?: number }) {
  const Icon = [Bot, Boxes, Code2, Sprout, Asterisk, Terminal][index % 6];
  return <span className={`project-mark mark-${index % 6}`}><Icon size={27} strokeWidth={1.8} aria-hidden="true" /></span>;
}
