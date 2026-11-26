"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Wrench, CarFront, Package, ClipboardList, Users, Building2, LogOut, LockKeyhole, LayoutDashboard, ArrowUpRight, RefreshCw, Boxes } from "lucide-react";

type Profile = { user_id: string; username: string | null; full_name: string; role: "admin" | "supervisor" | "storekeeper"; site_id: string | null; is_active: boolean };
type Counts = { inGarage: number; openOrders: number; receivedToday: number; users: number };

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<Counts>({ inGarage: 0, openOrders: 0, receivedToday: 0, users: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState("overview");

  const configured = Boolean(supabase);
  const greeting = useMemo(() => profile?.full_name?.split(" ")[0] || profile?.username || "Team", [profile]);

  async function loadProfile() {
    if (!supabase) { setChecking(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); setChecking(false); return; }
    const { data, error } = await supabase.from("profiles").select("user_id,username,full_name,role,site_id,is_active").eq("user_id", user.id).single();
    if (error || !data || !data.is_active) {
      await supabase.auth.signOut();
      setProfile(null);
      setMessage(error?.message || "This account is inactive. Please contact Admin.");
    } else {
      setProfile(data as Profile);
      await loadCounts(data as Profile);
    }
    setChecking(false);
  }

  async function loadCounts(p: Profile) {
    if (!supabase) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const [vehicles, orders, receipts, users] = await Promise.all([
      supabase.from("vehicle_visits").select("id", { count: "exact", head: true }).eq("status", "IN"),
      supabase.from("parts_orders").select("id", { count: "exact", head: true }).in("status", ["ordered","partially_received"]),
      supabase.from("parts_receipts").select("id", { count: "exact", head: true }).gte("received_at", today.toISOString()),
      p.role === "admin" ? supabase.from("profiles").select("user_id", { count: "exact", head: true }) : Promise.resolve({count:0})
    ]);
    setCounts({ inGarage: vehicles.count || 0, openOrders: orders.count || 0, receivedToday: receipts.count || 0, users: users.count || 0 });
  }

  useEffect(() => { void loadProfile(); }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    if (!supabase) { setMessage("Supabase setup missing. Add the project URL and publishable key to .env.local."); return; }
    const id = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(id)) { setMessage("Enter a valid User ID."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: id + "@ptc-garage.local", password });
    if (error) setMessage("Login failed. Please check your User ID and password.");
    else await loadProfile();
    setLoading(false);
  }

  async function logout() { if (supabase) await supabase.auth.signOut(); setProfile(null); setPassword(""); setSection("overview"); }

  if (checking) return <main className="loading"><div className="spinner"/><span>Loading PTC Garage...</span></main>;

  if (!profile) return <main className="loginShell">
    <section className="loginVisual">
      <div className="brand"><div className="brandMark"><Wrench size={23}/></div><span>PTC <b>GARAGE</b></span></div>
      <div className="visualCopy"><span className="eyebrow">OPERATIONS MANAGEMENT</span><h1>One garage.<br/><em>Complete control.</em></h1><p>Manage vehicle movements, workshop activity and parts operations from one secure workspace.</p></div>
      <div className="visualFooter"><span>PTC GARAGE MANAGEMENT</span><span>SECURE WORKSPACE · 2026</span></div>
    </section>
    <section className="loginPanel"><div className="loginCard">
      <div className="mobileBrand"><div className="brandMark"><Wrench size={21}/></div><span>PTC <b>GARAGE</b></span></div>
      <span className="eyebrow dark">WELCOME BACK</span><h2>Sign in to your portal</h2><p className="muted">Use the User ID and password provided by your Admin.</p>
      <form onSubmit={login}>
        <label htmlFor="userid">USER ID</label><input id="userid" value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. ADMIN001" autoCapitalize="none" autoComplete="username" required/>
        <label htmlFor="password">PASSWORD</label><input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/>
        {message && <div className="alert">{message}</div>}
        <button className="primaryBtn" disabled={loading || !configured}>{loading ? "Signing in..." : "Sign in securely"} <ArrowUpRight size={18}/></button>
      </form>
      {!configured && <div className="setupHint">Setup required: add Supabase environment variables before running the site.</div>}
      <div className="loginBottom"><LockKeyhole size={14}/> Your account is protected by Supabase Authentication</div>
    </div></section>
  </main>;

  const isStore = profile.role === "storekeeper";
  const nav = isStore
    ? [{id:"overview",label:"Overview",icon:LayoutDashboard},{id:"orders",label:"Parts Orders",icon:Package},{id:"receipts",label:"Parts Received",icon:Boxes}]
    : [{id:"overview",label:"Overview",icon:LayoutDashboard},{id:"vehicles",label:"Vehicle IN / OUT",icon:CarFront},{id:"orders",label:"Parts Orders",icon:Package},{id:"receipts",label:"Parts Received",icon:Boxes},...(profile.role==="admin" ? [{id:"users",label:"User Management",icon:Users},{id:"sites",label:"Site Management",icon:Building2}] : [])];

  return <main className="appShell">
    <aside className="sidebar"><div className="brand sideBrand"><div className="brandMark"><Wrench size={21}/></div><span>PTC <b>GARAGE</b></span></div>
      <div className="sideLabel">WORKSPACE</div><nav>{nav.map(item=><button key={item.id} className={section===item.id?"navItem active":"navItem"} onClick={()=>setSection(item.id)}><item.icon size={18}/>{item.label}</button>)}</nav>
      <div className="sideBottom"><div className="userChip"><div className="avatar">{(profile.full_name||profile.username||"U").slice(0,1).toUpperCase()}</div><div><b>{profile.full_name}</b><small>{profile.role==="storekeeper"?"Store Keeper":profile.role==="admin"?"Administrator":"Supervisor"}</small></div></div><button className="logoutBtn" onClick={logout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    <section className="mainArea"><header className="topbar"><div><span className="eyebrow dark">PTC GARAGE / {section.toUpperCase()}</span><h2>{section==="overview"?"Dashboard":nav.find(n=>n.id===section)?.label}</h2></div><div className="topRight"><span className="liveDot"/> <span>System online</span><div className="topAvatar">{greeting.slice(0,1).toUpperCase()}</div></div></header>
      <div className="content">
        {section==="overview" && <>
          <div className="welcome"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Good day, {greeting}.</h1><p>Here is what is happening across your {profile.role==="admin"?"garage operations":profile.role==="supervisor"?"assigned site":"parts desk"}.</p></div><button className="refreshBtn" onClick={()=>loadCounts(profile)}><RefreshCw size={16}/> Refresh</button></div>
          <div className="statsGrid">
            {!isStore && <Stat icon={<CarFront/>} label="Vehicles in Garage" value={counts.inGarage} hint="Currently checked in"/>}
            <Stat icon={<ClipboardList/>} label="Open Parts Orders" value={counts.openOrders} hint="Awaiting completion"/>
            <Stat icon={<Package/>} label="Received Today" value={counts.receivedToday} hint="Parts receipt entries"/>
            {profile.role==="admin" && <Stat icon={<Users/>} label="Team Members" value={counts.users} hint="Registered accounts"/>}
          </div>
          <div className="sectionHeading"><div><h3>Quick access</h3><p>Go directly to your daily tasks</p></div></div>
          <div className="quickGrid">
            {!isStore && <Quick icon={<CarFront/>} title="Vehicle IN / OUT" desc="Register vehicles and manage garage releases" onClick={()=>setSection("vehicles")}/>}
            <Quick icon={<Package/>} title="Parts Orders" desc="View and manage parts requests" onClick={()=>setSection("orders")}/>
            <Quick icon={<Boxes/>} title="Parts Received" desc="Review parts receiving records" onClick={()=>setSection("receipts")}/>
            {profile.role==="admin" && <Quick icon={<Users/>} title="User Management" desc="Create and manage team accounts" onClick={()=>setSection("users")}/>}
          </div>
          <div className="notice"><LockKeyhole size={18}/><div><b>Role-based access is enabled</b><p>{isStore?"Your portal is limited to parts orders and receiving. Vehicle records are not available to this account.":profile.role==="supervisor"?"You can manage vehicle and parts operations for your assigned site.":"You have administrator access to all sites and modules."}</p></div></div>
        </>}
        {section!=="overview" && <div className="comingCard"><div className="comingIcon"><Wrench size={25}/></div><span className="eyebrow dark">MODULE READY FOR NEXT BUILD STEP</span><h2>{nav.find(n=>n.id===section)?.label}</h2><p>The dashboard shell and role permissions are in place. This module will be connected to the live Supabase tables in the next build step.</p><button className="textBtn" onClick={()=>setSection("overview")}>Back to overview <ArrowUpRight size={16}/></button></div>}
      </div>
    </section>
  </main>;
}

function Stat({icon,label,value,hint}:{icon:React.ReactNode;label:string;value:number;hint:string}) { return <div className="statCard"><div className="statTop"><span>{label}</span><i>{icon}</i></div><strong>{value.toLocaleString()}</strong><small>{hint}</small></div>; }
function Quick({icon,title,desc,onClick}:{icon:React.ReactNode;title:string;desc:string;onClick:()=>void}) { return <button className="quickCard" onClick={onClick}><i>{icon}</i><b>{title}</b><span>{desc}</span><ArrowUpRight className="quickArrow" size={18}/></button>; }