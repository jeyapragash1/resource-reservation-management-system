"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/types";
import { api } from "@/lib/client";
import { Brand, Icon } from "./icon";
export function Shell({ user, children }: { user: User; children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [error, setError] = useState(""), [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try { await api("/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }
    catch (error) { setError((error as Error).message); setPending(false); }
  }
  const links = [["/overview", "Dashboard", "home"], ["/resources", "Resources", "resources"], ["/reservations", "My Reservations", "reservations"], ["/calendar", "Calendar", "calendar"], ["/reports", "Reports", "reports"], ...(user.role === "admin" ? [["/manage", "Manage Resources", "resources"]] : []), ["/settings", "Settings", "settings"]];
  return <div className="app-shell"><a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar"><Link href="/overview"><Brand /></Link><nav aria-label="Main navigation">{links.map(([href,label,icon]) => <Link key={href} href={href} className={path === href ? "active" : ""} aria-current={path === href ? "page" : undefined}><Icon name={icon} />{label}</Link>)}</nav><div className="sidebar-note"><span className="status-dot"/>Shared organization workspace<p>Booking times are in Sri Lanka<br/>UTC +05:30</p></div><div className="sidebar-bottom"><span className="small muted">Resource Reservation System</span></div></aside>
    <div className="main-area"><header className="topbar"><span className="timezone"><Icon name="clock"/> Sri Lanka time</span><div className="profile"><div className="avatar">{user.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</div><div><strong>{user.name}</strong><span>{user.role === "admin" ? "Administrator" : "Employee"}</span></div><button className="logout" onClick={logout} disabled={pending} aria-label="Sign out"><Icon name="logout"/></button></div></header>{error && <p className="notice error" role="alert">{error}</p>}<main id="main">{children}</main></div>
  </div>;
}
