import type { CSSProperties } from "react";

const sm: CSSProperties = { width: 14, height: 14 };
const md: CSSProperties = { width: 16, height: 16 };

export function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={sm}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function DocIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={sm}>
      <path d="M3 1.5h7L13 4.5V14a.5.5 0 01-.5.5h-9A.5.5 0 013 14V2a.5.5 0 010-.5z" />
      <path d="M9.5 1.5v3h3M5.5 7.5h5M5.5 10.5h5" />
    </svg>
  );
}

export function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" style={md}>
      <path d="M8 0C3.6 0 0 3.6 0 8c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.2-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 014 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.6v2.3c0 .2.1.5.5.4 3.2-1.1 5.5-4.1 5.5-7.6C16 3.6 12.4 0 8 0z" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 13, height: 13 }}>
      <path d="M8 1.5L2.5 3.5V8c0 3 2.4 5.5 5.5 6.5 3.1-1 5.5-3.5 5.5-6.5V3.5L8 1.5z" />
      <path d="M5.5 8l1.8 1.8L10.5 6.5" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 1v10M1 6h10" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.4h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.5 2.7-3.8 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 15.9 5.5 18 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2.1.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.8 8.5c0-1.6 1.3-2.4 1.4-2.5-.8-1.1-1.9-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.7 1.7-1.2 2-.3 5 .8 6.6.6.8 1.2 1.7 2.1 1.6.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5c.9 0 1.5-.8 2.1-1.6.7-.9 1-1.8 1-1.8s-1.9-.8-2-2.7zM10.2 3.4c.4-.5.7-1.3.6-2-.6 0-1.4.4-1.9.9-.4.5-.7 1.2-.6 2 .7.1 1.4-.4 1.9-.9z" />
    </svg>
  );
}

export function KeyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.6 7.6a5 5 0 11-7 7 5 5 0 017-7zm0 0L15.5 7.5M19 4l3 3" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  );
}

export function RecvIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

export function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export function ArrowDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

export function ArrowUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function Bars() {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="currentColor">
      <rect x="0" y="6" width="3" height="4" rx="1" />
      <rect x="5" y="4" width="3" height="6" rx="1" />
      <rect x="10" y="2" width="3" height="8" rx="1" />
      <rect x="15" y="0" width="3" height="10" rx="1" />
    </svg>
  );
}

export function Wifi() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
      <path d="M7 9.5a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm-3-3a4.2 4.2 0 016 0l-1 1a2.8 2.8 0 00-4 0l-1-1zm-2.5-2.5a7.7 7.7 0 0111 0l-1 1a6.3 6.3 0 00-9 0l-1-1z" />
    </svg>
  );
}

export function Battery() {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor">
      <rect x="0.5" y="0.5" width="18" height="9" rx="2" />
      <rect x="2" y="2" width="14" height="6" fill="currentColor" />
      <rect x="20" y="3" width="2" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}
