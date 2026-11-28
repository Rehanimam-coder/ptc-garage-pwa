"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import MaintenanceHistory from "@/components/MaintenanceHistory";

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
  const [breakdownMode,setBreakdownMode] = useState<"easy"|"advanced">("easy");
  const [breakdownSummary,setBreakdownSummary] = useState("");
  const [breakdownFaultType,setBreakdownFaultType] = useState("Mechanical");
  const [siteId,setSiteId] = useState(profile.site_id || "");
  const [search,setSearch] = useState("");
  const [statusFilter,setStatusFilter] = useState("all");
  const [viewMode,setViewMode] = useState<"cards"|"compact">("cards");
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
  function startAdd(){if(!config)return;setEditing(null);setForm(empty(config.fields));setBreakdownMode("easy");setBreakdownSummary("");setBreakdownFaultType("Mechanical");setFormOpen(true);setMessage("");}
  function startEdit(row:any){if(!config)return;setEditing(row);setForm(Object.fromEntries(config.fields.map(f=>[f.key,row[f.key]==null?"":String(row[f.key]).slice(0,10)])));setBreakdownMode("advanced");setBreakdownSummary("");setBreakdownFaultType("Mechanical");setFormOpen(true);setMessage("");}
  async function save(e:React.FormEvent){
    e.preventDefault(); if(!supabase||!config)return;
    const actualSite = (isAdmin || (profile.role === "storekeeper" && config.table === "general_store_items")) ? siteId : profile.site_id;
    if(config.table!=="tasks_projects" && !actualSite){setMessage("Please select or request an assigned site.");return;}
    const payload:any={};
    config.fields.forEach(f=>{const v=form[f.key]?.trim()||null;payload[f.key]=f.type==="number"?(v===null?null:Number(v)):v;});
    if(section==="breakdowns"){
      const description=form.complaint?.trim()||"";
      payload.complaint=[`Summary: ${breakdownSummary.trim()}`,`Fault type: ${breakdownFaultType}`,description].filter(Boolean).join("\n\n");
    }
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
  const statusKey = useMemo(()=>config?.fields.find(f=>/^(status|order_status|employment_status|priority)$/i.test(f.key))?.key || "",[config]);
  const statusOptions = useMemo(()=>Array.from(new Set(rows.map(r=>String(statusKey ? r[statusKey] || "" : "").trim()).filter(Boolean))).sort(),[rows,statusKey]);
  const filtered = useMemo(()=>rows.filter(r=>{
    const searchable = Object.fromEntries([...(config?.fields || []).map(field => [field.key, r[field.key]]), ["site", siteName(r.site_id)]]);
    const matchesSearch = JSON.stringify(searchable).toLowerCase().includes(search.toLowerCase());
    const status = String(statusKey ? r[statusKey] || "" : "").toLowerCase();
    const matchesStatus = statusFilter==="all" || (statusFilter==="open" ? !/complete|closed|cancelled|inactive|disposed|paused/i.test(status) : status===statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  }),[rows,search,statusFilter,statusKey]);
  function exportRecords(){
    if(!config || !filtered.length)return;
    const keys=Array.from(new Set([...config.fields.map(f=>f.key),"created_at","updated_at"]));
    const csv=[keys,...filtered.map(row=>keys.map(key=>row[key]??""))].map(line=>line.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
    const link=document.createElement("a");link.href=url;link.download=section.replace(/[^a-z0-9-]/gi,"_")+"_records.csv";link.click();URL.revokeObjectURL(url);
  }

  if(config){
    if(config.adminOnly && !isAdmin)return <Denied/>;
    if(profile.role==="storekeeper" && !config.storeAllowed)return <Denied/>;
    return <section className="sitePage modulePage">
      <div className="siteIntro"><div><span className="eyebrow dark">PTC GARAGE WORKSPACE</span><h1>{config.title}</h1><p>{config.description}</p></div><div className="moduleHeaderActions">{(isAdmin||(profile.role==="storekeeper"&&config.table==="general_store_items"))&&<select aria-label="Filter by site" value={siteId} onChange={e=>setSiteId(e.target.value)}><option value="">All sites</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}<button className="refreshBtn" onClick={load}>Refresh</button><button className="primaryBtn siteSave" onClick={startAdd}>+ Add new</button></div></div>
      {message&&<div className={message.includes("successfully")?"siteSuccess":"siteError"}>{message}</div>}
      {formOpen&&<div className="siteFormCard"><div className="siteFormTitle"><div className="siteIcon">＋</div><div><h3>{editing?"Update record":"Add new record"}</h3><p>Fields marked required must be completed.</p></div></div>
        <form className="siteForm" onSubmit={save}>
          {(isAdmin||(profile.role==="storekeeper"&&config.table==="general_store_items"))&&<div className="siteFields"><label>Site<select required value={siteId} onChange={e=>setSiteId(e.target.value)}><option value="">Select site</option>{sites.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>}
          {section==="breakdowns"?<div className="breakdownReportForm">
            <div className="breakdownModeTabs" role="tablist" aria-label="Breakdown form mode">
              <button type="button" className={breakdownMode==="easy"?"active":""} onClick={()=>setBreakdownMode("easy")}>Easy mode <small>Quick report</small></button>
              <button type="button" className={breakdownMode==="advanced"?"active":""} onClick={()=>setBreakdownMode("advanced")}>Advanced mode <small>More job details</small></button>
            </div>
            <div className="breakdownFormGrid">
              <section className="breakdownFormPanel">
                <div className="breakdownPanelHeading"><span className="breakdownStep">01</span><div><h4>Select the asset</h4><p>Identify the vehicle or equipment that needs attention.</p></div></div>
                <div className="siteFields">
                  <label>PTC ID<input value={form.ptc_id||""} required placeholder="Enter PTC ID" onChange={e=>setForm(p=>({...p,ptc_id:e.target.value}))}/></label>
                  <label>Vehicle / equipment<input value={form.vehicle_type||""} required placeholder="e.g. Pickup, bus, generator" onChange={e=>setForm(p=>({...p,vehicle_type:e.target.value}))}/></label>
                </div>
              </section>
              <section className="breakdownFormPanel">
                <div className="breakdownPanelHeading"><span className="breakdownStep">02</span><div><h4>Describe the problem</h4><p>Give the workshop a clear picture of the issue.</p></div></div>
                <div className="siteFields">
                  <label>Problem summary<input value={breakdownSummary} required placeholder="Short title for this breakdown" onChange={e=>setBreakdownSummary(e.target.value)}/></label>
                  <label>Fault type<select value={breakdownFaultType} onChange={e=>setBreakdownFaultType(e.target.value)}>{["Mechanical","Electrical","Tyre / wheel","Hydraulic","Engine","Body / exterior","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
                  <label className="breakdownDescriptionField">Problem description<textarea value={form.complaint||""} required placeholder="Describe the symptoms, when they started, and any warning signs..." onChange={e=>setForm(p=>({...p,complaint:e.target.value}))}/></label>
                </div>
              </section>
            </div>
            {breakdownMode==="advanced"&&<section className="breakdownFormPanel breakdownAdvancedPanel"><div className="breakdownPanelHeading"><span className="breakdownStep">03</span><div><h4>Job details</h4><p>Set priority, ownership and repair tracking information.</p></div></div><div className="siteFields moduleFields">{config.fields.filter(f=>!["ptc_id","vehicle_type","complaint"].includes(f.key)).map(f=><label key={f.key}>{f.label}{f.type==="textarea"?<textarea value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>:f.type==="select"?<select value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:<input type={f.type==="number"?"number":f.type==="date"?"date":"text"} value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>}</label>)}</div></section>}
          </div>:<div className="siteFields moduleFields">{config.fields.map(f=><label key={f.key}>{f.label}{f.type==="textarea"?<textarea value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>:f.type==="select"?<select value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:<input type={f.type==="number"?"number":f.type==="date"?"date":"text"} min={f.type==="number"?(f.key==="repeat_interval"?"0.01":"0"):undefined} value={form[f.key]||""} required={f.required} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>}</label>)}</div>}
          <div className="siteFormActions"><button type="button" className="secondaryBtn" onClick={()=>setFormOpen(false)}>Cancel</button><button className="primaryBtn siteSave" disabled={saving}>{saving?"Saving...":editing?"Save changes":"Save record"}</button></div>
        </form>
      </div>}
      <div className="moduleToolbar moduleToolbarAdvanced">
        <input aria-label="Search records" placeholder="Search by name, PTC ID, description, or summary" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select aria-label="Filter records" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">All permitted</option><option value="open">Open / active</option>{statusOptions.map(option=><option key={option} value={option}>{option}</option>)}
        </select>
        <button type="button" className={statusFilter==="all"?"toolbarChip active":"toolbarChip"} onClick={()=>setStatusFilter("all")}>All permitted</button>
        <button type="button" className={statusFilter==="open"?"toolbarChip active":"toolbarChip"} onClick={()=>setStatusFilter("open")}>Open</button>
        <button type="button" className="toolbarIconButton" title="Show cards" aria-pressed={viewMode==="cards"} onClick={()=>setViewMode("cards")}>▦</button>
        <button type="button" className="toolbarIconButton" title="Show compact list" aria-pressed={viewMode==="compact"} onClick={()=>setViewMode("compact")}>☷</button>
        <button type="button" className="toolbarIconButton" title="Export visible records" onClick={exportRecords} disabled={!filtered.length}>↓</button>
        <span>{filtered.length} records</span>
      </div>
      {loading?<div className="siteEmpty">Loading records...</div>:filtered.length===0?<div className="siteEmpty">No records found. Add a new record to get started.</div>:<div className={viewMode==="cards"?"recordCardGrid":"recordCardGrid recordCardGridCompact"}>
        {filtered.map(row=>{const titleField=config.fields.find(f=>/ptc_id|part_name|asset_name|maintenance_work|vehicle_type|item_name|name|title/i.test(f.key));const title=titleField&&row[titleField.key]?String(row[titleField.key]):config.title+" record";const statusField=config.fields.find(f=>/status|priority/i.test(f.key));const highlights=config.fields.filter(f=>f.key!==titleField?.key&&row[f.key]!==null&&row[f.key]!==undefined&&row[f.key]!=="").slice(0,4);return <article className="recordCard" key={row.id}>
          <div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">{siteName(row.site_id)}</span><h3>{title}</h3></div>{statusField&&row[statusField.key]&&<span className="recordStatus">{String(row[statusField.key])}</span>}</div>
          <div className="recordCardFields">{highlights.map(f=><div className="recordCardField" key={f.key}><small>{f.label}</small><b>{String(row[f.key])}</b></div>)}</div>
          <div className="recordCardFoot"><small>Updated {row.updated_at?new Date(row.updated_at).toLocaleDateString():row.created_at?new Date(row.created_at).toLocaleDateString():"—"}</small><div className="siteActions"><button className="iconAction" onClick={()=>startEdit(row)}>Edit</button>{isAdmin&&<button className="iconAction deactivate" onClick={()=>remove(row)}>Delete</button>}</div></div>
          <details className="recordCardDetails"><summary>View complete details <span>→</span></summary><div className="recordCardFields expanded">{config.fields.map(f=><div className="recordCardField" key={f.key}><small>{f.label}</small><b>{row[f.key]===null||row[f.key]===undefined||row[f.key]===""?"—":String(row[f.key])}</b></div>)}<div className="recordCardField"><small>Created</small><b>{row.created_at?new Date(row.created_at).toLocaleString():"—"}</b></div></div></details>
        </article>;})}
      </div>}
      {(section==="breakdowns"||section==="maintenance")&&<><div className="siteListHeader"><div><h3>Historical vehicle visit records</h3><p>Existing records from the original Vehicle IN / OUT workflow are preserved here.</p></div><span className="siteCount">{legacyRows.length} Records</span></div>{legacyRows.length===0?<div className="siteEmpty">No historical records found for this category.</div>:<div className="recordCardGrid">{legacyRows.map(v=><article className="recordCard" key={v.id}><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">{v.ptc_id||"No PTC ID"}</span><h3>{v.vehicle_type||"Vehicle visit"}</h3><small>{v.purpose_of_visit||"—"}</small></div><span className="recordStatus">{v.status||"—"}</span></div><div className="recordCardFields">{[{label:"Problem / work",value:v.complaint},{label:"IN date",value:v.in_at?new Date(v.in_at).toLocaleString():"—"},{label:"OUT date",value:v.out_at?new Date(v.out_at).toLocaleString():"—"}].map(x=><div className="recordCardField" key={x.label}><small>{x.label}</small><b>{x.value||"—"}</b></div>)}</div><details className="recordCardDetails"><summary>View complete details <span>→</span></summary><div className="recordCardFields expanded">{Object.entries(v).filter(([key,value])=>!["id","site_id","created_by","user_id"].includes(key)&&value!==null&&value!==undefined&&value!=="").map(([key,value])=><div className="recordCardField" key={key}><small>{key.replace(/_/g," ")}</small><b>{String(value)}</b></div>)}</div></details></article>)}</div>}</>}
      <div className="siteFootnote">Access is enforced by Supabase Row Level Security. Supervisors are limited to their assigned site; Store Keeper access is restricted to parts and stores modules.</div>
    </section>;
  }

  if(section==="private-chat")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">COLLABORATION</span><h1>Private chat</h1><p>Send a direct message to one team member, or leave recipient as Team broadcast.</p></div><button className="refreshBtn" onClick={loadChat}>Refresh</button></div>
    {message&&<div className="siteError">{message}</div>}<div className="chatPanel"><div className="chatMessages">{chatRows.map(m=><div className={m.sender_id===profile.user_id?"chatBubble mine":"chatBubble"} key={m.id}><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}{chatRows.length===0&&<p className="muted">No messages yet.</p>}</div><form onSubmit={sendChat} className="chatComposer"><select aria-label="Message recipient" value={recipientId} onChange={e=>setRecipientId(e.target.value)}><option value="">Team broadcast</option>{chatUsers.map(u=><option key={u.user_id} value={u.user_id}>{u.full_name} · {u.username||u.role}</option>)}</select><textarea value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Write a team message..." maxLength={4000} required/><button className="primaryBtn siteSave">Send message</button></form></div>
  </section>;

  if(section==="notifications")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">OVERVIEW</span><h1>Notifications</h1><p>Your account notifications and updates.</p></div><button className="refreshBtn" onClick={loadNotifications}>Refresh</button></div><div className="recordCardGrid">{rows.map(n=><article className="recordCard" key={n.id}><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">{new Date(n.created_at).toLocaleString()}</span><h3>{n.title}</h3><small>{n.is_read?"Read":"Unread"}</small></div><span className={n.is_read?"statusInactive":"statusActive"}>{n.is_read?"Read":"Unread"}</span></div><p className="recordCardNote">{n.message}</p><div className="recordCardFoot">{!n.is_read&&<button className="iconAction" onClick={async()=>{await supabase?.from("notifications").update({is_read:true}).eq("id",n.id);await loadNotifications();}}>Mark read</button>}</div><details className="recordCardDetails"><summary>View complete details <span>→</span></summary><div className="recordCardFields expanded"><div className="recordCardField"><small>Notification ID</small><b>{n.id}</b></div><div className="recordCardField"><small>Created</small><b>{new Date(n.created_at).toLocaleString()}</b></div><div className="recordCardField"><small>Message</small><b>{n.message}</b></div></div></details></article>)}</div>{rows.length===0&&<div className="siteEmpty">No notifications yet.</div>}</section>;

  if(section==="my-profile")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ACCOUNT</span><h1>My profile</h1><p>Your current sign-in and access information.</p></div></div><div className="profileSummary"><div><small>FULL NAME</small><b>{profile.full_name}</b></div><div><small>USER ID</small><b>{profile.username||"—"}</b></div><div><small>ROLE</small><b>{profile.role}</b></div><div><small>ASSIGNED SITE</small><b>{profile.role==="admin"?"All sites":siteName(profile.site_id)}</b></div></div></section>;

  if(section==="home"||section==="my-actions")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">OVERVIEW</span><h1>{section==="home"?"Workspace home":"My actions"}</h1><p>{section==="home"?"Shortcuts to the main garage workflows.":"Tasks and records that need your attention."}</p></div></div><div className="moduleQuickLinks"><button onClick={()=>onNavigate("vehicle-in")}>Vehicle IN</button><button onClick={()=>onNavigate("parts-order")}>Parts Orders</button><button onClick={()=>onNavigate("breakdowns")}>Breakdowns</button><button onClick={()=>onNavigate("maintenance")}>Preventive Maintenance</button></div><p className="siteFootnote">Use the sidebar to open a module. Assigned-site and role permissions remain active.</p></section>;

  if(section==="roles-permissions")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Roles and permissions</h1><p>Core role boundaries are protected at database level.</p></div></div><div className="recordCardGrid"><article className="recordCard"><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">SYSTEM ROLE</span><h3>Admin</h3><small>All sites</small></div><span className="recordStatus">Full access</span></div><p className="recordCardNote">All modules and administration.</p><details className="recordCardDetails"><summary>View complete details <span>→</span></summary><div className="recordCardFields expanded"><div className="recordCardField"><small>Security</small><b>Full access</b></div></div></details></article><article className="recordCard"><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">SYSTEM ROLE</span><h3>Supervisor</h3><small>Assigned site only</small></div><span className="recordStatus">RLS enforced</span></div><p className="recordCardNote">Vehicles, breakdowns, maintenance, parts and tasks.</p></article><article className="recordCard"><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">SYSTEM ROLE</span><h3>Store Keeper</h3><small>All sites; no vehicle records</small></div><span className="recordStatus">RLS enforced</span></div><p className="recordCardNote">Parts orders, receipts and general stores.</p></article></div><div className="siteFootnote">Changing core role access requires a reviewed database policy migration. This prevents an Admin from accidentally granting vehicle data access to a Store Keeper.</div></section>;

  if(section==="settings")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Settings</h1><p>Workspace branding and general preferences.</p></div></div><div className="siteFormCard"><form className="siteForm" onSubmit={async e=>{e.preventDefault();if(!supabase)return;setSettingNotice("");const values=[["app_name",settingName],["primary_color",settingColor],["language",settingLanguage]];for(const [k,v] of values){const {error}=await supabase.from("app_settings").upsert({setting_key:k,setting_value:{value:v},updated_by:profile.user_id});if(error){setSettingNotice(error.message);return;}}setSettingNotice("Settings saved successfully.");await logAction("update","settings",null,{app_name:settingName,primary_color:settingColor,language:settingLanguage});}}><div className="siteFields"><label>Application name<input value={settingName} onChange={e=>setSettingName(e.target.value)}/></label><label>Primary colour<input type="color" value={settingColor} onChange={e=>setSettingColor(e.target.value)}/></label><label>Language<select value={settingLanguage} onChange={e=>setSettingLanguage(e.target.value)}><option>English</option><option>Arabic</option></select></label></div><div className="siteFormActions"><button className="primaryBtn siteSave">Save settings</button></div>{settingNotice&&<div className={settingNotice.includes("successfully")?"siteSuccess":"siteError"}>{settingNotice}</div>}</form></div><div className="siteFootnote">AI integrations, external messaging and advanced feature switches are not enabled by this build; no external API keys are stored in the browser.</div></section>;

  if(section==="audit-history")return <AuditHistory profile={profile}/>;
  if(section==="system-health")return <SystemHealth sites={sites}/>;
  if(section==="master-data")return <MasterData profile={profile}/>;
  if(section==="historical-imports")return <HistoricalImports profile={profile}/>;
  if(section==="ask-ptc-data")return <AskData/>;
  if(section==="maintenance-history")return <MaintenanceHistory profile={profile} sites={sites}/>;
  if(section==="centralized-reports")return <CentralReports profile={profile} sites={sites}/>;
  if(section==="parts-purchasing")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">PARTS AND SERVICES</span><h1>Parts and purchasing</h1><p>Purchasing updates are handled in Parts Order History to keep request, invoice and receipt records linked.</p></div></div><p className="siteFootnote">Open Parts Order History to enter Request Number, Request Date, Invoice Number, Invoice Date and Cost. Store Keeper can see all sites; vehicle details remain hidden from Store Keeper.</p></section>;
  if(section==="help-guide")return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">SUPPORT</span><h1>Help and user guide</h1><p>Quick instructions for the PTC Garage workspace.</p></div></div><div className="helpGrid"><article><h3>Vehicle IN / OUT</h3><p>Register a vehicle at the assigned garage, record the complaint and purpose, then use Vehicle OUT to record work details and release time.</p></article><article><h3>Parts workflow</h3><p>Supervisors raise parts requests. Store Keeper enters request and invoice details. Garage staff confirms physical receipt.</p></article><article><h3>Maintenance</h3><p>Create preventive maintenance schedules and update status, meter values and due dates as work progresses.</p></article><article><h3>Access control</h3><p>Admin manages all sites. Supervisors work within assigned sites. Store Keeper has parts-only access across sites.</p></article></div></section>;

  return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">PTC GARAGE</span><h1>Module unavailable</h1><p>This module is not available for the current role.</p></div></div></section>;
}

function Denied(){return <section className="sitePage"><div className="siteError">You do not have permission to access this module.</div></section>;}
function AuditHistory({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);const [error,setError]=useState("");
 useEffect(()=>{void(async()=>{const {data,error}=await supabase!.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(500);if(error)setError(error.message);else setRows(data||[]);})();},[]);
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Audit history</h1><p>Recent recorded changes made through the application.</p></div></div>{error&&<div className="siteError">{error}</div>}<div className="recordCardGrid">{rows.map(r=><article className="recordCard" key={r.id}><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">{new Date(r.created_at).toLocaleString()}</span><h3>{r.action} · {r.module}</h3><small>{r.user_id===profile.user_id?"You":r.user_id}</small></div><span className="recordStatus">Audit</span></div><div className="recordCardFields"><div className="recordCardField"><small>Module</small><b>{r.module}</b></div></div><details className="recordCardDetails"><summary>View complete details <span>→</span></summary><div className="recordCardFields expanded"><div className="recordCardField"><small>Details</small><b>{JSON.stringify(r.details)}</b></div></div></details></article>)}{rows.length===0&&<div className="siteEmpty">No audit records found.</div>}</div></section>;
}
function SystemHealth({sites}:{sites:Site[]}){
 const [health,setHealth]=useState<any[]>([]);const [checked,setChecked]=useState(false);
 useEffect(()=>{void(async()=>{const tables=["sites","profiles","vehicle_visits","parts_orders","parts_receipts","breakdown_jobs","preventive_maintenance","maintenance_history","maintenance_import_batches","maintenance_import_staging","ptc_assets","general_store_items","tasks_projects"];const out=await Promise.all(tables.map(async t=>{const {count,error}=await supabase!.from(t).select("*",{count:"exact",head:true});return {table:t,ok:!error,count:count||0,error:error?.message};}));setHealth(out);setChecked(true);})();},[]);
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>System health</h1><p>Live database connectivity and key table checks.</p></div><span className="statusActive">{sites.length} sites loaded</span></div><div className="recordCardGrid">{health.map(h=><article className="recordCard" key={h.table}><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">DATABASE COMPONENT</span><h3>{h.table.replace(/_/g," ")}</h3><small>{h.error||"Query successful"}</small></div><span className={h.ok?"statusActive":"statusInactive"}>{h.ok?"Connected":"Error"}</span></div><div className="recordCardFields"><div className="recordCardField"><small>Visible records</small><b>{h.count}</b></div><div className="recordCardField"><small>Check status</small><b>{h.ok?"Passed":"Failed"}</b></div></div><details className="recordCardDetails"><summary>View complete details <span>→</span></summary><div className="recordCardFields expanded"><div className="recordCardField"><small>Component</small><b>{h.table.replace(/_/g," ")}</b></div><div className="recordCardField"><small>Diagnostic</small><b>{h.error||"Query successful"}</b></div></div></details></article>)}</div>{checked&&<p className="siteFootnote">Checks completed. Counts are subject to the signed-in role's Row Level Security visibility.</p>}</section>;
}
function MasterData({profile}:{profile:Profile}){
 const [rows,setRows]=useState<any[]>([]);const [category,setCategory]=useState("Vehicle Type");const [code,setCode]=useState("");const [label,setLabel]=useState("");const [notice,setNotice]=useState("");
 async function load(){const {data,error}=await supabase!.from("master_data").select("*").order("category").order("label");if(error)setNotice(error.message);else setRows(data||[]);}
 useEffect(()=>{void load();},[]);
 async function add(e:React.FormEvent){e.preventDefault();const {error}=await supabase!.from("master_data").insert({category,code,label});setNotice(error?error.message:"Master data added.");if(!error){setCode("");setLabel("");await load();}}
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Master data</h1><p>Maintain reusable dropdown values and classifications.</p></div></div><div className="siteFormCard"><form className="siteForm" onSubmit={add}><div className="siteFields"><label>Category<input value={category} onChange={e=>setCategory(e.target.value)}/></label><label>Code<input value={code} onChange={e=>setCode(e.target.value)} required/></label><label>Label<input value={label} onChange={e=>setLabel(e.target.value)} required/></label></div><div className="siteFormActions"><button className="primaryBtn siteSave">Add value</button></div>{notice&&<div className="siteSuccess">{notice}</div>}</form></div><div className="recordCardGrid">{rows.map(r=><article className="recordCard" key={r.id}><div className="recordCardHead"><div className="recordCardTitle"><span className="recordCardEyebrow">{r.category}</span><h3>{r.label}</h3><small>{r.code}</small></div><span className={r.is_active?"statusActive":"statusInactive"}>{r.is_active?"Active":"Inactive"}</span></div><details className="recordCardDetails"><summary>View complete details <span>→</span></summary><div className="recordCardFields expanded"><div className="recordCardField"><small>Category</small><b>{r.category}</b></div><div className="recordCardField"><small>Code</small><b>{r.code}</b></div><div className="recordCardField"><small>Label</small><b>{r.label}</b></div></div></details></article>)}{rows.length===0&&<div className="siteEmpty">No master data values found.</div>}</div></section>;
}
function parseCsvRows(input:string):Record<string,any>[] {
 const lines=input.replace(/^\uFEFF/,"").split(/\r?\n/).filter(line=>line.trim().length>0);
 if(lines.length<2) throw new Error("CSV must include a header row and at least one data row.");
 const parseLine=(line:string)=>{
   const cells:string[]=[];let cell="";let quoted=false;
   for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===","&&!quoted){cells.push(cell.trim());cell="";}else cell+=ch;}
   if(quoted)throw new Error("CSV contains an unfinished quoted value.");
   cells.push(cell.trim());return cells;
 };
 const headers=parseLine(lines[0]).map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase().replace(/[\s-]+/g,"_"));
 if(headers.some(h=>!h))throw new Error("CSV header row contains an empty column name.");
 if(new Set(headers).size!==headers.length)throw new Error("CSV has duplicate column names. Please make each header unique.");
 return lines.slice(1).map((line,index)=>{const cells=parseLine(line);if(cells.length>headers.length)throw new Error("CSV row "+(index+2)+" has more values than the header row.");const row:Record<string,any>={};headers.forEach((h,i)=>{const v=cells[i]??"";if(v!=="")row[h]=v;});if(!Object.keys(row).length)throw new Error("CSV row "+(index+2)+" is empty.");return row;});
}
function HistoricalImports({profile}:{profile:Profile}){
 const [raw,setRaw]=useState("");const [notice,setNotice]=useState("");const [table,setTable]=useState("ptc_assets");const [previewCount,setPreviewCount]=useState(0);const [busy,setBusy]=useState(false);
 const tables=[{value:"ptc_assets",label:"PTC assets"},{value:"general_store_items",label:"General Stores"},{value:"preventive_maintenance",label:"Preventive maintenance"}];
 function parseInput(){
   const input=raw.trim();if(!input)throw new Error("Paste or type your historical data first.");
   let parsed:any;
   if(input.startsWith("[")||input.startsWith("{")){
     try{parsed=JSON.parse(input);}catch{throw new Error("Invalid JSON. Check commas, quotation marks and brackets.");}
     if(Array.isArray(parsed)){}
     else if(parsed&&typeof parsed==="object"){
       const wrapped=parsed.records??parsed.rows??parsed.data??parsed.items;
       parsed=Array.isArray(wrapped)?wrapped:[parsed];
     }else throw new Error("JSON must contain an array of records or one record object.");
   }else{
     parsed=parseCsvRows(input);
   }
   if(!Array.isArray(parsed)||parsed.length===0)throw new Error("No records found. Provide at least one data row.");
   if(parsed.length>500)throw new Error("Maximum 500 records per import.");
   if(parsed.some((row:any)=>!row||typeof row!=="object"||Array.isArray(row)))throw new Error("Every imported record must be a JSON object or a CSV data row.");
   return parsed as Record<string,any>[];
 }
 function validate(){
   try{const rows=parseInput();setPreviewCount(rows.length);setNotice(rows.length+" record(s) ready. Check the selected table, then click Import records.");}
   catch(error){setPreviewCount(0);setNotice(error instanceof Error?error.message:"Could not validate the data.");}
 }
 async function importRows(e:React.FormEvent){
   e.preventDefault();if(!supabase||busy)return;
   let rows:Record<string,any>[];
   try{rows=parseInput();}catch(error){setPreviewCount(0);setNotice(error instanceof Error?error.message:"Could not read the data.");return;}
   setBusy(true);setNotice("Importing "+rows.length+" record(s)...");
   const payload=rows.map(row=>{const {id:_internalId,created_by:_createdBy,...fields}=row;return {...fields,created_by:profile.user_id,site_id:fields.site_id||profile.site_id};});
   const {error}=await supabase.from(table).insert(payload);
   if(error){setNotice("Import failed: "+error.message);setPreviewCount(rows.length);}
   else{setNotice("Successfully imported "+rows.length+" historical record(s) into "+tables.find(x=>x.value===table)?.label+". Existing records were not changed.");setRaw("");setPreviewCount(0);}
   setBusy(false);
 }
 return <section className="sitePage">
   <div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Historical imports</h1><p>Import older asset, stores or maintenance records without replacing existing data.</p></div></div>
   <div className="siteFormCard"><form className="siteForm" onSubmit={importRows}>
     <div className="siteFields"><label>Import into<select value={table} onChange={e=>{setTable(e.target.value);setNotice("");setPreviewCount(0);}}>{tables.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label></div>
     <label>Paste JSON array, JSON object, or CSV<textarea rows={12} value={raw} onChange={e=>{setRaw(e.target.value);setNotice("");setPreviewCount(0);}} placeholder={'CSV example:\nasset_name,asset_type,serial_number\nGenerator,Equipment,GEN-001\n\nJSON example:\n[{"asset_name":"Generator","asset_type":"Equipment"}]'}/></label>
     <div className="siteFormActions"><button type="button" className="secondaryBtn" onClick={validate} disabled={busy}>Validate data</button><button className="primaryBtn siteSave" disabled={busy}>{busy?"Importing...":"Import records"}</button></div>
     {previewCount>0&&<div className="siteSuccess">{previewCount} record(s) validated and ready to import.</div>}
     {notice&&<div className={notice.toLowerCase().includes("fail")||notice.toLowerCase().includes("invalid")||notice.toLowerCase().includes("error")||notice.toLowerCase().includes("empty")||notice.toLowerCase().includes("paste")?"siteError":"siteSuccess"}>{notice}</div>}
   </form></div>
   <div className="siteFootnote">Supported formats: JSON array, one JSON object, JSON wrapped in records / rows / data / items, and CSV with a header row. Maximum 500 records per import. Imports are additive; existing records are not deleted or overwritten. Use the exact database column names in your headers.</div>
 </section>;
}
function AskData(){
 const [q,setQ]=useState("");
 const [result,setResult]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false);
 const [error,setError]=useState("");
 const sourceNames:Record<string,string>={vehicle_visits:"Vehicle IN / OUT",parts_orders:"Parts orders",breakdown_jobs:"Breakdown jobs",preventive_maintenance:"Preventive maintenance",ptc_assets:"PTC assets"};
 const labels:Record<string,string>={ptc_id:"PTC ID",vehicle_type:"Vehicle / Equipment",purpose_of_visit:"Visit purpose",complaint:"Problem / Complaint",work_description:"Work description",status:"Status",in_at:"Vehicle IN",out_at:"Vehicle OUT",in_remark:"IN remarks",out_remark:"OUT remarks",part_name:"Part name",part_number:"Part number",quantity:"Quantity",order_status:"Order status",request_number:"Request number",invoice_number:"Invoice number",maintenance_work:"Maintenance work",expected_due_date:"Due date",repeat_by:"Schedule type",repeat_interval:"Repeat interval",asset_name:"Asset name",asset_type:"Asset type",serial_number:"Serial number",make_model:"Make / Model",priority:"Priority",assigned_to:"Assigned to",started_at:"Work started",completed_at:"Completed",remarks:"Remarks",created_at:"Created",updated_at:"Last updated",};
 const important=["ptc_id","vehicle_type","asset_name","part_name","part_number","maintenance_work","complaint","work_description","purpose_of_visit","status","order_status","priority","request_number","invoice_number","quantity","in_at","out_at","expected_due_date","created_at"];
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
   e.preventDefault();const db=supabase;if(!q.trim()||!db)return;
   setBusy(true);setError("");setSearched(true);
   const terms=q.trim();
   const tables=["vehicle_visits","parts_orders","breakdown_jobs","preventive_maintenance","ptc_assets"];
   const responses=await Promise.all(tables.map(async table=>{
     const {data,error}=await db.from(table).select("*").limit(500);
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
             {Object.entries(r).filter(([k,v])=>!["id","site_id","created_by","user_id","linked_user_id","sender_id","recipient_id"].includes(k)&&v!==null&&v!==undefined&&v!=="").map(([k,v])=><div key={k} style={fieldStyle}><div style={{fontSize:10,fontWeight:700,color:"#718096",textTransform:"uppercase",marginBottom:4}}>{label(k)}</div><div style={{fontSize:13,color:"#243746",overflowWrap:"anywhere",whiteSpace:"pre-wrap"}}>{value(k,v)}</div></div>)}
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
 useEffect(()=>{void(async()=>{const tables=profile.role==="storekeeper"?["parts_orders","parts_receipts","general_store_items"]:["vehicle_visits","parts_orders","parts_receipts","breakdown_jobs","preventive_maintenance","maintenance_history","ptc_assets","general_store_items","tasks_projects"];const rows=await Promise.all(tables.map(async t=>{const {count}=await supabase!.from(t).select("*",{count:"exact",head:true});return {name:t,count:count||0};}));setSummary(rows);})();},[]);
 return <section className="sitePage"><div className="siteIntro"><div><span className="eyebrow dark">INSIGHTS</span><h1>Centralized reports</h1><p>Live record totals across available operational modules.</p></div></div><div className="moduleStats">{summary.map(x=><article key={x.name}><small>{x.name.replace(/_/g," ")}</small><b>{x.count}</b></article>)}</div><p className="siteFootnote">Counts reflect the signed-in role's permitted data. For date-range vehicle exports, use Report Creation.</p></section>;
}
