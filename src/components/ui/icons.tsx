import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 18, ...p }: P) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

export const Sun = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const Moon = (p: P) => (<svg {...base(p)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>);
export const SoundOn = (p: P) => (<svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>);
export const SoundOff = (p: P) => (<svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m17 9 5 6M22 9l-5 6" /></svg>);
export const MotionOn = (p: P) => (<svg {...base(p)}><path d="M3 12c3-6 6-6 9 0s6 6 9 0" /></svg>);
export const MotionOff = (p: P) => (<svg {...base(p)}><path d="M3 12h18" /></svg>);
export const ArrowUpRight = (p: P) => (<svg {...base(p)}><path d="M7 17 17 7M8 7h9v9" /></svg>);
export const ArrowDown = (p: P) => (<svg {...base(p)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>);
export const Download = (p: P) => (<svg {...base(p)}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>);
export const Mail = (p: P) => (<svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
export const Phone = (p: P) => (<svg {...base(p)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>);
export const LinkedIn = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></svg>);
export const GitHub = (p: P) => (<svg {...base(p)}><path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.6a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.5 0C5.9 1 4.8 1.3 4.8 1.3a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 3.3 8.5c0 5.1 3 6.3 6 6.6a3 3 0 0 0-.9 2.4V21" /></svg>);
export const Close = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const Expand = (p: P) => (<svg {...base(p)}><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>);
export const Collapse = (p: P) => (<svg {...base(p)}><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" /></svg>);
export const Send = (p: P) => (<svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const Terminal = (p: P) => (<svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M12 15h5" /></svg>);
export const Plus = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const Reticle = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="7" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="1" /></svg>);
