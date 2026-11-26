"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = { user_id: string; username: string | null; full_name: string; role: "admin" | "supervisor" | "storekeeper"; site_id: string | null };
type Site = { id: string; name: string; is_active: boolean };
type Field = { key: string; label: string; type?: "text" | "number" | "date" | "textarea" | "select"; required?: boolean; options?: string[] };
type Config = { table: string; title: string; description: string; fields: Field[]; adminOnly?: boolean; storeAllowed?: boolean };

const configs: Record<string, Config> = {
  breakdowns: { table: "breakdown_jobs", title: "Breakdowns and jobs", description: "Register workshop breakdown jobs, assign responsibility and follow repair status.", fields: [
    {key:"ptc_id",label:"PTC ID"},{key:"vehicle_type",label:"Vehicle / equipment",required:true},{key:"complaint",label:"Problem / complaint",type:"textarea",required:true},
    {key:"priority",label:"Priority",type:"select",options:["Low","Normal","High","Urgent"],required:true},{key:"status",label:"Job status",type:"select",options:["Open","In Progress","Waiting for Parts","Completed","Cancelled"],required:true},
    {key:"assigned_to",label:"Responsible person"},{key:"started_at",label:"Work started",type:"date"},{key:"completed_at",label:"Completed date",type:"date"},{key:"remarks",label:"Remarks",type:"textarea"}
  ]},
  maintenance: { table: "preventive_maintenance", title: "Preventive maintenance", description: "Create and track recurring maintenance schedules by days, kilometres or operating hours.", fields: [
    {key:"ptc_id",label:"PTC ID",required:true},{key:"vehicle_type",label:"Vehicle / equipment"},{key:"maintenance_work",label:"Maintenance work",type:"textarea",required:true},
    {key:"repeat_by",label:"Repeat by",type:"select",options:["Days","Kilometres","Operating Hours"],required:true},{key:"repeat_interval",label:"Repeat interval",type:"number",required:true},
    {key:"last_done_value",label:"Last completed meter value",type:"number"},{key:"current_value",label:"Current meter value",type:"number"},{key:"expected_due_date",label:"Expected due date",type:"date"},
    {key:"responsible_person",label:"Responsible person"},{key:"status",label:"Status",type:"select",options:["Active","Paused","Completed"]},{key:"remarks",label:"Remarks",type:"textarea"}
  ]},
  "ptc-assets": { table:"ptc_assets", title:"PTC assets", description:"Maintain the PTC vehicle and equipment asset register.", fields:[
    {key:"ptc_id",label:"PTC ID / asset ID"},{key:"asset_name",label:"Asset name",required:true},{key:"asset_type",label:"Asset type"},{key:"serial_number",label:"Serial number"},{key:"make_model",label:"Make / model"},
    {key:"status",label:"Status",type:"select",options:["Active","Under Repair","Disposed"]},{key:"remarks",label:"Remarks",type:"textarea"}
  ]},
  "general-stores": { table:"general_store_items", title:"General Stores", description:"Track site stock, available quantity and reorder levels. Store Keeper can manage all sites.", storeAllowed:true, fields:[
    {key:"item_code",label:"Item code"},{key:"item_name",label:"Item name",required:true},{key:"category",label:"Category"},{key:"unit",label:"Unit",type:"select",options:["Pcs","Nos","Box","Litre","Kg","Set","Roll"]},
    {key:"quantity_on_hand",label:"Quantity on hand",type:"number",required:true},{key:"reorder_level",label:"Reorder level",type:"number"},{key:"remarks",label:"Remarks",type:"textarea"}
  ]},
  "tasks-projects": { table:"tasks_projects", title:"Tasks and projects", description:"Assign workshop and store tasks, set due dates and monitor progress.", fields:[
    {key:"title",label:"Task / project title",required:true},{key:"description",label:"Description",type:"textarea"},{key:"assigned_to",label:"Assigned to (User ID / name)"},
    {key:"due_date",label:"Due date",type:"date"},{key:"priority",label:"Priority",type:"select",options:["Low","Normal","High","Urgent"]},{key:"status",label:"Status",type:"select",options:["Open","In Progress","On Hold","Completed","Cancelled"]}
  ]}
};

const empty = (fields: Field[]) => Object.fromEntries(fields.map(f => [f.key, f.type === "select" ? (f.options?.[0] || "") : ""])) as Record<string,string>;

export default function ModuleWorkspace({ section, profile, sites, onNavigate }: { section: string; profile: Profile; sites: Site[]; onNavigate: (section:string)=>void }) {
  const config = configs[section];
  const [rows,setRows] = useState<any[]>([]);
  const [legacyRows,setLegacyRows] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [formOpen,setFormOpen] = useState(false);
  const [editing,setEditing] = useState<any|null>(null);
  const [form,setForm] = useState<Record<string,string>>({});
  const [siteId,setSiteId] = useState(profile.site_id || "");
  const [search,setSearch] = useState("");
  const [chatText,setChatText] = useState("");
  const [recipientId,setRecipientId] = useState("");
  const [chatUsers,setChatUsers] = useState<any[]>([]);
  const [chatRows,setChatRows] = useState<any[]>([]);
  const [settingName,setSettingName] = useState("PTC Garage Management");
  const [settingColor,setSettingColor] = useState("#087a46");
  const [settingLanguage,setSettingLanguage] = useState("English");
  const [settingNotice,setSettingNotice] = useState("");

  const isAdmin = profile.role === "admin";
  const adminSections = ["roles-permissions","settings","audit-history","master-data","historical-imports","system-health","ask-ptc-data"];
  if(adminSections.includes(section) && !isAdmin) return <Denied/>;
  const siteName = (id:string|null) => sites.find(s=>s.id===id)?.name || "—";

  async function load() {
    if (!supabase || !config) return;
    setLoading(true); setMessage("");
    let q = supabase.from(config.table).select("*").order("created_at",{ascending:false}).limit(500);
    if ((profile.role === "admin" || profile.role === "storekeeper") && siteId && config.table !== "tasks_projects") q = q.eq("site_id",siteId);
    const {data,error} = await q;
    if (error) setMessage("Could not load records: " + error.message);
    else setRows(data || []);
    setLoading(false);
  }
  async function logAction(action:string, module:string, id:string|null, details:any={}) {
    if (!supabase) return;
    await supabase.from("audit_logs").insert({user_id:profile.user_id,action,module,record_id:id,details});
  }
  useEffect(()=>{ if(profile.role!=="admin") setSiteId(profile.site_id||""); },[section,profile.user_id,profile.role,profile.site_id]);
  useEffect(()=>{ if(config) void load(); },[section,profile.user_id,siteId]);
  useEffect(()=>{ if(section==="private-chat"){void loadChat();void loadChatUsers();} if(section==="notifications") void loadNotifications(); if(section==="settings") void loadSettings(); if(section==="breakdowns"||section==="maintenance") void loadLegacyVisits(); },[section]);
  async function loadLegacyVisits(){if(!supabase)return;const {data,error}=await supabase.from("vehicle_visits").select("*").order("in_at",{ascending:false}).limit(1000);if(error){setMessage("Could not load historical vehicle visits: "+error.message);return;}const key=section==="breakdowns"?"breakdown":"maintenance";setLegacyRows((data||[]).filter((v:any)=>String(v.purpose_of_visit||"").toLowerCase().includes(key)));}
  async function loadChatUsers(){if(!supabase)return;const {data}=await supabase.from("profiles").select("user_id,username,full_name,role,is_active").eq("is_active",true).order("full_name");setChatUsers((data||[]).filter((u:any)=>u.user_id!==profile.user_id));}
  async function loadSettings(){if(!supabase)return;const {data}=await supabase.from("app_settings").select("setting_key,setting_value");(data||[]).forEach((r:any)=>{const v=r.setting_value?.value;if(r.setting_key==="app_name"&&v)setSettingName(v);if(r.setting_key==="primary_color"&&v)setSettingColor(v);if(r.setting_key==="language"&&v)setSettingLanguage(v);});}
  async function loadChat() {
    if(!supabase)return;
    const {data,error}=await supabase.from("private_messages").select("*").order("created_at",{ascending:true}).limit(200);
    if(error)setMessage("Could not load messages: "+error.message); else setChatRows(data||[]);
  }
  async function sendChat(e:React.FormEvent) {
    e.preventDefault(); if(!supabase||!chatText.trim())return;
    const {error}=await supabase.from("private_messages").insert({sender_id:profile.user_id,recipient_id:recipientId||null,message:chatText.trim()});
    if(error)setMessage("Could not send message: "+error.message); else {setChatText("");await loadChat();}
  }
  async function loadNotifications(){
    if(!supabase)return;
    const {data,error}=await supabase.from("notifications").select("*").order("created_at",{ascending:false}).limit(200);
    if(error)setMessage("Could not load notifications: "+error.message);else setRows(data||[]);
  }
  function startAdd(){if(!config)return;setEditing(null);setForm(empty(config.fields));setFormOpen(true);setMessage("");}
  function startEdit(row:any){if(!config)return;setEditing(row);setForm(Object.fromEntries(config.fields.map(f=>[f.key,row[f.key]==null?"":String(row[f.key]).slice(0,10)])));setFormOpen(true);setMessage("");}
  async function save(e:React.FormEvent){
    e.preventDefault(); if(!supabase||!config)return;
    const actualSite = (isAdmin || (profile.role === "storekeeper" && config.table === "general_store_items")) ? siteId : profile.site_id;
    if(config.table!=="tasks_projects" && !actualSite){setMessage("Please select or request an assigned site.");return;}
    const payload:any={};
    config.fields.forEach(f=>{const v=form[f.key]?.trim()||null;payload[f.key]=f.type==="number"?(v===null?null:Number(v)):v;});
    if(config.table!=="tasks_projects")payload.site_id=actualSite;
    else payload.site_id=actualSite||null;
    if(!editing)payload.created_by=profile.user_id;
    setSaving(true);setMessage("");
    const result=editing?await supabase.from(config.table).update(payload).eq("id",editing.id):await supabase.from(config.table).insert(payload).select("id").single();
    if(result.error)setMessage("Could not save: "+result.error.message);
    else{await logAction(editing?"update":"create",section,editing?.id||result.data?.id,payload);setMessage(editing?"Record updated successfully.":"Record added successfully.");setFormOpen(false);setEditing(null);await load();}
    setSaving(false);
  }
  async function remove(row:any){
    if(!supabase||!config||!isAdmin)return;
    if(!window.confirm("Delete this record? This cannot be undone."))return;
    const {error}=await supabase.from(config.table).delete().eq("id",row.id);
    if(error)setMessage("Could not delete: "+error.message);else{await logAction("delete",section,row.id);await load();}
  }
  const filtered = useMemo(()=>rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase())),[rows,search]);

  if(config){
    if(config.adminOnly && !isAdmin)return <Denied/>;
    if(profile.role==="storekeeper" && !config.storeAllowed)return <Denied/>;
    return <section className="sitePage modulePage">
      <div className="siteIntro"><div><span className="eyebrow dark">PTC GARAGE WORKSPACE</span><h1>{config.title}</h1><p>{config.description}</p></div><div className="moduleHeaderActions">{(isAdmin||(profile.role==="storekeeper"&&config.table==="general_store_items"))&&<select aria-label="Filter by site" value={siteId} onChange={e=>setSiteId(e.target.value)}><option value="">All sites</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}<button className="refreshBtn" onClick={load}>Refresh</button><button className="primaryBtn siteSave" onClick={startAdd}>+ Add new</button></div></div>
      {message&&<div className={message.includes("successfully")?"siteSuccess":"siteError"}>{message}</div>}
      {formOpen&&<div className="siteFormCard"><div className="siteFormTitle"><div className="siteIcon">＋</div><div><h3>{editing?"Update record":"Add new record"}</h3><p>Fields marked required must be completed.</p></div></div>
        <form className="siteForm" onSubmit={save}>
          {(isAdmin||(profile.role==="storekeeper"&&config.table==="general_store_items"))&&<div className="siteFields"><label>Site<select required value={siteId} onChange={e=>setSiteId(e.target.value)}><option value="">Select site</option>{sites.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>}
          <div className="siteFields moduleFields">{config.fields.map(f=><label key={f.key}>{f.label}{f.type==="textarea"?<textarea value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>:f.type==="select"?<select value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:<input type={f.type==="number"?"number":f.type==="date"?"date":"text"} min={f.type==="number"?(f.key==="repeat_interval"?"0.01":"0"):undefined} value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>}</label>)}</div>
          <div className="siteFormActions"><button type="button" className="secondaryBtn" onClick={()=>setFormOpen(false)}>Cancel</button><button className="primaryBtn siteSave" disabled={saving}>{saving?"Saving...":editing?"Save changes":"Save record"}</button></div>
        </form>
      </div>}
      <div className="moduleToolbar"><input placeholder="Search records..." value={search} onChange={e=>setSearch(e.target.value)}/><span>{filtered.length} records</span></div>
      {loading?<div className="siteEmpty">Loading records...</div>:<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Site</th>{config.fields.map(f=><th key={f.key}>{f.label}</th>)}<th>Updated</th><th>Actions</th></tr></thead><tbody>
        {filtered.map(row=><tr key={row.id}><td>{siteName(row.site_id)}</td>{config.fields.map(f=><td key={f.key}>{row[f.key]===null||row[f.key]===undefined?"—":String(row[f.key])}</td>)}<td>{row.updated_at?new Date(row.updated_at).toLocaleDateString():new Date(row.created_at).toLocaleDateString()}</td><td><div className="siteActions"><button className="iconAction" onClick={()=>startEdit(row)}>Edit</button>{isAdmin&&<button className="iconAction deactivate" onClick={()=>remove(row)}>Delete</button>}</div></td></tr>)}
        {filtered.length===0&&<tr><td colSpan={config.fields.length+3}>No records found. Add a new record to get started.</td></tr>}
      </tbody></table></div>}
      {(section==="breakdowns"||section==="maintenance")&&<><div className="siteListHeader"><div><h3>Historical vehicle visit records</h3><p>Existing records from the original Vehicle IN / OUT workflow are preserved here.</p></div><span className="siteCount">{legacyRows.length} Records</span></div><div className="siteTableWrap"><table className="siteTable"><thead><tr><th>PTC ID</th><th>Vehicle</th><th>Problem / work</th><th>Purpose</th><th>IN date</th><th>OUT date</th><th>Status</th></tr></thead><tbody>{legacyRows.map(v=><tr key={v.id}><td>{v.ptc_id||"—"}</td><td>{v.vehicle_type}</td><td>{v.complaint}</td><td>{v.purpose_of_visit}</td><td>{new Date(v.in_at).toLocaleString()}</td><td>{v.out_at?new Date(v.out_at).toLocaleString():"—"}</td><td>{v.status}</td></tr>)}{legacyRows.length===0&&<tr><td colSpan={7}>No historical records found for this category.</td></tr>}</tbody></table></div></>}
      <div className="siteFootnote">Access is enforced by Supabase Row Level Security. Supervisors are limited to their assigned site; Store Keeper access is restricted to parts and stores modules.</div>
    </section>;
  }

  if(section==="private-chat")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">COLLABORATION</span><h1>Private chat</h1><p>Send a direct message to one team member, or leave recipient as Team broadcast.</p></div><button className="refreshBtn" onClick={loadChat}>Refresh</button></div>
    {message&&<div className="siteError">{message}</div>}<div className="chatPanel"><div className="chatMessages">{chatRows.map(m=><div className={m.sender_id===profile.user_id?"chatBubble mine":"chatBubble"} key={m.id}><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}{chatRows.length===0&&<p className="muted">No messages yet.</p>}</div><form onSubmit={sendChat} className="chatComposer"><select aria-label="Message recipient" value={recipientId} onChange={e=>setRecipientId(e.target.value)}><option value="">Team broadcast</option>{chatUsers.map(u=><option key={u.user_id} value={u.user_id}>{u.full_name} · {u.username||u.role}</option>)}</select><textarea value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Write a team message..." maxLength={4000} required/><button className="primaryBtn siteSave">Send message</button></form></div>
  </section>;

  if(section==="notifications")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">OVERVIEW</span><h1>Notifications</h1><p>Your account notifications and updates.</p></div><button className="refreshBtn" onClick={loadNotifications}>Refresh</button></div><div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Time</th><th>Notification</th><th>Message</th><th>Status</th><th/></tr></thead><tbody>{rows.map(n=><tr key={n.id}><td>{new Date(n.created_at).toLocaleString()}</td><td>{n.title}</td><td>{n.message}</td><td>{n.is_read?"Read":"Unread"}</td><td>{!n.is_read&&<button className="iconAction" onClick={async()=>{await supabase?.from("notifications").update({is_read:true}).eq("id",n.id);await loadNotifications();}}>Mark read</button>}</td></tr>)}</tbody></table></div>{rows.length===0&&<div className="siteEmpty">No notifications yet.</div>}</section>;

  if(section==="my-profile")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ACCOUNT</span><h1>My profile</h1><p>Your current sign-in and access information.</p></div></div><div className="profileSummary"><div><small>FULL NAME</small><b>{profile.full_name}</b></div><div><small>USER ID</small><b>{profile.username||"—"}</b></div><div><small>ROLE</small><b>{profile.role}</b></div><div><small>ASSIGNED SITE</small><b>{profile.role==="admin"?"All sites":siteName(profile.site_id)}</b></div></div></section>;

  if(section==="home"||section==="my-actions")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">OVERVIEW</span><h1>{section==="home"?"Workspace home":"My actions"}</h1><p>{section==="home"?"Shortcuts to the main garage workflows.":"Tasks and records that need your attention."}</p></div></div><div className="moduleQuickLinks"><button onClick={()=>onNavigate("vehicle-in")}>Vehicle IN</button><button onClick={()=>onNavigate("parts-order")}>Parts Orders</button><button onClick={()=>onNavigate("breakdowns")}>Breakdowns</button><button onClick={()=>onNavigate("maintenance")}>Preventive Maintenance</button></div><p className="siteFootnote">Use the sidebar to open a module. Assigned-site and role permissions remain active.</p></section>;

  if(section==="roles-permissions")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Roles and permissions</h1><p>Core role boundaries are protected at database level.</p></div></div><div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Role</th><th>Access</th><th>Site scope</th><th>Security</th></tr></thead><tbody><tr><td>Admin</td><td>All modules and administration</td><td>All sites</td><td>Full access</td></tr><tr><td>Supervisor</td><td>Vehicles, breakdowns, maintenance, parts, tasks</td><td>Assigned site only</td><td>RLS enforced</td></tr><tr><td>Store Keeper</td><td>Parts orders, receipts, general stores</td><td>All sites; no vehicle records</td><td>RLS enforced</td></tr></tbody></table></div><div className="siteFootnote">Changing core role access requires a reviewed database policy migration. This prevents an Admin from accidentally granting vehicle data access to a Store Keeper.</div></section>;

  if(section==="settings")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Settings</h1><p>Workspace branding and general preferences.</p></div></div><div className="siteFormCard"><form className="siteForm" onSubmit={async e=>{e.preventDefault();if(!supabase)return;setSettingNotice("");const values=[["app_name",settingName],["primary_color",settingColor],["language",settingLanguage]];for(const [k,v] of values){const {error}=await supabase.from("app_settings").upsert({setting_key:k,setting_value:{value:v},updated_by:profile.user_id});if(error){setSettingNotice(error.message);return;}}setSettingNotice("Settings saved successfully.");await logAction("update","settings",null,{app_name:settingName,primary_color:settingColor,language:settingLanguage});}}><div className="siteFields"><label>Application name<input value={settingName} onChange={e=>setSettingName(e.target.value)}/></label><label>Primary colour<input type="color" value={settingColor} onChange={e=>setSettingColor(e.target.value)}/></label><label>Language<select value={settingLanguage} onChange={e=>setSettingLanguage(e.target.value)}><option>English</option><option>Arabic</option></select></label></div><div className="siteFormActions"><button className="primaryBtn siteSave">Save settings</button></div>{settingNotice&&<div className={settingNotice.includes("successfully")?"siteSuccess":"siteError"}>{settingNotice}</div>}</form></div><div className="siteFootnote">AI integrations, external messaging and advanced feature switches are not enabled by this build; no external API keys are stored in the browser.</div></section>;

  if(section==="audit-history")return <AuditHistory profile={profile}/>;
  if(section==="system-health")return <SystemHealth sites={sites}/>;
  if(section==="master-data")return <MasterData profile={profile}/>;
  if(section==="historical-imports")return <HistoricalImports profile={profile}/>;
  if(section==="ask-ptc-data")return <AskData/>;
  if(section==="centralized-reports")return <CentralReports profile={profile} sites={sites}/>;
  if(section==="parts-purchasing")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">PARTS AND SERVICES</span><h1>Parts and purchasing</h1><p>Purchasing updates are handled in Parts Order History to keep request, invoice and receipt records linked.</p></div></div><p className="siteFootnote">Open Parts Order History to enter Request Number, Request Date, Invoice Number, Invoice Date and Cost. Store Keeper can see all sites; vehicle details remain hidden from Store Keeper.</p></section>;
  if(section==="help-guide")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">SUPPORT</span><h1>Help and user guide</h1><p>Quick instructions for the PTC Garage workspace.</p></div></div><div className="helpGrid"><article><h3>Vehicle IN / OUT</h3><p>Register a vehicle at the assigned garage, record the complaint and purpose, then use Vehicle OUT to record work details and release time.</p></article><article><h3>Parts workflow</h3><p>Supervisors raise parts requests. Store Keeper enters request and invoice details. Garage staff confirms physical receipt.</p></article><article><h3>Maintenance</h3><p>Create preventive maintenance schedules and update status, meter values and due dates as work progresses.</p></article><article><h3>Access control</h3><p>Admin manages all sites. Supervisors work within assigned sites. Store Keeper has parts-only access across sites.</p></article></div></section>;

  return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">PTC GARAGE</span><h1>Module unavailable</h1><p>This module is not available for the current role.</p></div></div></section>;
}

function Denied(){return <section className="sitePage"><div className="siteError">You do not have permission to access this module.</div></section>;}
function AuditHistory({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);const [error,setError]=useState("");
 useEffect(()=>{void(async()=>{const {data,error}=await supabase!.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(500);if(error)setError(error.message);else setRows(data||[]);})();},[]);
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Audit history</h1><p>Recent recorded changes made through the application.</p></div></div>{error&&<div className="siteError">{error}</div>}<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th><th>Record ID</th><th>Details</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.user_id===profile.user_id?"You":r.user_id}</td><td>{r.action}</td><td>{r.module}</td><td>{r.record_id||"—"}</td><td><code>{JSON.stringify(r.details)}</code></td></tr>)}</tbody></table></div></section>;
}
function SystemHealth({sites}:{sites:Site[]}){
 const [health,setHealth]=useState<any[]>([]);const [checked,setChecked]=useState(false);
 useEffect(()=>{void(async()=>{const tables=["sites","profiles","vehicle_visits","parts_orders","parts_receipts","breakdown_jobs","preventive_maintenance","ptc_assets","general_store_items","tasks_projects"];const out=await Promise.all(tables.map(async t=>{const {count,error}=await supabase!.from(t).select("*",{count:"exact",head:true});return {table:t,ok:!error,count:count||0,error:error?.message};}));setHealth(out);setChecked(true);})();},[]);
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>System health</h1><p>Live database connectivity and key table checks.</p></div><span className="statusActive">{sites.length} sites loaded</span></div><div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Component</th><th>Status</th><th>Records</th><th>Details</th></tr></thead><tbody>{health.map(h=><tr key={h.table}><td>{h.table}</td><td>{h.ok?<span className="statusActive">Connected</span>:<span className="statusInactive">Error</span>}</td><td>{h.count}</td><td>{h.error||"Query successful"}</td></tr>)}</tbody></table></div>{checked&&<p className="siteFootnote">Checks completed. Counts are subject to the signed-in role's Row Level Security visibility.</p>}</section>;
}
function MasterData({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);const [category,setCategory]=useState("Vehicle Type");const [code,setCode]=useState("");const [label,setLabel]=useState("");const [notice,setNotice]=useState("");
 async function load(){const {data,error}=await supabase!.from("master_data").select("*").order("category").order("label");if(error)setNotice(error.message);else setRows(data||[]);}
 useEffect(()=>{void load();},[]);
 async function add(e:React.FormEvent){e.preventDefault();const {error}=await supabase!.from("master_data").insert({category,code,label});setNotice(error?error.message:"Master data added.");if(!error){setCode("");setLabel("");await load();}}
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Master data</h1><p>Maintain reusable dropdown values and classifications.</p></div></div><div className="siteFormCard"><form className="siteForm" onSubmit={add}><div className="siteFields"><label>Category<input value={category} onChange={e=>setCategory(e.target.value)} required/></label><label>Code<input value={code} onChange={e=>setCode(e.target.value)} required/></label><label>Label<input value={label} onChange={e=>setLabel(e.target.value)} required/></label></div><div className="siteFormActions"><button className="primaryBtn siteSave">Add value</button></div>{notice&&<div className="siteSuccess">{notice}</div>}</form></div><div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Category</th><th>Code</th><th>Label</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.category}</td><td>{r.code}</td><td>{r.label}</td><td>{r.is_active?"Active":"Inactive"}</td></tr>)}</tbody></table></div></section>;
}
function HistoricalImports({profile}:{profile:Profile}){
 const [raw,setRaw]=useState("");const [notice,setNotice]=useState("");
 async function importRows(e:React.FormEvent){e.preventDefault();if(!supabase)return;let parsed:any;try{parsed=JSON.parse(raw);}catch{setNotice("Paste a valid JSON array. Each row must match the selected table columns.");return;}if(!Array.isArray(parsed)||parsed.length===0){setNotice("Provide a non-empty JSON array.");return;}if(parsed.length>500){setNotice("Maximum 500 records per import.");return;}const allowed=["ptc_assets","general_store_items","preventive_maintenance"];const table=window.prompt("Enter target table: ptc_assets, general_store_items, preventive_maintenance");if(!table||!allowed.includes(table)){setNotice("Import cancelled or unsupported table.");return;}const {error}=await supabase.from(table).insert(parsed.map((r:any)=>({...r,created_by:profile.user_id,site_id:r.site_id||profile.site_id})));setNotice(error?"Import failed: "+error.message:"Historical records imported successfully.");}
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Historical imports</h1><p>Import older asset, stores or maintenance records without replacing existing data.</p></div></div><div className="siteFormCard"><form className="siteForm" onSubmit={importRows}><label>Paste JSON array<textarea rows={10} value={raw} onChange={e=>setRaw(e.target.value)} placeholder={'[{"site_id":"...","asset_name":"..."}]'} required/></label><div className="siteFormActions"><button className="primaryBtn siteSave">Validate and import</button></div>{notice&&<div className={notice.includes("successfully")?"siteSuccess":"siteError"}>{notice}</div>}</form></div><div className="siteFootnote">Use only the supported table field names. Import is additive; existing records are not deleted. Back up your data before large imports.</div></section>;
}
function AskData(){
 const [q,setQ]=useState("");
 const [result,setResult]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false);
 const [error,setError]=useState("");
 const sourceNames:Record<string,string>={vehicle_visits:"Vehicle IN / OUT",parts_orders:"Parts orders",breakdown_jobs:"Breakdown jobs",preventive_maintenance:"Preventive maintenance",ptc_assets:"PTC assets"};
 const labels:Record<string,string>={ptc_id:"PTC ID",vehicle_type:"Vehicle / Equipment",purpose_of_visit:"Visit purpose",complaint:"Problem / Complaint",work_description:"Work description",status:"Status",in_at:"Vehicle IN",out_at:"Vehicle OUT",in_remark:"IN remarks",out_remark:"OUT remarks",part_name:"Part name",part_number:"Part number",quantity:"Quantity",order_status:"Order status",request_number:"Request number",invoice_number:"Invoice number",maintenance_work:"Maintenance work",expected_due_date:"Due date",repeat_by:"Schedule type",repeat_interval:"Repeat interval",asset_name:"Asset name",asset_type:"Asset type",serial_number:"Serial number",make_model:"Make / Model",priority:"Priority",assigned_to:"Assigned to",started_at:"Work started",completed_at:"Completed",remarks:"Remarks",created_at:"Created",updated_at:"Last updated",site_id:"Site ID",created_by:"Created by"};
 const important=["ptc_id","vehicle_type","asset_name","part_name","part_number","maintenance_work","complaint","work_description","purpose_of_visit","status","order_status","priority","request_number","invoice_number","quantity","site_id","in_at","out_at","expected_due_date","created_at"];
 const label=(key:string)=>labels[key]||key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
 const value=(key:string,v:any)=>{
   if(v===null||v===undefined||v==="")return "—";
   if(typeof v==="boolean")return v?"Yes":"No";
   if(Array.isArray(v))return v.length?v.map((item:any)=>typeof item==="object"?Object.entries(item).map(([k,x])=>label(k)+": "+String(x??"—")).join(" · "):String(item)).join(" | "):"—";
   if(typeof v==="object")return Object.entries(v).map(([k,x])=>label(k)+": "+String(x??"—")).join(" · ")||"—";
   if(/(^|_)(at|date|time)$/.test(key)&&!Number.isNaN(Date.parse(String(v))))return new Date(v).toLocaleString();
   return String(v);
 };
 const cardStyle:React.CSSProperties={background:"#fff",border:"1px solid #e4e9ee",borderRadius:14,padding:18,boxShadow:"0 3px 12px rgba(16,24,40,.04)"};
 const fieldStyle:React.CSSProperties={background:"#f7f9fb",borderRadius:10,padding:"10px 12px",minWidth:0};
 async function search(e:React.FormEvent){
   e.preventDefault();if(!q.trim()||!supabase)return;
   setBusy(true);setError("");setSearched(true);
   const terms=q.trim();
   const tables=["vehicle_visits","parts_orders","breakdown_jobs","preventive_maintenance","ptc_assets"];
   const responses=await Promise.all(tables.map(async table=>{
     const {data,error}=await supabase.from(table).select("*").limit(500);
     if(error)return {table,error:error.message,rows:[] as any[]};
     return {table,error:"",rows:(data||[]).filter((r:any)=>JSON.stringify(r).toLowerCase().includes(terms.toLowerCase()))};
   }));
   const failures=responses.filter(x=>x.error);
   const found=responses.flatMap(x=>x.rows.map((r:any)=>({table:x.table,...r})));
   setResult(found.slice(0,100));
   if(failures.length===tables.length)setError("Could not search records. Please check your database connection and access permissions.");
   else if(failures.length)setError("Some record categories could not be searched. Results below may be incomplete.");
   setBusy(false);
 }
 return <section className="sitePage">
   <div className="siteIntro"><div><span className="eyebrow dark">PTC DATA ASSISTANT</span><h1>Ask PTC Data</h1><p>Search vehicle, breakdown, maintenance, parts and asset records using a PTC ID or keyword.</p></div></div>
   <form onSubmit={search} style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",background:"#fff",border:"1px solid #e4e9ee",borderRadius:14,padding:14,marginBottom:18}}>
     <input style={{flex:"1 1 260px",minWidth:0}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search PTC ID, vehicle, part, complaint or request number..." required/>
     <button className="primaryBtn siteSave" disabled={busy}>{busy?"Searching...":"Search records"}</button>
     <button type="button" className="secondaryBtn" disabled={busy||!q} onClick={()=>{setQ("");setResult([]);setSearched(false);setError("");}}>Clear</button>
   </form>
   {error&&<div className="siteError" style={{marginBottom:14}}>{error}</div>}
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,margin:"8px 0 14px",flexWrap:"wrap"}}>
     <div><h3 style={{margin:0,fontSize:18,color:"#172b3a"}}>{searched?"Search results":"Ready to search"}</h3><p style={{margin:"4px 0 0",color:"#718096",fontSize:13}}>{busy?"Searching available records...":searched?(result.length+" record"+(result.length===1?"":"s")+" found"+(result.length===100?" (showing first 100)":"")):"Enter a PTC ID or keyword to find matching records."}</p></div>
     {result.length>0&&<span className="siteCount">{result.length} Results</span>}
   </div>
   {busy?<div className="siteEmpty">Searching records...</div>:result.length===0&&searched?<div className="siteEmpty">No matching records found. Try another PTC ID or keyword.</div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))",gap:14}}>
     {result.map((r,i)=>{
       const id=String(r.id||r.table+"-"+i);
       const headline=r.ptc_id||r.part_name||r.asset_name||r.maintenance_work||r.request_number||r.complaint||("Record "+(i+1));
       const mainKeys=important.filter(k=>r[k]!==null&&r[k]!==undefined&&r[k]!==""&&k!=="created_at"&&k!=="site_id");
       const shown=mainKeys.slice(0,6);
       return <article key={r.table+"-"+id} style={cardStyle}>
         <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:13}}>
           <div style={{minWidth:0}}><span style={{fontSize:11,fontWeight:700,letterSpacing:".07em",color:"#087a46",textTransform:"uppercase"}}>{sourceNames[r.table]||r.table.replace(/_/g," ")}</span><h3 style={{margin:"5px 0 0",fontSize:19,color:"#172b3a",overflowWrap:"anywhere"}}>{String(headline)}</h3></div>
           <span style={{fontSize:11,fontWeight:700,background:/complete|received|out|active/i.test(String(r.status||r.order_status||""))?"#e7f6ed":"#eef3f8",color:/complete|received|out|active/i.test(String(r.status||r.order_status||""))?"#187044":"#425466",borderRadius:20,padding:"6px 10px",whiteSpace:"nowrap"}}>{String(r.status||r.order_status||"Record")}</span>
         </div>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:8}}>
           {shown.map(k=><div key={k} style={fieldStyle}><div style={{fontSize:10,fontWeight:700,color:"#718096",textTransform:"uppercase",marginBottom:4}}>{label(k)}</div><div style={{fontSize:13,color:"#243746",overflowWrap:"anywhere",fontWeight:600}}>{value(k,r[k])}</div></div>)}
         </div>
         <details style={{marginTop:13,borderTop:"1px solid #edf0f3",paddingTop:10}}>
           <summary style={{cursor:"pointer",fontWeight:700,fontSize:13,color:"#087a46",outline:"none"}}>View complete record details</summary>
           <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:12}}>
             {Object.entries(r).filter(([k,v])=>v!==null&&v!==undefined&&v!=="").map(([k,v])=><div key={k} style={fieldStyle}><div style={{fontSize:10,fontWeight:700,color:"#718096",textTransform:"uppercase",marginBottom:4}}>{label(k)}</div><div style={{fontSize:13,color:"#243746",overflowWrap:"anywhere",whiteSpace:"pre-wrap"}}>{value(k,v)}</div></div>)}
           </div>
         </details>
       </article>;
     })}
   </div>}
   <div className="siteFootnote" style={{marginTop:18}}>Search results show only records permitted by your signed-in account and Supabase access policies. This screen does not edit or delete any records.</div>
 </section>;
}
function CentralReports({profile,sites}:{profile:Profile;sites:Site[]}){
 const [summary,setSummary]=useState<any[]>([]);
 useEffect(()=>{void(async()=>{const tables=profile.role==="storekeeper"?["parts_orders","parts_receipts","general_store_items","tasks_projects"]:["vehicle_visits","parts_orders","parts_receipts","breakdown_jobs","preventive_maintenance","ptc_assets","general_store_items","tasks_projects"];const rows=await Promise.all(tables.map(async t=>{const {count}=await supabase!.from(t).select("*",{count:"exact",head:true});return {name:t,count:count||0};}));setSummary(rows);})();},[]);
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">INSIGHTS</span><h1>Centralized reports</h1><p>Live record totals across available operational modules.</p></div></div><div className="moduleStats">{summary.map(x=><article key={x.name}><small>{x.name.replace(/_/g," ")}</small><b>{x.count}</b></article>)}</div><p className="siteFootnote">Counts reflect the signed-in role's permitted data. For date-range vehicle exports, use Report Creation.</p></section>;
}
