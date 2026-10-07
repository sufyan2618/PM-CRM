export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 32 32" fill="none"><path d="M16 16V5a5 5 0 1 0-5 5h10a5 5 0 1 0-5-5v22a5 5 0 1 0 5-5H11a5 5 0 1 0 5 5V16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}

export function Brand() {
  return <span className="brand-lockup"><BrandMark/><span>NovaWorks<span className="brand-dot">.</span></span></span>;
}
