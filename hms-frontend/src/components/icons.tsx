import React from "react";

export type IconName =
  | "dashboard" | "patients" | "appointments" | "queue" | "beds" | "lab"
  | "pharmacy" | "departments" | "payments" | "reports" | "announcements"
  | "users" | "audit" | "mail" | "settings" | "dots" | "logout" | "profile" | "plus" | "briefcase";

function Svg({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  switch (name) {
    case "dashboard":
      return <Svg size={size}><rect key="top-left" x="3" y="3" width="7" height="7" rx="1.5" /><rect key="top-right" x="14" y="3" width="7" height="7" rx="1.5" /><rect key="bottom-left" x="3" y="14" width="7" height="7" rx="1.5" /><rect key="bottom-right" x="14" y="14" width="7" height="7" rx="1.5" /></Svg>;
    case "patients":
      return <Svg size={size}><path key="body" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle key="head" cx="9" cy="7" r="4" /><path key="second-body" d="M23 21v-2a4 4 0 0 0-3-3.87" /><path key="second-head" d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
    case "appointments":
      return <Svg size={size}><rect key="calendar" x="3" y="4" width="18" height="18" rx="2" /><path key="calendar-header" d="M16 2v4M8 2v4M3 10h18" /></Svg>;
    case "queue":
      return <Svg size={size}><path key="check" d="M9 11l3 3L22 4" /><path key="list" d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></Svg>;
    case "beds":
      return <Svg size={size}><path key="left" d="M2 4v16" /><path key="bed" d="M2 8h18a2 2 0 0 1 2 2v10" /><path key="base" d="M2 17h20" /><path key="pillow" d="M6 8v9" /></Svg>;
    case "lab":
      return <Svg size={size}><path key="flask" d="M10 2v7.5a2 2 0 0 1-.2.9L4.7 20.5a1 1 0 0 0 .9 1.5h12.8a1 1 0 0 0 .9-1.5L14.2 10.4a2 2 0 0 1-.2-.9V2" /><path key="top" d="M8.5 2h7" /><path key="liquid" d="M7 16h10" /></Svg>;
    case "pharmacy":
      return <Svg size={size}><path key="capsule" d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path key="divider" d="m8.5 8.5 7 7" /></Svg>;
    case "departments":
      return <Svg size={size}><path key="main-building" d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path key="left-building" d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path key="right-building" d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path key="windows" d="M10 6h4M10 10h4M10 14h4M10 18h4" /></Svg>;
    case "payments":
      return <Svg size={size}><rect key="card" x="2" y="5" width="20" height="14" rx="2" /><path key="stripe" d="M2 10h20" /></Svg>;
    case "reports":
      return <Svg size={size}><path key="axes" d="M3 3v18h18" /><path key="bar-one" d="M18 17V9" /><path key="bar-two" d="M13 17V5" /><path key="bar-three" d="M8 17v-3" /></Svg>;
    case "announcements":
      return <Svg size={size}><path key="megaphone" d="m3 11 18-5v12L3 14v-3z" /><path key="handle" d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></Svg>;
    case "users":
      return <Svg size={size}><path key="shield" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></Svg>;
    case "audit":
      return <Svg size={size}><path key="check-one" d="m3 17 2 2 4-4" /><path key="check-two" d="m3 7 2 2 4-4" /><path key="lines" d="M13 6h8M13 12h8M13 18h8" /></Svg>;
    case "mail":
      return <Svg size={size}><rect key="envelope" x="2" y="4" width="20" height="16" rx="2" /><path key="flap" d="m22 7-10 6L2 7" /></Svg>;
    case "settings":
      return <Svg size={size}><path key="track-one" d="M4 21v-7" /><path key="track-two" d="M4 10V3" /><path key="track-three" d="M12 21v-9" /><path key="track-four" d="M12 8V3" /><path key="track-five" d="M20 21v-5" /><path key="track-six" d="M20 12V3" /><path key="control-one" d="M2 14h4" /><path key="control-two" d="M10 8h4" /><path key="control-three" d="M18 16h4" /></Svg>;
    case "dots":
      return <Svg size={size}><circle key="left" cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle key="center" cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle key="right" cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></Svg>;
    case "logout":
      return <Svg size={size}><path key="door" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline key="arrow-head" points="16 17 21 12 16 7" /><line key="arrow-stem" x1="21" x2="9" y1="12" y2="12" /></Svg>;
    case "profile":
      return <Svg size={size}><circle key="head" cx="12" cy="8" r="4" /><path key="body" d="M20 21a8 8 0 0 0-16 0" /></Svg>;
    case "plus":
      return <Svg size={size}><path key="plus" d="M12 5v14M5 12h14" /></Svg>;
    case "briefcase":
      return <Svg size={size}><rect key="case" x="2" y="7" width="20" height="14" rx="2" /><path key="handle" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></Svg>;
  }
}