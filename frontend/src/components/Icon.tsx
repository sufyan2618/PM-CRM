import type { SVGProps } from "react";

const paths = {
  sparkles: ["m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z", "M20 2v4M18 4h4"],
  arrow: ["M4 12h16M14 6l6 6-6 6"],
  diagonal: ["M6 18 18 6M6 6h12v12"],
  grid: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  folder: ["M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87"],
  check: ["m5 12 4 4L19 6"],
  calendar: ["M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"],
  clock: ["M12 8v4l3 2"],
  shield: ["M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z", "m8 12 3 3 5-6"],
  mail: ["M4 4h16a1 1 0 0 1 1 1v14H3V5a1 1 0 0 1 1-1Z", "m3 5 9 7 9-7"],
  lock: ["M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"],
  eyeOff: ["M3 3 21 21M10 5a13 13 0 0 1 2 0c6.5 0 10 7 10 7a17 17 0 0 1-3 4M6 6a20 20 0 0 0-4 6s3.5 7 10 7a12 12 0 0 0 5-1"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  close: ["m6 6 12 12M6 18 18 6"],
  logout: ["M9 4H4v16h5M9 12h12M17 8l4 4-4 4"],
  file: ["M13 2H5v20h14V8l-6-6ZM13 2v6h6M8 12h8M8 16h6"],
  search: ["m16 16 5 5"],
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name].map((path, index) => <path d={path} key={index} />)}
      {name === "users" && <circle cx="9" cy="7" r="4" />}
      {name === "clock" && <circle cx="12" cy="12" r="9" />}
      {name === "eye" && <circle cx="12" cy="12" r="3" />}
      {name === "search" && <circle cx="10.5" cy="10.5" r="6.5" />}
    </svg>
  );
}
