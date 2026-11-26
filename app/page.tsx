"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Wrench, CarFront, Package, ClipboardList, Users, Building2, LogOut, LockKeyhole, LayoutDashboard, ArrowUpRight, RefreshCw, Boxes, Plus, Pencil, Power, X, MapPin } from "lucide-react";

type Profile = { user_id: string; username: string | null; full_name: string; role: "admin" | "supervisor" | "storekeeper"; site_id: string | null; is_active: boolean };
type Counts = { inGarage: number; openOrders: number; receivedToday: number; users: number };
type Site = { id: string; name: string; code: string; address: string | null; is_active: boolean; created_at?: string };
type WorkDetail = { name: string; designation: string; work_done: string };
type Vehicle = { id: string; site_id: string; ptc_id: string | null; vehicle_type: string; complaint: string; work_description: string | null; purpose_of_visit: string | null; status: "IN" | "OUT"; in_at: string; out_at: string | null; in_remark: string | null; out_remark: string | null; work_details?: WorkDetail[] };

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<Counts>({ inGarage: 0, openOrders: 0, receivedToday: 0, users: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState("overview");
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteMessage, setSiteMessage] = useState("");
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleMessage, setVehicleMessage] = useState("");
  const [vehicleSiteId, setVehicleSiteId] = useState("");
  const [ptcId, setPtcId] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [complaint, setComplaint] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [visitPurpose, setVisitPurpose] = useState("");
  const [visitPurposeOther, setVisitPurposeOther] = useState("");
  const [inRemark, setInRemark] = useState("");
  const [selectedOutId, setSelectedOutId] = useState("");
  const [outRemark, setOutRemark] = useState("");
  const [workTeam, setWorkTeam] = useState<WorkDetail[]>([{ name: "", designation: "", work_done: "" }]);
  const [vehicleFilter, setVehicleFilter] = useState("IN");
  const [partOrders,setPartOrders]=useState<any[]>([]);
  const [partsLoading,setPartsLoading]=useState(false);
  const [partsSaving,setPartsSaving]=useState(false);
  const [partsMessage,setPartsMessage]=useState("");
  const [orderSiteId,setOrderSiteId]=useState("");
  const [orderVehicleId,setOrderVehicleId]=useState("");
  const [partLines,setPartLines]=useState([{part_name:"",part_number:"",quantity:"1",unit:"Pcs",priority:"normal",notes:""}]);
  const [partsFilter,setPartsFilter]=useState("all");
  const [storeEdits,setStoreEdits]=useState<Record<string,any>>({});
  const [receiptOrderId,setReceiptOrderId]=useState("");
  const [receiptQty,setReceiptQty]=useState("1");
  const [receiptRemarks,setReceiptRemarks]=useState("");
  const [receiptSaving,setReceiptSaving]=useState(false);
  const [teamUsers,setTeamUsers]=useState<Profile[]>([]);
  const [usersLoading,setUsersLoading]=useState(false);
  const [userSaving,setUserSaving]=useState(false);
  const [userMessage,setUserMessage]=useState("");
  const [newUserId,setNewUserId]=useState("");
  const [newUserName,setNewUserName]=useState("");
  const [newUserPassword,setNewUserPassword]=useState("");
  const [newUserRole,setNewUserRole]=useState<"supervisor"|"storekeeper">("supervisor");
  const [newUserSiteId,setNewUserSiteId]=useState("");


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
      supabase.from("parts_orders").select("id", { count: "exact", head: true }).in("status", ["ordered","purchased","partially_received"]),
      supabase.from("parts_receipts").select("id", { count: "exact", head: true }).gte("received_at", today.toISOString()),
      p.role === "admin" ? supabase.from("profiles").select("user_id", { count: "exact", head: true }) : Promise.resolve({count:0})
    ]);
    setCounts({ inGarage: vehicles.count || 0, openOrders: orders.count || 0, receivedToday: receipts.count || 0, users: users.count || 0 });
  }

  async function loadTeamUsers() {
    if (!supabase) return;
    setUsersLoading(true); setUserMessage("");
    const { data, error } = await supabase.from("profiles").select("user_id,username,full_name,role,site_id,is_active").order("full_name");
    if (error) setUserMessage("Could not load users: " + error.message);
    else setTeamUsers((data || []) as Profile[]);
    setUsersLoading(false);
  }

  async function createTeamUser(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (newUserRole === "supervisor" && !newUserSiteId) { setUserMessage("Please assign a site to this Supervisor."); return; }
    setUserSaving(true); setUserMessage("");
    const { data, error } = await supabase.functions.invoke("manage-user", { body: {
      action: "create", userId: newUserId.trim(), fullName: newUserName.trim(), password: newUserPassword,
      role: newUserRole, siteId: newUserRole === "supervisor" ? newUserSiteId : null
    }});
    let detail = data?.error || error?.message || "Unknown error";
    if (error && "context" in error && error.context instanceof Response) {
      try {
        const body = await error.context.clone().json();
        if (body?.error) detail = body.error;
      } catch { /* Keep the SDK error message if the response is not JSON. */ }
    }
    if (error || data?.error) setUserMessage("Could not create account: " + detail);
    else {
      setUserMessage("User account created successfully. Share the User ID and password securely with the employee.");
      setNewUserId(""); setNewUserName(""); setNewUserPassword(""); setNewUserRole("supervisor"); setNewUserSiteId("");
      await loadTeamUsers(); await loadCounts(profile!);
    }
    setUserSaving(false);
  }

  async function toggleUserActive(user: Profile) {
    if (!supabase || user.role === "admin") return;
    const next = !user.is_active;
    if (!window.confirm((next ? "Activate " : "Deactivate ") + (user.username || user.full_name) + "?")) return;
    setUserMessage("");
    const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "set_active", userId: user.user_id, isActive: next } });
    if (error || data?.error) setUserMessage("Could not update user: " + (data?.error || error?.message || "Unknown error"));
    else { setUserMessage("User " + (next ? "activated" : "deactivated") + " successfully."); await loadTeamUsers(); }
  }

  async function loadSites() {
    if (!supabase) return;
    setSitesLoading(true); setSiteMessage("");
    const { data, error } = await supabase.from("sites").select("id,name,code,address,is_active,created_at").order("name");
    if (error) setSiteMessage("Could not load sites: " + error.message);
    else setSites((data || []) as Site[]);
    setSitesLoading(false);
  }

  useEffect(() => { void loadProfile(); }, []);
  useEffect(() => { if (profile?.role === "admin" && section === "sites") void loadSites(); }, [profile, section]);
  useEffect(() => { if (profile?.role === "admin" && section === "users") { void loadSites(); void loadTeamUsers(); } }, [profile, section]);
  useEffect(()=>{if(profile&&(section==="orders"||section==="receipts")){void loadPartsOrders();if(profile.role!=="storekeeper"){void loadVehicles();if(profile.role==="admin")void loadSites();}}},[profile,section]);
  useEffect(() => {
    if (profile && section === "vehicles" && profile.role !== "storekeeper") {
      void loadVehicles();
      if (profile.role === "admin") void loadSites();
    }
  }, [profile, section]);

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

  function resetSiteForm() { setEditingSite(null); setSiteName(""); setSiteCode(""); setSiteAddress(""); setSiteMessage(""); }
  function startEdit(site: Site) { setEditingSite(site); setSiteName(site.name); setSiteCode(site.code); setSiteAddress(site.address || ""); setSiteMessage(""); window.scrollTo({top:0,behavior:"smooth"}); }

  async function saveSite(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const name = siteName.trim();
    const code = siteCode.trim().toUpperCase().replace(/\\s+/g, "-");
    if (!name || !code) { setSiteMessage("Site name and site code are required."); return; }
    setSiteSaving(true); setSiteMessage("");
    const payload = { name, code, address: siteAddress.trim() || null };
    const result = editingSite
      ? await supabase.from("sites").update(payload).eq("id", editingSite.id)
      : await supabase.from("sites").insert({ ...payload, is_active: true });
    if (result.error) setSiteMessage("Could not save site: " + result.error.message);
    else { setSiteMessage(editingSite ? "Site details updated successfully." : "New site added successfully."); resetSiteForm(); await loadSites(); }
    setSiteSaving(false);
  }

  async function toggleSite(site: Site) {
    if (!supabase) return;
    const action = site.is_active ? "deactivate" : "activate";
    if (!window.confirm("Are you sure you want to " + action + " " + site.name + "? Existing records will be kept.")) return;
    const { error } = await supabase.from("sites").update({ is_active: !site.is_active }).eq("id", site.id);
    if (error) setSiteMessage("Could not update site: " + error.message);
    else { setSiteMessage(site.name + " " + (site.is_active ? "deactivated" : "activated") + "."); await loadSites(); }
  }

  async function loadVehicles() {
    if (!supabase) return;
    setVehicleLoading(true); setVehicleMessage("");
    const { data, error } = await supabase.from("vehicle_visits").select("*").order("in_at", { ascending: false }).limit(500);
    if (error) setVehicleMessage("Could not load vehicle records: " + error.message);
    else setVehicles((data || []) as Vehicle[]);
    setVehicleLoading(false);
  }

  async function saveVehicleIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !profile) return;
    const siteId = profile.role === "admin" ? vehicleSiteId : profile.site_id;
    if (!siteId) { setVehicleMessage("Please select a site. Ask Admin to assign your site if you are a Supervisor."); return; }
    if (!vehicleType.trim() || !complaint.trim()) { setVehicleMessage("Vehicle type and complaint are required."); return; }
    if (!visitPurpose) { setVehicleMessage("Please select the Purpose of Visit."); return; }
    if (visitPurpose === "Other" && !visitPurposeOther.trim()) { setVehicleMessage("Please enter details for Other purpose."); return; }
    setVehicleSaving(true); setVehicleMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("vehicle_visits").insert({
      site_id: siteId, ptc_id: ptcId.trim() || null, vehicle_type: vehicleType.trim(),
      complaint: complaint.trim(), work_description: workDescription.trim() || null,
      purpose_of_visit: visitPurpose === "Other" ? "Other: " + visitPurposeOther.trim() : visitPurpose, in_remark: inRemark.trim() || null,
      received_by: user?.id
    });
    if (error) setVehicleMessage("Could not register Vehicle IN: " + error.message);
    else {
      setVehicleMessage("Vehicle IN registered successfully.");
      setPtcId(""); setVehicleType(""); setComplaint(""); setWorkDescription(""); setVisitPurpose(""); setVisitPurposeOther(""); setInRemark("");
      await loadVehicles(); await loadCounts(profile);
    }
    setVehicleSaving(false);
  }

  async function saveVehicleOut(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !profile || !selectedOutId) { setVehicleMessage("Please select a vehicle to release."); return; }
    if (workTeam.some(w => !w.name.trim() || !w.designation.trim() || !w.work_done.trim())) { setVehicleMessage("Please complete name, designation and work done for every staff member, or remove the empty row."); return; }
    setVehicleSaving(true); setVehicleMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("vehicle_visits").update({
      status: "OUT", out_at: new Date().toISOString(), released_by: user?.id, out_remark: outRemark.trim() || null, work_details: workTeam.map(w => ({name:w.name.trim(), designation:w.designation.trim(), work_done:w.work_done.trim()}))
    }).eq("id", selectedOutId).eq("status", "IN");
    if (error) setVehicleMessage("Could not register Vehicle OUT: " + error.message);
    else {
      setVehicleMessage("Vehicle OUT confirmed successfully.");
      setSelectedOutId(""); setOutRemark(""); setWorkTeam([{name:"",designation:"",work_done:""}]); await loadVehicles(); await loadCounts(profile);
    }
    setVehicleSaving(false);
  }


  async function loadPartsOrders(){
    if(!supabase)return;setPartsLoading(true);setPartsMessage("");
    const {data,error}=await supabase.from("parts_orders").select("*").order("created_at",{ascending:false}).limit(1000);
    if(error){setPartsMessage("Could not load parts orders: "+error.message);setPartsLoading(false);return;}
    const rows=data||[], siteIds=[...new Set(rows.map((r:any)=>r.site_id))], visitIds=[...new Set(rows.map((r:any)=>r.vehicle_visit_id).filter(Boolean))], ids=rows.map((r:any)=>r.id);
    const [ss,vv,rr]=await Promise.all([
      siteIds.length?supabase.from("sites").select("id,name").in("id",siteIds):Promise.resolve({data:[] as any[]}),
      !isStore&&visitIds.length?supabase.from("vehicle_visits").select("id,ptc_id,vehicle_type").in("id",visitIds):Promise.resolve({data:[] as any[]}),
      ids.length?supabase.from("parts_receipts").select("*").in("order_id",ids).order("received_at"):Promise.resolve({data:[] as any[]})
    ]);
    const sm=new Map((ss.data||[]).map((x:any)=>[x.id,x.name])),vm=new Map((vv.data||[]).map((x:any)=>[x.id,x])),rm=new Map<string,any[]>();
    (rr.data||[]).forEach((r:any)=>rm.set(r.order_id,[...(rm.get(r.order_id)||[]),r]));
    setPartOrders(rows.map((r:any)=>({...r,site_name:sm.get(r.site_id)||"—",vehicle:vm.get(r.vehicle_visit_id)||null,receipts:rm.get(r.id)||[]})));
    setStoreEdits(prev=>{const n={...prev};rows.forEach((r:any)=>{if(!n[r.id])n[r.id]={request_number:r.request_number||"",request_date:r.request_date||"",invoice_number:r.invoice_number||"",invoice_date:r.invoice_date||"",invoice_cost:r.invoice_cost==null?"":String(r.invoice_cost),invoice_currency:r.invoice_currency||"AED"};});return n;});
    setPartsLoading(false);
  }
  async function submitPartsOrder(e:React.FormEvent){
    e.preventDefault();if(!supabase||!profile)return;
    const siteId=profile.role==="admin"?orderSiteId:profile.site_id, lines=partLines.filter(x=>x.part_name.trim());
    if(!siteId){setPartsMessage("Select a site / ask Admin to assign your site.");return;}
    if(!lines.length||lines.some(x=>!Number.isFinite(Number(x.quantity))||Number(x.quantity)<=0)){setPartsMessage("Enter part names and valid quantities greater than zero.");return;}
    setPartsSaving(true);setPartsMessage("");const {data:{user}}=await supabase.auth.getUser();
    const payload=lines.map(x=>({site_id:siteId,vehicle_visit_id:orderVehicleId||null,created_by:user?.id,part_name:x.part_name.trim(),part_number:x.part_number.trim()||null,quantity:Number(x.quantity),unit:x.unit,priority:x.priority,notes:x.notes.trim()||null,status:"ordered"}));
    const {error}=await supabase.from("parts_orders").insert(payload);
    if(error)setPartsMessage("Could not submit: "+error.message);else{setPartsMessage(lines.length+" part line(s) submitted successfully.");setPartLines([{part_name:"",part_number:"",quantity:"1",unit:"Pcs",priority:"normal",notes:""}]);setOrderVehicleId("");await loadPartsOrders();await loadCounts(profile);}
    setPartsSaving(false);
  }
  async function saveStoreOrder(id:string){
    if(!supabase)return;const x=storeEdits[id];if(!x)return;const cost=String(x.invoice_cost||"").trim();
    if(cost&&(!Number.isFinite(Number(cost))||Number(cost)<0)){setPartsMessage("Enter a valid invoice cost.");return;}
    setPartsSaving(true);setPartsMessage("");
    const {error}=await supabase.from("parts_orders").update({request_number:x.request_number.trim()||null,request_date:x.request_date||null,invoice_number:x.invoice_number.trim()||null,invoice_date:x.invoice_date||null,invoice_cost:cost?Number(cost):null,invoice_currency:x.invoice_currency||"AED"}).eq("id",id);
    if(error)setPartsMessage("Could not save: "+error.message);else{setPartsMessage("Store details saved successfully.");await loadPartsOrders();}setPartsSaving(false);
  }
  async function savePartsReceipt(e:React.FormEvent){
    e.preventDefault();if(!supabase||!profile||!receiptOrderId)return;const q=Number(receiptQty);
    if(!Number.isFinite(q)||q<=0){setPartsMessage("Enter a valid received quantity.");return;}
    const selectedOrder=partOrders.find(o=>o.id===receiptOrderId);
    const alreadyReceived=(selectedOrder?.receipts||[]).reduce((sum:number,r:any)=>sum+Number(r.quantity_received||0),0);
    const remaining=Number(selectedOrder?.quantity||0)-alreadyReceived;
    if(q>remaining){setPartsMessage("Received quantity cannot exceed the remaining quantity ("+remaining+" "+(selectedOrder?.unit||"")+").");return;}
    setReceiptSaving(true);setPartsMessage("");const {data:{user}}=await supabase.auth.getUser();
    const {error}=await supabase.from("parts_receipts").insert({order_id:receiptOrderId,received_by:user?.id,quantity_received:q,remarks:receiptRemarks.trim()||null});
    if(error)setPartsMessage("Could not record receipt: "+error.message);else{setPartsMessage("Parts receipt recorded successfully.");setReceiptOrderId("");setReceiptQty("1");setReceiptRemarks("");await loadPartsOrders();await loadCounts(profile);}setReceiptSaving(false);
  }
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
      <div className="content">\n
        {section==="orders"&&<section className="sitePage partsPage">
          <div className="siteIntro"><div><span className="eyebrow dark">PARTS MANAGEMENT</span><h1>Parts Orders</h1><p>Create a request with multiple part lines.</p></div><button className="refreshBtn" onClick={loadPartsOrders}><RefreshCw size={16}/> Refresh</button></div>
          {partsMessage&&<div className={partsMessage.includes("successfully")?"siteSuccess":"siteError"}>{partsMessage}</div>}
          {profile.role!=="storekeeper"&&<div className="siteFormCard"><div className="siteFormTitle"><div className="siteIcon"><Package size={20}/></div><div><h3>Create parts request</h3><p>Each part is stored as a separate order under the same vehicle visit.</p></div></div><form className="siteForm" onSubmit={submitPartsOrder}>
            <div className="siteFields">{profile.role==="admin"&&<label>Site<select value={orderSiteId} onChange={e=>{setOrderSiteId(e.target.value);setOrderVehicleId("");}} required><option value="">Select site</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
            <label className="siteAddress">Vehicle (optional)<select value={orderVehicleId} onChange={e=>setOrderVehicleId(e.target.value)}><option value="">General parts request</option>{vehicles.filter(v=>v.status==="IN"&&(profile.role==="admin"?v.site_id===orderSiteId:v.site_id===profile.site_id)).map(v=><option key={v.id} value={v.id}>{(v.ptc_id||"No PTC ID")+" · "+v.vehicle_type}</option>)}</select></label></div>
            <div className="partLinesHeading"><b>Parts list</b><button type="button" className="secondaryBtn" onClick={()=>setPartLines([...partLines,{part_name:"",part_number:"",quantity:"1",unit:"Pcs",priority:"normal",notes:""}])}><Plus size={15}/> Add part</button></div>
            {partLines.map((x,i)=><div className="partLine" key={i}><div className="partLineTop"><b>Part {i+1}</b>{partLines.length>1&&<button type="button" className="iconAction deactivate" onClick={()=>setPartLines(partLines.filter((_,j)=>j!==i))}><X size={14}/> Remove</button>}</div><div className="siteFields">
              <label>Part name<input required value={x.part_name} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,part_name:e.target.value}:z))}/></label>
              <label>Part number<input value={x.part_number} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,part_number:e.target.value}:z))}/></label>
              <label>Quantity<input type="number" min="0.01" step="0.01" required value={x.quantity} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,quantity:e.target.value}:z))}/></label>
              <label>Unit<select value={x.unit} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,unit:e.target.value}:z))}><option>Nos</option><option>Drum</option><option>Roll</option><option>Pcs</option><option>Box</option><option>Bundle</option></select></label>
              <label>Priority<select value={x.priority} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,priority:e.target.value}:z))}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="high">High</option></select></label>
              <label>Remarks<input value={x.notes} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,notes:e.target.value}:z))}/></label></div></div>)}
            <div className="siteFormActions"><button className="primaryBtn siteSave" disabled={partsSaving}>{partsSaving?"Submitting...":"Submit parts request"} <ArrowUpRight size={17}/></button></div></form></div>}
          <div className="siteListHeader"><div><h3>{profile.role==="storekeeper"?"All parts requests":"Parts order history"}</h3><p>{partOrders.length} order line(s) · old records retained</p></div></div>
          <div className="vehicleFilters">{["all","ordered","purchased","partially_received","received"].map(v=><button key={v} className={partsFilter===v?"filterActive":"filterBtn"} onClick={()=>setPartsFilter(v)}>{v==="all"?"All":v==="partially_received"?"Part received":v==="purchased"?"Purchased":v==="received"?"Completed":"Ordered"}</button>)}</div>
          {partsLoading?<div className="siteEmpty">Loading parts orders...</div>:<div className="siteTableWrap"><table className="siteTable partsTable"><thead><tr><th>Site</th><th>Vehicle</th><th>Part</th><th>Quantity</th><th>Status</th><th>Request</th><th>Invoice / Cost</th>{profile.role==="storekeeper"&&<th>Store update</th>}</tr></thead><tbody>
          {partOrders.filter(o=>partsFilter==="all"||o.status===partsFilter).map(o=><tr key={o.id}><td>{o.site_name}</td><td>{o.vehicle?(o.vehicle.ptc_id||"No PTC ID")+" · "+o.vehicle.vehicle_type:"General"}</td><td><b>{o.part_name}</b><small className="tableSub">{o.part_number||"—"} {o.notes||""}</small></td><td>{o.quantity} {o.unit}</td><td><span className={o.status==="received"?"statusActive":o.status==="partially_received"?"statusPartial":"statusInactive"}>{o.status}</span><small className="tableSub">Received {o.receipts.reduce((a:number,r:any)=>a+Number(r.quantity_received),0)} / {o.quantity}</small></td><td>{o.request_number||"—"}<small className="tableSub">{o.request_date||"Date pending"}</small></td><td>{o.invoice_number||"—"}<small className="tableSub">{o.invoice_date||"—"} · {o.invoice_cost==null?"Cost pending":(o.invoice_currency||"AED")+" "+Number(o.invoice_cost).toFixed(2)}</small></td>
          {profile.role==="storekeeper"&&<td><div className="storeEditForm">{(["request_number","request_date","invoice_number","invoice_date","invoice_cost"] as const).map(k=><label key={k}>{({request_number:"Request No.",request_date:"Request Date",invoice_number:"Invoice No.",invoice_date:"Invoice Date",invoice_cost:"Cost"} as any)[k]}<input type={k.endsWith("date")?"date":k==="invoice_cost"?"number":"text"} step={k==="invoice_cost"?"0.01":undefined} value={storeEdits[o.id]?.[k]??""} onChange={e=>setStoreEdits(p=>({...p,[o.id]:{...(p[o.id]||{request_number:"",request_date:"",invoice_number:"",invoice_date:"",invoice_cost:"",invoice_currency:"AED"}),[k]:e.target.value}}))}/></label>)}<label>Currency<select value={storeEdits[o.id]?.invoice_currency||"AED"} onChange={e=>setStoreEdits(p=>({...p,[o.id]:{...(p[o.id]||{request_number:"",request_date:"",invoice_number:"",invoice_date:"",invoice_cost:""}),invoice_currency:e.target.value}}))}><option>AED</option><option>USD</option><option>INR</option><option>EUR</option></select></label><button type="button" className="primaryBtn siteSave" disabled={partsSaving} onClick={()=>saveStoreOrder(o.id)}>Save details</button></div></td>}</tr>)}
          {partOrders.filter(o=>partsFilter==="all"||o.status===partsFilter).length===0&&<tr><td colSpan={profile.role==="storekeeper"?8:7}>No orders found.</td></tr>}</tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/>{profile.role==="storekeeper"?"Store Keeper can update request and purchase fields only.":"Supervisors see their assigned site; Admin sees all sites."}</div>
        </section>}
        {section==="receipts"&&<section className="sitePage partsPage"><div className="siteIntro"><div><span className="eyebrow dark">PARTS MANAGEMENT</span><h1>Parts Received</h1><p>Record actual delivery at the garage and review receiving history.</p></div><button className="refreshBtn" onClick={loadPartsOrders}><RefreshCw size={16}/> Refresh</button></div>
          {partsMessage&&<div className={partsMessage.includes("successfully")?"siteSuccess":"siteError"}>{partsMessage}</div>}
          {profile.role!=="storekeeper"&&<div className="siteFormCard"><div className="siteFormTitle"><div className="siteIcon"><Boxes size={20}/></div><div><h3>Confirm garage receipt</h3><p>Enter the quantity physically received.</p></div></div><form className="siteForm" onSubmit={savePartsReceipt}><div className="siteFields">
            <label className="siteAddress">Parts order<select required value={receiptOrderId} onChange={e=>setReceiptOrderId(e.target.value)}><option value="">Select open order</option>{partOrders.filter(o=>o.status!=="received").map(o=><option key={o.id} value={o.id}>{o.site_name+" · "+o.part_name+" · "+o.quantity+" "+o.unit}</option>)}</select></label>
            <label>Quantity received<input type="number" min="0.01" step="0.01" value={receiptQty} onChange={e=>setReceiptQty(e.target.value)}/></label><label>Remarks<input value={receiptRemarks} onChange={e=>setReceiptRemarks(e.target.value)}/></label></div><div className="siteFormActions"><button className="primaryBtn siteSave" disabled={receiptSaving||!receiptOrderId}>{receiptSaving?"Saving...":"Confirm receipt"}</button></div></form></div>}
          <div className="siteListHeader"><div><h3>Receiving history</h3><p>Includes partial deliveries and completion history.</p></div><span className="siteCount">{partOrders.reduce((n,o)=>n+o.receipts.length,0)} Receipts</span></div>
          {partsLoading?<div className="siteEmpty">Loading receipts...</div>:<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Date / Time</th><th>Site</th><th>Part</th><th>Ordered</th><th>Received</th><th>Remarks</th><th>Status</th></tr></thead><tbody>
          {partOrders.flatMap(o=>o.receipts.map((r:any)=><tr key={r.id}><td>{new Date(r.received_at).toLocaleString()}</td><td>{o.site_name}</td><td>{o.part_name}</td><td>{o.quantity} {o.unit}</td><td>{r.quantity_received} {o.unit}</td><td>{r.remarks||"—"}</td><td>{o.status}</td></tr>))}
          {partOrders.every(o=>!o.receipts.length)&&<tr><td colSpan={7}>No receipt records found.</td></tr>}</tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/>{profile.role==="storekeeper"?"View-only receiving history.":"Admin and assigned Supervisor can confirm physical receipt."}</div>
        </section>}

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
        {section==="vehicles" && profile.role!=="storekeeper" && <section className="sitePage">
          <div className="siteIntro"><div><span className="eyebrow dark">GARAGE OPERATIONS</span><h1>Vehicle IN / OUT</h1><p>Register vehicles entering the garage and confirm their release with automatic date and time.</p></div><button className="refreshBtn" onClick={loadVehicles}><RefreshCw size={16}/> Refresh</button></div>
          {vehicleMessage && <div className={vehicleMessage.includes("successfully") ? "siteSuccess" : "siteError"}>{vehicleMessage}</div>}
          <div className="vehicleForms">
            <div className="siteFormCard">
              <div className="siteFormTitle"><div className="siteIcon"><CarFront size={20}/></div><div><h3>Vehicle IN</h3><p>Record a new vehicle arriving at the garage.</p></div></div>
              <form className="siteForm" onSubmit={saveVehicleIn}>
                <div className="siteFields">
                  {profile.role==="admin" && <label>Site<select value={vehicleSiteId} onChange={e=>setVehicleSiteId(e.target.value)} required><option value="">Select site</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
                  <label>PTC ID (optional)<input value={ptcId} onChange={e=>setPtcId(e.target.value)} placeholder="Enter PTC ID"/></label>
                  <label>Vehicle Type<input value={vehicleType} onChange={e=>setVehicleType(e.target.value)} placeholder="e.g. Bus / Van / Pickup" required/></label>
                  <label>Complaint<input value={complaint} onChange={e=>setComplaint(e.target.value)} placeholder="Reason for garage visit" required/></label>
                  <label>Work Description<input value={workDescription} onChange={e=>setWorkDescription(e.target.value)} placeholder="Work to be carried out"/></label>
                  <label>Purpose of Visit<select value={visitPurpose} onChange={e=>{setVisitPurpose(e.target.value);setVisitPurposeOther("");}} required><option value="">Select purpose</option><option>Vehicle Breakdown</option><option>Preventive Maintenance (PM)</option><option>Maintenance</option><option>Tyre Replacement / Repair</option><option>Electrical Work</option><option>Accident / Body Repair</option><option>Inspection</option><option>Other</option></select></label>
                  {visitPurpose === "Other" && <label>Other Purpose Details<input value={visitPurposeOther} onChange={e=>setVisitPurposeOther(e.target.value)} placeholder="Please specify purpose" required/></label>}
                  <label className="siteAddress">IN Remarks<input value={inRemark} onChange={e=>setInRemark(e.target.value)} placeholder="Additional remarks"/></label>
                </div>
                <div className="siteFormActions"><button className="primaryBtn siteSave" disabled={vehicleSaving}>{vehicleSaving?"Saving...":"Register Vehicle IN"} <ArrowUpRight size={17}/></button></div>
              </form>
            </div>
            <div className="siteFormCard">
              <div className="siteFormTitle"><div className="siteIcon"><LogOut size={20}/></div><div><h3>Vehicle OUT</h3><p>Only vehicles currently inside the garage can be released.</p></div></div>
              <form className="siteForm" onSubmit={saveVehicleOut}>
                <div className="siteFields">
                  <label className="siteAddress">Select vehicle<select value={selectedOutId} onChange={e=>setSelectedOutId(e.target.value)} required><option value="">Select vehicle currently IN</option>{vehicles.filter(v=>v.status==="IN").map(v=><option key={v.id} value={v.id}>{v.ptc_id || "No PTC ID"} · {v.vehicle_type} · {v.complaint}</option>)}</select></label>
                  <div className="siteAddress workTeamBlock"><div className="workTeamHeading"><b>Staff who worked on this vehicle</b><button type="button" className="secondaryBtn" onClick={()=>setWorkTeam([...workTeam,{name:"",designation:"",work_done:""}])}><Plus size={15}/> Add staff</button></div>{workTeam.map((worker,index)=><div className="workTeamRow" key={index}><label>Staff name<input value={worker.name} onChange={e=>setWorkTeam(workTeam.map((w,i)=>i===index?{...w,name:e.target.value}:w))} placeholder="Enter employee name" required/></label><label>Designation<input value={worker.designation} onChange={e=>setWorkTeam(workTeam.map((w,i)=>i===index?{...w,designation:e.target.value}:w))} placeholder="e.g. Mechanic" required/></label><label>Work done<input value={worker.work_done} onChange={e=>setWorkTeam(workTeam.map((w,i)=>i===index?{...w,work_done:e.target.value}:w))} placeholder="Describe work completed" required/></label>{workTeam.length>1&&<button type="button" className="iconAction deactivate" onClick={()=>setWorkTeam(workTeam.filter((_,i)=>i!==index))}><X size={15}/> Remove</button>}</div>)}</div><label className="siteAddress">OUT Remarks<input value={outRemark} onChange={e=>setOutRemark(e.target.value)} placeholder="Final inspection / release remarks"/></label>
                </div>
                <div className="siteFormActions"><button className="primaryBtn siteSave" disabled={vehicleSaving || !selectedOutId}>{vehicleSaving?"Saving...":"Confirm Vehicle OUT"} <ArrowUpRight size={17}/></button></div>
              </form>
            </div>
          </div>
          <div className="siteListHeader"><div><h3>Vehicle records</h3><p>{vehicles.filter(v=>v.status==="IN").length} currently in garage · {vehicles.length} total records</p></div><div className="vehicleFilters"><button className={vehicleFilter==="IN"?"filterActive":"filterBtn"} onClick={()=>setVehicleFilter("IN")}>Currently IN</button><button className={vehicleFilter==="OUT"?"filterActive":"filterBtn"} onClick={()=>setVehicleFilter("OUT")}>Vehicle OUT</button><button className={vehicleFilter==="ALL"?"filterActive":"filterBtn"} onClick={()=>setVehicleFilter("ALL")}>All History</button></div></div>
          {vehicleLoading?<div className="siteEmpty"><div className="spinner"/> Loading vehicle records...</div>:<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>PTC ID</th><th>Vehicle Type</th><th>Complaint</th><th>IN Date / Time</th><th>OUT Date / Time</th><th>Garage Duration</th><th>Work Details</th><th>Status</th></tr></thead><tbody>
            {vehicles.filter(v=>vehicleFilter==="ALL" || v.status===vehicleFilter).map(v=><tr key={v.id}><td><b>{v.ptc_id||"—"}</b></td><td>{v.vehicle_type}</td><td>{v.complaint}</td><td>{new Date(v.in_at).toLocaleString()}</td><td>{v.out_at?new Date(v.out_at).toLocaleString():"—"}</td><td>{formatDuration(v.in_at,v.out_at)}</td><td>{v.work_details?.length ? v.work_details.map(w=>`${w.name} (${w.designation}): ${w.work_done}`).join("; ") : "—"}</td><td><span className={v.status==="IN"?"statusActive":"statusInactive"}>{v.status}</span></td></tr>)}
            {vehicles.filter(v=>vehicleFilter==="ALL" || v.status===vehicleFilter).length===0 && <tr><td colSpan={8}>No vehicle records found.</td></tr>}
          </tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/> {profile.role==="admin"?"You can view vehicle movements across all sites.":"You can view vehicle movements for your assigned site only."} IN / OUT timestamps are recorded automatically.</div>
        </section>}
        {section==="users" && profile.role==="admin" && <section className="sitePage">
          <div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>User Management</h1><p>Create Supervisor and Store Keeper accounts and control access.</p></div><button className="refreshBtn" onClick={loadTeamUsers}><RefreshCw size={16}/> Refresh</button></div>
          <div className="siteFormCard">
            <div className="siteFormTitle"><div className="siteIcon"><Users size={20}/></div><div><h3>Create a team account</h3><p>Supervisor must be assigned to one active site. Store Keeper can view parts records across all sites.</p></div></div>
            <form className="siteForm" onSubmit={createTeamUser}>
              <div className="siteFields">
                <label>User ID<input value={newUserId} onChange={e=>setNewUserId(e.target.value)} placeholder="e.g. SUP001" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" required/></label>
                <label>Full name<input value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="Employee full name" minLength={2} maxLength={100} required/></label>
                <label>Password<input type="password" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)} placeholder="At least 12 characters" minLength={12} required autoComplete="new-password"/></label>
                <label>Role<select value={newUserRole} onChange={e=>setNewUserRole(e.target.value as "supervisor"|"storekeeper")}><option value="supervisor">Supervisor</option><option value="storekeeper">Store Keeper</option></select></label>
                {newUserRole==="supervisor" && <label>Assigned site<select value={newUserSiteId} onChange={e=>setNewUserSiteId(e.target.value)} required><option value="">Select site</option>{sites.filter(site=>site.is_active).map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
              </div>
              {userMessage && <div className={userMessage.includes("successfully")?"siteSuccess":"siteError"}>{userMessage}</div>}
              <div className="siteFormActions"><button className="primaryBtn siteSave" disabled={userSaving}>{userSaving?"Creating account...":"Create account"} <Plus size={17}/></button></div>
            </form>
          </div>
          <div className="siteListHeader"><div><h3>Team accounts</h3><p>{teamUsers.filter(u=>u.is_active).length} active · {teamUsers.length} total accounts</p></div><span className="siteCount">{teamUsers.length} Users</span></div>
          {usersLoading?<div className="siteEmpty">Loading team accounts...</div>:<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Employee</th><th>User ID</th><th>Role</th><th>Assigned site</th><th>Status</th><th>Action</th></tr></thead><tbody>
            {teamUsers.map(user=><tr key={user.user_id}><td><b>{user.full_name}</b></td><td><span className="siteCode">{user.username||"—"}</span></td><td>{user.role==="admin"?"Admin":user.role==="supervisor"?"Supervisor":"Store Keeper"}</td><td>{user.role==="supervisor"?(sites.find(site=>site.id===user.site_id)?.name||"—"):"All sites (parts only)"}</td><td><span className={user.is_active?"statusActive":"statusInactive"}>{user.is_active?"Active":"Inactive"}</span></td><td>{user.role==="admin"?<span className="siteFootnote">Protected</span>:<button type="button" className={user.is_active?"iconAction deactivate":"iconAction activate"} onClick={()=>toggleUserActive(user)}><Power size={15}/>{user.is_active?"Deactivate":"Activate"}</button>}</td></tr>)}
            {teamUsers.length===0&&<tr><td colSpan={6}>No user accounts found.</td></tr>}
          </tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/> Passwords are not displayed after creation. Deactivated users are blocked at sign-in; existing records remain unchanged.</div>
        </section>}
        {section==="sites" && profile.role==="admin" && <section className="sitePage">
          <div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Manage your garage locations</h1><p>Add new sites, update details and control which locations are active.</p></div><button className="refreshBtn" onClick={loadSites}><RefreshCw size={16}/> Refresh</button></div>
          <div className="siteFormCard">
            <div className="siteFormTitle"><div className="siteIcon"><Building2 size={20}/></div><div><h3>{editingSite?"Edit site":"Add a new site"}</h3><p>{editingSite?"Update the selected location details.":"New sites are active immediately after saving."}</p></div></div>
            <form className="siteForm" onSubmit={saveSite}>
              <div className="siteFields">
                <label>Site name<input value={siteName} onChange={e=>setSiteName(e.target.value)} placeholder="e.g. Jebel Ali" required maxLength={80}/></label>
                <label>Site code<input value={siteCode} onChange={e=>setSiteCode(e.target.value)} placeholder="e.g. JEBEL-ALI" required maxLength={24}/></label>
                <label className="siteAddress">Address / location (optional)<input value={siteAddress} onChange={e=>setSiteAddress(e.target.value)} placeholder="Enter site address or area" maxLength={180}/></label>
              </div>
              {siteMessage && <div className={siteMessage.includes("successfully")||siteMessage.includes("deactivated")||siteMessage.includes("activated")?"siteSuccess":"siteError"}>{siteMessage}</div>}
              <div className="siteFormActions">{editingSite&&<button type="button" className="secondaryBtn" onClick={resetSiteForm}><X size={15}/> Cancel edit</button>}<button className="primaryBtn siteSave" disabled={siteSaving}>{siteSaving?"Saving...":editingSite?"Save changes":"Add site"} <Plus size={17}/></button></div>
            </form>
          </div>
          <div className="siteListHeader"><div><h3>All sites</h3><p>{sites.filter(s=>s.is_active).length} active · {sites.length} total locations</p></div><span className="siteCount">{sites.length} Sites</span></div>
          {sitesLoading?<div className="siteEmpty"><div className="spinner"/> Loading sites...</div>:sites.length===0?<div className="siteEmpty">No sites found. Add your first site using the form above.</div>:<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Site</th><th>Site code</th><th>Address</th><th>Status</th><th>Actions</th></tr></thead><tbody>{sites.map(site=><tr key={site.id}><td><div className="siteNameCell"><span className="siteRowIcon"><MapPin size={16}/></span><b>{site.name}</b></div></td><td><span className="siteCode">{site.code}</span></td><td>{site.address||"—"}</td><td><span className={site.is_active?"statusActive":"statusInactive"}>{site.is_active?"Active":"Inactive"}</span></td><td><div className="siteActions"><button type="button" className="iconAction" title="Edit site" onClick={()=>startEdit(site)}><Pencil size={15}/> Edit</button><button type="button" className={site.is_active?"iconAction deactivate":"iconAction activate"} title={site.is_active?"Deactivate site":"Activate site"} onClick={()=>toggleSite(site)}><Power size={15}/>{site.is_active?"Deactivate":"Activate"}</button></div></td></tr>)}</tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/> Deactivating a site does not delete its existing vehicle, parts or history records.</div>
        </section>}
        {section!=="overview" && section!=="sites" && section!=="vehicles" && section!=="orders" && section!=="receipts" && <div className="comingCard"><div className="comingIcon"><Wrench size={25}/></div><span className="eyebrow dark">MODULE READY FOR NEXT BUILD STEP</span><h2>{nav.find(n=>n.id===section)?.label}</h2><p>The dashboard shell and role permissions are in place. This module will be connected to the live Supabase tables in the next build step.</p><button className="textBtn" onClick={()=>setSection("overview")}>Back to overview <ArrowUpRight size={16}/></button></div>}
      </div>
    </section>
  </main>;
}

function formatDuration(start: string, end: string | null) {
  const ms = Math.max(0, (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function Stat({icon,label,value,hint}:{icon:React.ReactNode;label:string;value:number;hint:string}) { return <div className="statCard"><div className="statTop"><span>{label}</span><i>{icon}</i></div><strong>{value.toLocaleString()}</strong><small>{hint}</small></div>; }
function Quick({icon,title,desc,onClick}:{icon:React.ReactNode;title:string;desc:string;onClick:()=>void}) { return <button className="quickCard" onClick={onClick}><i>{icon}</i><b>{title}</b><span>{desc}</span><ArrowUpRight className="quickArrow" size={18}/></button>; }
