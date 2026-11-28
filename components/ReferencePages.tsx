"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileBarChart2, KeyRound, Search, ShieldCheck, UserRound, Wrench, ArrowRight, Bell, Gauge } from "lucide-react";

type Profile = { user_id:string; username:string|null; full_name:string; role:"admin"|"supervisor"|"storekeeper"; site_id:string|null; is_active:boolean };
type Site = { id:string; name:string; is_active:boolean };
type Props = { section:string; profile:Profile; sites:Site[]; onNavigate:(section:string)=>void; language:"en"|"ar"; onLanguageChange:(language:"en"|"ar")=>void };

const panel:React.CSSProperties={background:"#fff",border:"1px solid #e1e8f0",borderRadius:18,padding:22,boxShadow:"0 5px 18px rgba(18,38,63,.035)"};
const label:React.CSSProperties={fontSize:12,color:"#64748b",display:"block",marginBottom:6};
const button:React.CSSProperties={border:"1px solid #cbd5e1",background:"#fff",borderRadius:11,padding:"10px 14px",fontWeight:600,cursor:"pointer",color:"#17324d"};
const greenButton:React.CSSProperties={...button,background:"#08683d",borderColor:"#08683d",color:"#fff"};
const field:React.CSSProperties={width:"100%",border:"1px solid #cbd5e1",borderRadius:10,padding:"11px 12px",fontSize:14,background:"#fff",color:"#102033"};
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14};
const title:React.CSSProperties={fontSize:28,fontWeight:800,color:"#101828",margin:"0 0 6px"};
const muted:React.CSSProperties={color:"#64748b",fontSize:14};

export default function ReferencePages({section,profile,sites,onNavigate,language,onLanguageChange}:Props){
 const [breakdowns,setBreakdowns]=useState<any[]>([]);
 const [pm,setPm]=useState<any[]>([]);
 const [tasks,setTasks]=useState<any[]>([]);
 const [visits,setVisits]=useState<any[]>([]);
 const [loading,setLoading]=useState(false);
 const [search,setSearch]=useState("");
 const [moduleFilter,setModuleFilter]=useState("all");
 const [actionTab,setActionTab]=useState("decisions");
 const [from,setFrom]=useState("");
 const [to,setTo]=useState("");
 const [tab,setTab]=useState("profile");
 const [password,setPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [notice,setNotice]=useState("");
 const [saving,setSaving]=useState(false);
 const [preferences,setPreferences]=useState({compact:false,notifications:true});

 const siteName=(id:string|null)=>sites.find(s=>s.id===id)?.name||"—";
 const canSeeVehicles=profile.role!=="storekeeper";
 async function load(){
  if(!supabase)return;
  setLoading(true);
  const requests:any[]=[
   supabase.from("tasks_projects").select("id,title,description,assigned_to,due_date,priority,status,site_id,created_at,updated_at").order("due_date",{ascending:true}).limit(300),
   supabase.from("preventive_maintenance").select("id,ptc_id,vehicle_type,maintenance_work,repeat_by,repeat_interval,last_done_value,current_value,expected_due_date,responsible_person,status,site_id,created_at,updated_at").order("expected_due_date",{ascending:true}).limit(300)
  ];
  if(canSeeVehicles){
   requests.push(supabase.from("breakdown_jobs").select("id,ptc_id,vehicle_type,complaint,priority,status,assigned_to,site_id,created_at,updated_at").order("created_at",{ascending:false}).limit(300));
   requests.push(supabase.from("vehicle_visits").select("id,site_id,ptc_id,vehicle_type,complaint,status,in_at,out_at,purpose_of_visit").order("in_at",{ascending:false}).limit(500));
  }
  const result=await Promise.all(requests);
  setTasks(result[0].error?[]:result[0].data||[]);
  setPm(result[1].error?[]:result[1].data||[]);
  if(canSeeVehicles){setBreakdowns(result[2].error?[]:result[2].data||[]);setVisits(result[3].error?[]:result[3].data||[]);}
  setLoading(false);
 }
 useEffect(()=>{void load();},[section,profile.user_id]);
 const actions=useMemo(()=>{
  const today=new Date().toISOString().slice(0,10);
  const taskItems=tasks.filter(x=>!["Completed","Cancelled"].includes(x.status)).map(x=>({id:x.id,module:"Task",reference:"",title:x.title,due:x.due_date,updated:x.updated_at||x.created_at,status:x.due_date&&x.due_date<today?"Overdue":x.status,site:x.site_id,detail:x.description||"Task / project"}));
  const pmItems=pm.filter(x=>x.status==="Active"&&x.expected_due_date).map(x=>({id:x.id,module:"Preventive maintenance",reference:x.ptc_id,title:x.maintenance_work,due:x.expected_due_date,updated:x.updated_at||x.created_at,status:x.expected_due_date<today?"Overdue":"Scheduled",site:x.site_id,detail:x.vehicle_type||x.repeat_by}));
  const breakdownItems=breakdowns.filter(x=>!["Completed","Cancelled"].includes(x.status)).map(x=>({id:x.id,module:"Breakdown",reference:x.ptc_id||"",title:x.complaint,due:null,updated:x.updated_at||x.created_at,status:x.status,site:x.site_id,detail:x.vehicle_type}));
  return [...taskItems,...pmItems,...breakdownItems].sort((a,b)=>(a.due||"9999-12-31").localeCompare(b.due||"9999-12-31")||(a.updated||"").localeCompare(b.updated||""));
 },[tasks,pm,breakdowns]);
 const filteredActions=actions.filter(x=>(moduleFilter==="all"||x.module===moduleFilter)&&(!search||[x.title,x.reference,x.module,x.detail].join(" ").toLowerCase().includes(search.toLowerCase())));
 const activeBreakdowns=breakdowns.filter(x=>!["Completed","Cancelled"].includes(x.status));
 const critical=breakdowns.filter(x=>["High","Urgent"].includes(x.priority)&&!["Completed","Cancelled"].includes(x.status));
 const overduePm=pm.filter(x=>x.status==="Active"&&x.expected_due_date&&x.expected_due_date<new Date().toISOString().slice(0,10));
 const overdueTasks=tasks.filter(x=>x.status!=="Completed"&&x.due_date&&x.due_date<new Date().toISOString().slice(0,10));
 const completedToday=breakdowns.filter(x=>x.status==="Completed"&&x.updated_at?.slice(0,10)===new Date().toISOString().slice(0,10)).length;
 const completionRate=breakdowns.length?Math.round(breakdowns.filter(x=>x.status==="Completed").length/breakdowns.length*1000)/10:0;
 const visibleVisits=visits.filter(v=>(!from||v.in_at?.slice(0,10)>=from)&&(!to||v.in_at?.slice(0,10)<=to));
 const metric=(name:string,value:number,icon:any,desc:string,target:string)=> <button onClick={()=>onNavigate(target)} style={{...panel,textAlign:"left",cursor:"pointer",minHeight:150}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{background:"#eff6f3",padding:10,borderRadius:12,color:"#08683d"}}>{icon}</span><ArrowRight size={18} color="#94a3b8"/></div><div style={{...muted,marginTop:12}}>{name}</div><div style={{fontSize:32,fontWeight:800,color:"#111827"}}>{value}</div><small style={muted}>{desc}</small></button>;

 if(section==="my-actions")return <section style={{padding:24,display:"grid",gap:20}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h1 style={title}>My actions</h1><p style={muted}>Work that your current role can act on. Open an item to see its checks, quantities and next step.</p></div><span style={{border:"1px solid #087a46",borderRadius:30,padding:"9px 14px",color:"#08683d",background:"#effaf4"}}>{filteredActions.length} actions</span></div>
  <div style={{...panel,display:"grid",gridTemplateColumns:"minmax(240px,2fr) minmax(180px,1fr) auto",gap:14,alignItems:"end"}}>
   <label>Search reference or title<input style={field} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by reference or title"/></label>
   <label>Module<select style={field} value={moduleFilter} onChange={e=>setModuleFilter(e.target.value)}><option value="all">All modules</option><option>Task</option><option>Breakdown</option><option>Preventive maintenance</option></select></label>
   <button style={greenButton} onClick={()=>void load()}><Search size={16}/></button>
   <div style={{gridColumn:"1/-1",...muted}}>Due dates first, then oldest update. Open an item to review its requirements.</div>
   <div style={{display:"flex",gap:10,gridColumn:"1/-1"}}><button style={actionTab==="decisions"?greenButton:button} onClick={()=>setActionTab("decisions")}>Decisions on this page</button><button style={actionTab==="all"?greenButton:button} onClick={()=>setActionTab("all")}>All actions</button></div>
   <p style={{gridColumn:"1/-1",...muted,margin:0}}>Available decisions follow your current permissions and approval stage. Review items and history before deciding.</p>
  </div>
  <div style={{...panel,padding:"8px 22px"}}>
   {loading?<p style={muted}>Loading actions…</p>:filteredActions.length===0?<p style={muted}>No pending actions found.</p>:filteredActions.map(item=><article key={item.module+item.id} style={{padding:"16px 0",borderBottom:"1px solid #edf1f5",display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}>
    <div><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><small style={{color:"#64748b"}}>{item.module} {item.reference}</small><span style={{border:"1px solid #f59e0b",borderRadius:20,padding:"4px 10px",fontSize:12,color:"#92400e"}}>{item.status}</span></div><h3 style={{fontSize:18,margin:"9px 0",color:"#172033"}}>{item.title}</h3><small style={muted}>Due: {item.due?new Date(item.due+"T00:00:00").toLocaleDateString():"—"}　 Updated: {item.updated?new Date(item.updated).toLocaleDateString():"—"}</small><small style={{display:"block",...muted,marginTop:5}}>{siteName(item.site)} · {item.detail}</small></div>
    <button style={button} onClick={()=>onNavigate(item.module==="Breakdown"?"breakdowns":item.module==="Preventive maintenance"?"maintenance":"tasks-projects")}>Open <ArrowRight size={15}/></button>
   </article>)}
  </div>
 </section>;

 if(section==="overview"||section==="home")return <section style={{padding:24,display:"grid",gap:18}}>
  <div style={{...panel,display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,flexWrap:"wrap"}}><div style={{display:"flex",gap:16,alignItems:"center"}}><span style={{background:"#effaf4",border:"1px solid #a7f3d0",borderRadius:16,padding:17,color:"#08683d"}}><Activity size={26}/></span><div><small style={{letterSpacing:2,color:"#087a46",fontWeight:800}}>OPERATIONS OVERVIEW</small><h1 style={{...title,marginTop:4}}>Dashboard</h1><p style={muted}>Your work and business at a glance.</p></div></div><div style={{display:"flex",gap:8,alignItems:"end",flexWrap:"wrap"}}><label>From date<input type="date" style={field} value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To date<input type="date" style={field} value={to} onChange={e=>setTo(e.target.value)}/></label><button style={greenButton} onClick={()=>void load()}>Apply dates</button><button style={button} onClick={()=>onNavigate("centralized-reports")}><FileBarChart2 size={16}/> Open reports</button></div></div>
  <div style={panel}><small style={{letterSpacing:2,color:"#087a46",fontWeight:800}}>MAINTENANCE · ALL REPORTED DATES</small><h2 style={{fontSize:20,margin:"5px 0 16px"}}>Maintenance at a glance</h2><div style={grid}>
   {canSeeVehicles&&metric("Open breakdowns",activeBreakdowns.length,<Wrench size={20}/>,"Open and in-progress jobs","breakdowns")}
   {canSeeVehicles&&metric("Critical jobs",critical.length,<AlertTriangle size={20}/>,"High / urgent priority","breakdowns")}
   {metric("Overdue jobs",overdueTasks.length+overduePm.length,<Clock3 size={20}/>,"Tasks and maintenance schedules","my-actions")}
   {canSeeVehicles&&metric("Completed today",completedToday,<CheckCircle2 size={20}/>,"Completed breakdown jobs","breakdowns")}
   {canSeeVehicles&&<div style={{...panel,background:"#f3fbf7",minHeight:150}}><div style={{...muted}}>Completion rate</div><div style={{fontSize:32,fontWeight:800}}>{completionRate}%</div><small style={muted}>{breakdowns.filter(x=>x.status==="Completed").length} of {breakdowns.length} breakdowns completed.</small></div>}
  </div></div>
  <div style={{...panel,background:"#fffcf2",borderColor:"#f8df83",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><b>Needs attention</b><p style={muted}>Only active items in modules you can open are shown here.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button style={button} onClick={()=>onNavigate("maintenance")}><CalendarDays size={16}/> Overdue preventive maintenance <b>{overduePm.length}</b></button><button style={button} onClick={()=>onNavigate("my-actions")}><Clock3 size={16}/> Overdue tasks <b>{overdueTasks.length}</b></button></div></div>
  <div style={panel}><small style={{letterSpacing:2,color:"#087a46",fontWeight:800}}>MAINTENANCE · FILTERED DATES</small><h2 style={{fontSize:20,margin:"5px 0 14px"}}>Maintenance picture</h2><p style={muted}>{visibleVisits.length} vehicle visit records in selected date range. Results include only records allowed by your role and assigned sites.</p><div style={grid}>{visibleVisits.slice(0,12).map(v=><article key={v.id} style={{border:"1px solid #e5eaf0",borderRadius:12,padding:14}}><b>{v.ptc_id||"Vehicle"} · {v.vehicle_type}</b><p style={muted}>{v.complaint}</p><small style={muted}>{siteName(v.site_id)} · {new Date(v.in_at).toLocaleDateString()} · {v.status}</small></article>)}</div></div>
 </section>;

 if(section==="my-profile")return <section style={{padding:24,display:"grid",gap:16}}>
  <div style={{display:"flex",gap:26,borderBottom:"1px solid #dbe3eb",padding:"0 10px"}}>{["profile","preferences","security"].map(t=><button key={t} onClick={()=>setTab(t)} style={{...button,border:0,borderRadius:0,borderBottom:tab===t?"3px solid #087a46":"3px solid transparent",color:tab===t?"#087a46":"#334155"}}>{t==="profile"?"Profile":t==="preferences"?"Preferences":"Security"}</button>)}</div>
  {tab==="profile"&&<><div style={panel}><div style={{display:"flex",gap:18,alignItems:"center"}}><div style={{width:92,height:92,borderRadius:"50%",background:"#e9f5ee",display:"grid",placeItems:"center",fontSize:34,fontWeight:800,color:"#08683d"}}>{(profile.full_name||profile.username||"U").slice(0,1).toUpperCase()}</div><div><h2 style={{fontSize:22,margin:0}}>{profile.full_name}</h2><p style={{margin:"4px 0",color:"#64748b"}}>@{profile.username||"user"}</p><small style={muted}>Profile photo upload will be enabled after confirming the project's private storage bucket; no public bucket is assumed.</small></div></div></div><div style={{...panel,...grid}}><div><small style={label}>Full name</small><b>{profile.full_name}</b></div><div><small style={label}>Email address</small><b>Managed securely by sign-in account</b></div><div><small style={label}>Role</small><b>{profile.role==="admin"?"Super Admin":profile.role==="supervisor"?"Supervisor":"Store Keeper"}</b></div><div><small style={label}>Assigned sites</small><b>{profile.role==="admin"?"All sites":siteName(profile.site_id)}</b></div><div><small style={label}>Primary department</small><b>Not assigned</b></div></div></>}
  {tab==="preferences"&&<div style={panel}><h2 style={{fontSize:20}}>Preferences</h2><label style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0"}}><input type="checkbox" checked={preferences.notifications} onChange={e=>setPreferences(p=>({...p,notifications:e.target.checked}))}/> Enable in-app notification reminders</label><label style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0"}}><input type="checkbox" checked={preferences.compact} onChange={e=>setPreferences(p=>({...p,compact:e.target.checked}))}/> Compact information density</label><label style={{display:"block",maxWidth:260,marginTop:14}}>Language<select style={field} value={language} onChange={e=>onLanguageChange(e.target.value as "en"|"ar")}><option value="en">English</option><option value="ar">العربية</option></select></label><p style={muted}>Preferences are currently kept for this open session; persistent user preferences require a confirmed settings storage contract.</p></div>}
  {tab==="security"&&<div style={panel}><div style={{display:"flex",gap:10,alignItems:"center"}}><ShieldCheck color="#087a46"/><h2 style={{fontSize:20}}>Account security</h2></div><p style={muted}>Change your sign-in password. Existing role and site permissions are not changed.</p><form onSubmit={async e=>{e.preventDefault();setNotice("");if(password.length<12){setNotice("Use at least 12 characters.");return;}if(password!==confirmPassword){setNotice("Passwords do not match.");return;}setSaving(true);const {error}=await supabase!.auth.updateUser({password});setSaving(false);setNotice(error?error.message:"Password updated successfully.");if(!error){setPassword("");setConfirmPassword("");}}} style={{display:"grid",gap:12,maxWidth:420}}><label>New password<input type="password" style={field} value={password} onChange={e=>setPassword(e.target.value)} minLength={12} autoComplete="new-password"/></label><label>Confirm new password<input type="password" style={field} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={12} autoComplete="new-password"/></label><button style={greenButton} disabled={saving}>{saving?"Updating…":"Update password"} <KeyRound size={16}/></button></form>{notice&&<p style={muted}>{notice}</p>}</div>}
 </section>;
 return null;
}
