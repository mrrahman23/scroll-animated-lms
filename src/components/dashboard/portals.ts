import type { UserRole } from "@/types";

/** Sidebar icon keys are resolved in AppShell. */
export type NavIcon =
  | "dashboard" | "courses" | "browse" | "progress" | "assignments" | "assessments" | "certificates" | "payments"
  | "notifications" | "profile" | "settings" | "users" | "partners" | "verify" | "reports" | "content" | "students" | "lessons";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: NavIcon;
}

export interface PortalConfig {
  role: UserRole;
  title: string;
  home: string;
  nav: PortalNavItem[];
  secondary: PortalNavItem[];
}

export const portals: Record<UserRole, PortalConfig> = {
  student: {
    role: "student",
    title: "Student",
    home: "/dashboard",
    nav: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { label: "My Courses", href: "/dashboard/courses", icon: "courses" },
      { label: "Browse Courses", href: "/courses", icon: "browse" },
      { label: "Learning Progress", href: "/dashboard/progress", icon: "progress" },
      { label: "Assignments", href: "/dashboard/assignments", icon: "assignments" },
      { label: "Assessments", href: "/dashboard/assessments", icon: "assessments" },
      { label: "Certificates", href: "/dashboard/certificates", icon: "certificates" },
      { label: "Payments", href: "/dashboard/payments", icon: "payments" },
      { label: "Notifications", href: "/dashboard/notifications", icon: "notifications" },
    ],
    secondary: [
      { label: "Profile", href: "/dashboard/profile", icon: "profile" },
      { label: "Settings", href: "/dashboard/settings", icon: "settings" },
    ],
  },
  instructor: {
    role: "instructor",
    title: "Instructor",
    home: "/instructor",
    nav: [
      { label: "Dashboard", href: "/instructor", icon: "dashboard" },
      { label: "My Courses", href: "/instructor/courses", icon: "courses" },
      { label: "Students", href: "/instructor/students", icon: "students" },
      { label: "Grading", href: "/instructor/grading", icon: "assignments" },
    ],
    secondary: [{ label: "Settings", href: "/instructor/settings", icon: "settings" }],
  },
  partner: {
    role: "partner",
    title: "Training Partner",
    home: "/partner-portal",
    nav: [
      { label: "Dashboard", href: "/partner-portal", icon: "dashboard" },
      { label: "Organization Profile", href: "/partner-portal/profile", icon: "partners" },
      { label: "Courses", href: "/partner-portal/courses", icon: "courses" },
      { label: "Results", href: "/partner-portal/results", icon: "reports" },
      { label: "Certification Requests", href: "/partner-portal/requests", icon: "assessments" },
      { label: "Issued Certificates", href: "/partner-portal/certificates", icon: "certificates" },
    ],
    secondary: [{ label: "Settings", href: "/partner-portal/settings", icon: "settings" }],
  },
  admin: {
    role: "admin",
    title: "NYTI Administrator",
    home: "/admin",
    nav: [
      { label: "Overview", href: "/admin", icon: "dashboard" },
      { label: "Users", href: "/admin/users", icon: "users" },
      { label: "Certificates", href: "/admin/certificates", icon: "certificates" },
      { label: "Results", href: "/admin/results", icon: "reports" },
      { label: "Certification Requests", href: "/admin/requests", icon: "assessments" },
      { label: "Inbox", href: "/admin/inbox", icon: "notifications" },
      { label: "Payments", href: "/admin/payments", icon: "payments" },
      { label: "Verification Log", href: "/admin/verifications", icon: "verify" },
      { label: "Website", href: "/admin/content", icon: "content" },
      { label: "Courses", href: "/admin/content/courses", icon: "courses" },
      { label: "Partners", href: "/admin/content/partners", icon: "partners" },
    ],
    secondary: [{ label: "Settings", href: "/admin/settings", icon: "settings" }],
  },

};
