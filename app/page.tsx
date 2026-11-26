"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ModuleWorkspace from "@/components/ModuleWorkspace";
import ArabicTranslator from "@/components/ArabicTranslator";
import { Wrench, CarFront, Package, ClipboardList, Users, Building2, LogOut, LockKeyhole, LayoutDashboard, ArrowUpRight, RefreshCw, Boxes, Plus, Pencil, Power, X, MapPin, ChevronDown, Gauge, AlertTriangle, FileBarChart2, Bell, UserRound, Home as HomeIcon, Truck, ShoppingCart, BriefcaseBusiness, MessageCircle, BarChart3, ShieldCheck, Settings, Upload, Activity, BrainCircuit, HelpCircle, Database, ClipboardCheck, CalendarClock, ContactRound, PackageSearch } from "lucide-react";

type Profile = { user_id: string; username: string | null; full_name: string; role: "admin" | "supervisor" | "storekeeper"; site_id: string | null; is_active: boolean };
type Counts = { inGarage: number; openOrders: number; receivedToday: number; users: number };
type Site = { id: string; name: string; code: string; address: string | null; is_active: boolean; created_at?: string };
type WorkDetail = { name: string; designation: string; work_done: string };
type EmployeeRecord = { id: string; employee_code: string; full_name: string; department: string | null; designation: string | null; site_id: string | null; reporting_manager: string | null; phone: string | null; email: string | null; date_joined: string | null; employment_status: "Active" | "Inactive" | "On Leave"; linked_user_id: string | null; notes: string | null; created_at: string; updated_at: string };
type EmployeeForm = { employee_code: string; full_name: string; department: string; designation: string; site_id: string; reporting_manager: string; phone: string; email: string; date_joined: string; employment_status: "Active" | "Inactive" | "On Leave"; linked_user_id: string; notes: string };
const emptyEmployeeForm = (): EmployeeForm => ({ employee_code: "", full_name: "", department: "", designation: "", site_id: "", reporting_manager: "", phone: "", email: "", date_joined: "", employment_status: "Active", linked_user_id: "", notes: "" });
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
  const [language, setLanguage] = useState<"en" | "ar">("en");
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  const tr = (value: string) => {
    if (language !== "ar") return value;
    const words: Record<string,string> = {
      "OVERVIEW":"نظرة عامة","WORKSPACE":"مساحة العمل","VEHICLE MANAGEMENT":"إدارة المركبات","MAINTENANCE":"الصيانة","PARTS AND SERVICES":"قطع الغيار والخدمات","COLLABORATION":"التعاون","INSIGHTS":"التقارير والتحليلات","ADMINISTRATION":"الإدارة","SUPPORT":"الدعم",
      "Dashboard":"لوحة التحكم","My actions":"إجراءاتي","Home":"الرئيسية","Notifications":"الإشعارات","My profile":"ملفي الشخصي","Vehicle IN":"دخول المركبة","Vehicle OUT":"خروج المركبة","IN History":"سجل الدخول","OUT History":"سجل الخروج","PTC assets":"أصول PTC","Breakdown dashboard":"لوحة الأعطال","Breakdowns and jobs":"الأعطال والأعمال","Preventive maintenance":"الصيانة الوقائية","Parts Order":"طلب قطع الغيار","Parts Received":"قطع الغيار المستلمة","Parts Order History":"سجل طلبات القطع","Parts Received History":"سجل استلام القطع","General Stores":"المخازن العامة","Parts and purchasing":"قطع الغيار والمشتريات","Tasks and projects":"المهام والمشاريع","Private chat":"المحادثة الخاصة","Report Creation":"إنشاء التقارير","Centralized reports":"التقارير المركزية","Employee directory":"دليل الموظفين","Users":"المستخدمون","Roles and permissions":"الأدوار والصلاحيات","Master data":"البيانات الرئيسية","Site Management":"إدارة المواقع","Audit history":"سجل التدقيق","Settings":"الإعدادات","Historical imports":"استيراد السجلات السابقة","System health":"حالة النظام","Ask PTC data":"اسأل بيانات PTC","Help and user guide":"المساعدة ودليل المستخدم","Sign out":"تسجيل الخروج","System online":"النظام متصل"
    };
    return words[value] || value;
  };
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
  const [employees,setEmployees]=useState<EmployeeRecord[]>([]);
  const [employeesLoading,setEmployeesLoading]=useState(false);
  const [employeeSaving,setEmployeeSaving]=useState(false);
  const [employeeMessage,setEmployeeMessage]=useState("");
  const [editingEmployee,setEditingEmployee]=useState<EmployeeRecord|null>(null);
  const [employeeFormOpen,setEmployeeFormOpen]=useState(false);
  const [employeeForm,setEmployeeForm]=useState<EmployeeForm>(emptyEmployeeForm);
  const [employeeSearch,setEmployeeSearch]=useState("");
  const [employeeStatusFilter,setEmployeeStatusFilter]=useState("all");
  const [employeeSiteFilter,setEmployeeSiteFilter]=useState("all");
  const [usersLoading,setUsersLoading]=useState(false);
  const [userSaving,setUserSaving]=useState(false);
  const [userMessage,setUserMessage]=useState("");
  const [newUserId,setNewUserId]=useState("");
  const [newUserName,setNewUserName]=useState("");
  const [newUserPassword,setNewUserPassword]=useState("");
  const [newUserRole,setNewUserRole]=useState<"supervisor"|"storekeeper">("supervisor");
  const [newUserSiteId,setNewUserSiteId]=useState("");
  const todayISO = new Date().toISOString().slice(0,10);
  const [reportFrom,setReportFrom]=useState(todayISO);
  const [reportTo,setReportTo]=useState(todayISO);
  const [reportCategory,setReportCategory]=useState("all");
  const [reportSiteId,setReportSiteId]=useState("");
  const [reportRows,setReportRows]=useState<Vehicle[]>([]);
  const [reportLoading,setReportLoading]=useState(false);
  const [reportMessage,setReportMessage]=useState("");
  const [openNavGroups,setOpenNavGroups]=useState<Record<string,boolean>>({
    "OVERVIEW":true,"WORKSPACE":true,"VEHICLE MANAGEMENT":true,"PARTS MANAGEMENT":true,
    "PARTS AND SERVICES":true,"BREAKDOWN MANAGEMENT":true,"MAINTENANCE":true,
    "COLLABORATION":true,"INSIGHTS":true,"REPORTS":true,"ADMINISTRATION":true,"SUPPORT":true
  });


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

  async function loadEmployeeDirectory() {
    if (!supabase) return;
    setEmployeesLoading(true);
    const { data, error } = await supabase.from("employee_directory").select("*").order("full_name", { ascending: true });
    if (error) setEmployeeMessage("Could not load employee directory: " + error.message);
    else setEmployees((data || []) as EmployeeRecord[]);
    setEmployeesLoading(false);
  }

  function startNewEmployee() {
    setEditingEmployee(null); setEmployeeForm(emptyEmployeeForm()); setEmployeeMessage(""); setEmployeeFormOpen(true);
  }

  function startEditEmployee(employee: EmployeeRecord) {
    setEditingEmployee(employee);
    setEmployeeForm({ employee_code: employee.employee_code, full_name: employee.full_name, department: employee.department || "", designation: employee.designation || "", site_id: employee.site_id || "", reporting_manager: employee.reporting_manager || "", phone: employee.phone || "", email: employee.email || "", date_joined: employee.date_joined || "", employment_status: employee.employment_status, linked_user_id: employee.linked_user_id || "", notes: employee.notes || "" });
    setEmployeeMessage(""); setEmployeeFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const code = employeeForm.employee_code.trim();
    const name = employeeForm.full_name.trim();
    if (!code || !name) { setEmployeeMessage("Employee ID and full name are required."); return; }
    setEmployeeSaving(true); setEmployeeMessage("");
    const payload = { employee_code: code, full_name: name, department: employeeForm.department.trim() || null, designation: employeeForm.designation.trim() || null, site_id: employeeForm.site_id || null, reporting_manager: employeeForm.reporting_manager.trim() || null, phone: employeeForm.phone.trim() || null, email: employeeForm.email.trim() || null, date_joined: employeeForm.date_joined || null, employment_status: employeeForm.employment_status, linked_user_id: employeeForm.linked_user_id || null, notes: employeeForm.notes.trim() || null };
    const result = editingEmployee
      ? await supabase.from("employee_directory").update(payload).eq("id", editingEmployee.id)
      : await supabase.from("employee_directory").insert(payload);
    if (result.error) setEmployeeMessage("Could not save employee: " + result.error.message);
    else {
      setEmployeeMessage(editingEmployee ? "Employee details updated successfully." : "Employee added successfully.");
      setEditingEmployee(null); setEmployeeForm(emptyEmployeeForm()); setEmployeeFormOpen(false);
      await loadEmployeeDirectory();
    }
    setEmployeeSaving(false);
  }

  async function toggleEmployeeStatus(employee: EmployeeRecord) {
    if (!supabase) return;
    const next = employee.employment_status === "Active" ? "Inactive" : "Active";
    if (!window.confirm("Change " + employee.full_name + " status to " + next + "?")) return;
    const { error } = await supabase.from("employee_directory").update({ employment_status: next }).eq("id", employee.id);
    if (error) setEmployeeMessage("Could not update employee status: " + error.message);
    else { setEmployeeMessage(employee.full_name + " is now " + next + "."); await loadEmployeeDirectory(); }
  }

  function exportEmployeeDirectory() {
    const headers = ["Employee ID","Employee Name","Department","Designation","Assigned Site","Reporting Manager","Phone","Email","Date Joined","Status","Login User ID"];
    const rows = filteredEmployees.map(employee => [employee.employee_code, employee.full_name, employee.department || "", employee.designation || "", sites.find(site => site.id === employee.site_id)?.name || "", employee.reporting_manager || "", employee.phone || "", employee.email || "", employee.date_joined || "", employee.employment_status, teamUsers.find(user => user.user_id === employee.linked_user_id)?.username || ""]);
    const csv = [headers, ...rows].map(row => row.map(value => '"' + String(value ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "PTC_Employee_Directory.csv"; link.click(); URL.revokeObjectURL(url);
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
  useEffect(() => { if (profile?.role === "admin" && section === "employee-directory") { setEmployeeMessage(""); void loadSites(); void loadTeamUsers(); void loadEmployeeDirectory(); } }, [profile, section]);
  useEffect(() => { if (profile?.role === "admin" && ["ptc-assets","general-stores","tasks-projects","roles-permissions","master-data","audit-history","settings","historical-imports","system-health","ask-ptc-data","centralized-reports"].includes(section)) void loadSites(); }, [profile, section]);
  useEffect(() => { if (profile?.role === "storekeeper" && section === "general-stores") void loadSites(); }, [profile, section]);
  useEffect(()=>{if(profile&&["parts-order","orders","parts-receive","receipts"].includes(section)){void loadPartsOrders();if(profile.role!=="storekeeper"){void loadVehicles();if(profile.role==="admin")void loadSites();}}},[profile,section]);
  useEffect(() => {
    if (profile && ["vehicle-in","vehicle-out","vehicle-in-history","vehicle-out-history","breakdown-dashboard","breakdowns","maintenance","reports"].includes(section) && profile.role !== "storekeeper") {
      void loadVehicles();
      if (profile.role === "admin" && ["vehicle-in","vehicle-out","vehicle-in-history","vehicle-out-history","reports"].includes(section)) void loadSites();
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
    const { data, error } = await supabase.from("vehicle_visits").select("*").order("in_at", { ascending: false }).limit(5000);
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
    const currentOrder=partOrders.find(o=>o.id===id);
    const payload:any={request_number:x.request_number.trim()||null,request_date:x.request_date||null,invoice_number:x.invoice_number.trim()||null,invoice_date:x.invoice_date||null,invoice_cost:cost?Number(cost):null,invoice_currency:x.invoice_currency||"AED"};
    if(currentOrder?.status==="ordered"&&x.invoice_number.trim())payload.status="purchased";
    const {error}=await supabase.from("parts_orders").update(payload).eq("id",id);
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
  async function generateReport(e:React.FormEvent) {
    e.preventDefault();
    if(!supabase || !profile) return;
    if(!reportFrom || !reportTo || reportFrom>reportTo){setReportMessage("Please select a valid date range.");return;}
    setReportLoading(true);setReportMessage("");
    const start=new Date(reportFrom+"T00:00:00");
    const end=new Date(reportTo+"T23:59:59.999");
    let query=supabase.from("vehicle_visits").select("*").gte("in_at",start.toISOString()).lte("in_at",end.toISOString()).order("in_at",{ascending:false}).limit(5000);
    if(profile.role==="admin" && reportSiteId) query=query.eq("site_id",reportSiteId);
    const {data,error}=await query;
    if(error){setReportMessage("Could not create report: "+error.message);setReportRows([]);}
    else {
      const rows=(data||[]) as Vehicle[];
      setReportRows(reportCategory==="all"?rows:rows.filter(v=>visitCategory(v.purpose_of_visit)===reportCategory));
      setReportMessage("Report generated successfully.");
    }
    setReportLoading(false);
  }

  function downloadReport() {
    if(!reportRows.length) return;
    const headers=["PTC ID","Vehicle Type","Purpose","Complaint","Work Description","IN Date/Time","OUT Date/Time","Status","IN Remarks","OUT Remarks","Work Details","Site ID"];
    const values=reportRows.map(v=>[
      v.ptc_id,v.vehicle_type,v.purpose_of_visit,v.complaint,v.work_description,v.in_at,v.out_at,v.status,
      v.in_remark,v.out_remark,(v.work_details||[]).map(w=>w.name+" ("+w.designation+"): "+w.work_done).join(" | "),v.site_id
    ]);
    const csv=[headers,...values].map(row=>row.map(value=>'"'+String(value??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
    const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const link=document.createElement("a");
    link.href=url;link.download="PTC_Garage_Report_"+reportFrom+"_to_"+reportTo+".csv";
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }

  if (checking) return <main className="loading"><div className="spinner"/><span>Loading PTC Garage...</span></main>;

  if (!profile) return <ArabicTranslator language={language}><main className="loginShell">
    <section className="loginVisual">
      <div className="brand"><img className="ptcLogo" src="/ptc-logo.svg" alt="PTC Since 1969"/><span>PTC <b>GARAGE</b></span></div>
      <div className="visualCopy"><span className="eyebrow">OPERATIONS MANAGEMENT</span><h1>One garage.<br/><em>Complete control.</em></h1><p>Manage vehicle movements, workshop activity and parts operations from one secure workspace.</p></div>
      <div className="visualFooter"><span>PTC GARAGE MANAGEMENT</span><span>SECURE WORKSPACE · 2026</span></div>
    </section>
    <section className="loginPanel"><div className="loginCard">
      <div className="loginLanguage"><button type="button" className="languageToggle" onClick={()=>setLanguage(language==="en"?"ar":"en")} aria-label="Switch language">{language==="en"?"عربي":"EN"}</button></div>
      <div className="mobileBrand"><img className="ptcLogo" src="/ptc-logo.svg" alt="PTC Since 1969"/><span>PTC <b>GARAGE</b></span></div>
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
  </main></ArabicTranslator>;

  const isStore = profile.role === "storekeeper";
  const navGroups = isStore
    ? [
      {label:"OVERVIEW",items:[{id:"overview",label:"Dashboard",icon:LayoutDashboard},{id:"my-actions",label:"My actions",icon:ClipboardCheck},{id:"home",label:"Home",icon:HomeIcon},{id:"notifications",label:"Notifications",icon:Bell},{id:"my-profile",label:"My profile",icon:UserRound}]},
      {label:"PARTS AND SERVICES",items:[{id:"orders",label:"Parts Orders",icon:Package},{id:"receipts",label:"Parts Received",icon:Boxes},{id:"general-stores",label:"General Stores",icon:PackageSearch},{id:"parts-purchasing",label:"Parts and purchasing",icon:ShoppingCart}]},
      {label:"COLLABORATION",items:[{id:"tasks-projects",label:"Tasks and projects",icon:BriefcaseBusiness},{id:"private-chat",label:"Private chat",icon:MessageCircle}]},
      {label:"INSIGHTS",items:[{id:"centralized-reports",label:"Centralized reports",icon:BarChart3},{id:"help-guide",label:"Help and user guide",icon:HelpCircle}]}
    ]
    : [
      {label:"OVERVIEW",items:[{id:"overview",label:"Dashboard",icon:LayoutDashboard},{id:"my-actions",label:"My actions",icon:ClipboardCheck},{id:"home",label:"Home",icon:HomeIcon},{id:"notifications",label:"Notifications",icon:Bell},{id:"my-profile",label:"My profile",icon:UserRound}]},
      {label:"VEHICLE MANAGEMENT",items:[{id:"vehicle-in",label:"Vehicle IN",icon:CarFront},{id:"vehicle-out",label:"Vehicle OUT",icon:LogOut},{id:"vehicle-in-history",label:"IN History",icon:ClipboardList},{id:"vehicle-out-history",label:"OUT History",icon:Truck},{id:"ptc-assets",label:"PTC assets",icon:Truck}]},
      {label:"MAINTENANCE",items:[{id:"breakdown-dashboard",label:"Breakdown dashboard",icon:Gauge},{id:"breakdowns",label:"Breakdowns and jobs",icon:AlertTriangle},{id:"maintenance",label:"Preventive maintenance",icon:Wrench}]},
      {label:"PARTS AND SERVICES",items:[{id:"parts-order",label:"Parts Order",icon:Package},{id:"parts-receive",label:"Parts Received",icon:Boxes},{id:"orders",label:"Parts Order History",icon:ClipboardList},{id:"receipts",label:"Parts Received History",icon:PackageSearch},{id:"general-stores",label:"General Stores",icon:PackageSearch},{id:"parts-purchasing",label:"Parts and purchasing",icon:ShoppingCart}]},
      {label:"COLLABORATION",items:[{id:"tasks-projects",label:"Tasks and projects",icon:BriefcaseBusiness},{id:"private-chat",label:"Private chat",icon:MessageCircle}]},
      {label:"INSIGHTS",items:[{id:"reports",label:"Report Creation",icon:FileBarChart2},{id:"centralized-reports",label:"Centralized reports",icon:BarChart3}]},
      ...(profile.role==="admin" ? [
        {label:"ADMINISTRATION",items:[{id:"employee-directory",label:"Employee directory",icon:ContactRound},{id:"users",label:"Users",icon:Users},{id:"roles-permissions",label:"Roles and permissions",icon:ShieldCheck},{id:"master-data",label:"Master data",icon:Database},{id:"sites",label:"Site Management",icon:Building2},{id:"audit-history",label:"Audit history",icon:ClipboardList},{id:"settings",label:"Settings",icon:Settings},{id:"historical-imports",label:"Historical imports",icon:Upload},{id:"system-health",label:"System health",icon:Activity},{id:"ask-ptc-data",label:"Ask PTC data",icon:BrainCircuit}]}
      ] : []),
      {label:"SUPPORT",items:[{id:"help-guide",label:"Help and user guide",icon:HelpCircle}]}
    ];
  const pageTitle = tr(navGroups.flatMap(group=>group.items).find(item=>item.id===section)?.label || (section==="overview"?"Dashboard":section));
  const filteredEmployees = employees.filter(employee => {
    const q = employeeSearch.trim().toLowerCase();
    const matchesSearch = !q || [employee.employee_code, employee.full_name, employee.department, employee.designation, employee.reporting_manager].some(value => (value || "").toLowerCase().includes(q));
    const matchesStatus = employeeStatusFilter === "all" || employee.employment_status === employeeStatusFilter;
    const matchesSite = employeeSiteFilter === "all" || employee.site_id === employeeSiteFilter;
    return matchesSearch && matchesStatus && matchesSite;
  });
  const breakdownVehicles=vehicles.filter(v=>visitCategory(v.purpose_of_visit)==="breakdown");

  return <ArabicTranslator language={language}><main className="appShell">
    <aside className="sidebar"><div className="brand sideBrand"><img className="ptcLogo" src="/ptc-logo.svg" alt="PTC Since 1969"/></div>
      <div className="sideLabel">{tr("WORKSPACE")}</div>
      <nav className="sideNav">
        {navGroups.map(group=><div className="navGroup" key={group.label}>
          <button type="button" className="navGroupTitle" onClick={()=>setOpenNavGroups(prev=>({...prev,[group.label]:!prev[group.label]}))}>
            <span>{tr(group.label)}</span><ChevronDown size={14} className={openNavGroups[group.label]?"groupChevron expanded":"groupChevron"}/>
          </button>
          {openNavGroups[group.label]&&<div className="navGroupItems">
            {group.items.map(item=><button key={item.id} className={section===item.id?"navItem active":"navItem"} onClick={()=>setSection(item.id)}><item.icon size={17}/><span>{tr(item.label)}</span></button>)}
          </div>}
        </div>)}
      </nav>
      <div className="sideBottom"><div className="userChip"><div className="avatar">{(profile.full_name||profile.username||"U").slice(0,1).toUpperCase()}</div><div><b>{profile.full_name}</b><small>{profile.role==="storekeeper"?"Store Keeper":profile.role==="admin"?"Administrator":"Supervisor"}</small></div></div><button className="logoutBtn" onClick={logout}><LogOut size={17}/> {tr("Sign out")}</button></div>
    </aside>
    <section className="mainArea"><header className="topbar"><div><span className="eyebrow dark">PTC MAINTENANCE</span><h2>{pageTitle}</h2></div><div className="topRight"><button type="button" className="languageToggle" onClick={()=>setLanguage(language==="en"?"ar":"en")} aria-label="Switch language">{language==="en"?"عربي":"EN"}</button><span className="liveDot"/> <span>{tr("System online")}</span><div className="topAvatar">{greeting.slice(0,1).toUpperCase()}</div></div></header>
      <div className="content">
        {(section==="parts-order"||section==="orders")&&<section className="sitePage partsPage">
          <div className="siteIntro"><div><span className="eyebrow dark">PARTS MANAGEMENT</span><h1>{section==="parts-order"?"Parts Order":"Parts Order History"}</h1><p>{section==="parts-order"?"Create a new parts request with multiple part lines.":"Review and update parts request records."}</p></div><button className="refreshBtn" onClick={loadPartsOrders}><RefreshCw size={16}/> Refresh</button></div>
          {partsMessage&&<div className={partsMessage.includes("successfully")?"siteSuccess":"siteError"}>{partsMessage}</div>}
          {section==="parts-order"&&profile.role!=="storekeeper"&&<div className="siteFormCard"><div className="siteFormTitle"><div className="siteIcon"><Package size={20}/></div><div><h3>Create parts request</h3><p>Each part is stored as a separate order under the same vehicle visit.</p></div></div><form className="siteForm" onSubmit={submitPartsOrder}>
            <div className="siteFields">{profile.role==="admin"&&<label>Site<select value={orderSiteId} onChange={e=>{setOrderSiteId(e.target.value);setOrderVehicleId("");}} required><option value="">Select site</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
            <label className="siteAddress">Select vehicle currently in garage<select value={orderVehicleId} onChange={e=>setOrderVehicleId(e.target.value)}><option value="">General parts request (not linked to a vehicle)</option>{vehicles.filter(v=>v.status==="IN"&&(profile.role==="admin"?v.site_id===orderSiteId:v.site_id===profile.site_id)).map(v=><option key={v.id} value={v.id}>{(v.ptc_id||"No PTC ID")+" · "+v.vehicle_type+" · "+v.complaint}</option>)}</select></label></div>
            {orderVehicleId&&vehicles.find(v=>v.id===orderVehicleId)&&(()=>{const v=vehicles.find(x=>x.id===orderVehicleId)!;return <div className="selectedVehiclePanel"><div className="selectedVehicleHeader"><b>Vehicle IN details</b><span className="statusActive">Currently IN</span></div><div className="selectedVehicleGrid"><div><small>PTC ID</small><strong>{v.ptc_id||"Not entered"}</strong></div><div><small>Vehicle Type</small><strong>{v.vehicle_type}</strong></div><div><small>Purpose</small><strong>{v.purpose_of_visit||"—"}</strong></div><div><small>Garage IN</small><strong>{new Date(v.in_at).toLocaleString()}</strong></div><div className="selectedVehicleWide"><small>Complaint / Problem</small><strong>{v.complaint}</strong></div><div className="selectedVehicleWide"><small>Work Description</small><strong>{v.work_description||"—"}</strong></div><div className="selectedVehicleWide"><small>IN Remarks</small><strong>{v.in_remark||"—"}</strong></div></div></div>;})()}
            <div className="partLinesHeading"><b>Parts list</b><button type="button" className="secondaryBtn" onClick={()=>setPartLines([...partLines,{part_name:"",part_number:"",quantity:"1",unit:"Pcs",priority:"normal",notes:""}])}><Plus size={15}/> Add part</button></div>
            {partLines.map((x,i)=><div className="partLine" key={i}><div className="partLineTop"><b>Part {i+1}</b>{partLines.length>1&&<button type="button" className="iconAction deactivate" onClick={()=>setPartLines(partLines.filter((_,j)=>j!==i))}><X size={14}/> Remove</button>}</div><div className="siteFields">
              <label>Part name<input required value={x.part_name} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,part_name:e.target.value}:z))}/></label>
              <label>Part number<input value={x.part_number} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,part_number:e.target.value}:z))}/></label>
              <label>Quantity<input type="number" min="0.01" step="0.01" required value={x.quantity} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,quantity:e.target.value}:z))}/></label>
              <label>Unit<select value={x.unit} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,unit:e.target.value}:z))}><option>Nos</option><option>Drum</option><option>Roll</option><option>Pcs</option><option>Box</option><option>Bundle</option></select></label>
              <label>Priority<select value={x.priority} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,priority:e.target.value}:z))}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="high">High</option></select></label>
              <label>Remarks<input value={x.notes} onChange={e=>setPartLines(partLines.map((z,j)=>j===i?{...z,notes:e.target.value}:z))}/></label></div></div>)}
            <div className="siteFormActions"><button className="primaryBtn siteSave" disabled={partsSaving}>{partsSaving?"Submitting...":"Submit parts request"} <ArrowUpRight size={17}/></button></div></form></div>}
          {(section==="orders"||section==="parts-order")&&<>
          <div className="siteListHeader"><div><h3>{profile.role==="storekeeper"?"All parts requests":"Parts order history"}</h3><p>{partOrders.length} order line(s) · old records retained</p></div></div>
          <div className="vehicleFilters">{["all","ordered","purchased","partially_received","received"].map(v=><button key={v} className={partsFilter===v?"filterActive":"filterBtn"} onClick={()=>setPartsFilter(v)}>{v==="all"?"All":v==="partially_received"?"Part received":v==="purchased"?"Purchased":v==="received"?"Completed":"Ordered"}</button>)}</div>
          {partsLoading?<div className="siteEmpty">Loading parts orders...</div>:<div className="siteTableWrap"><table className="siteTable partsTable"><thead><tr><th>Site</th><th>PTC ID</th><th>Vehicle</th><th>Part</th><th>Quantity</th><th>Status</th><th>Request</th><th>Invoice / Cost</th>{profile.role==="storekeeper"&&<th>Store update</th>}</tr></thead><tbody>
          {partOrders.filter(o=>partsFilter==="all"||o.status===partsFilter).map(o=><tr key={o.id}><td>{o.site_name}</td><td><span className="ptcIdTag">{o.vehicle?.ptc_id||o.vehicle_ptc_id||"Not Linked"}</span></td><td>{o.vehicle?.vehicle_type||o.vehicle_type||"—"}</td><td><b>{o.part_name}</b><small className="tableSub">{o.part_number||"—"} {o.notes||""}</small></td><td>{o.quantity} {o.unit}</td><td><span className={o.status==="received"?"statusActive":o.status==="partially_received"?"statusPartial":"statusInactive"}>{o.status}</span><small className="tableSub">Received {o.receipts.reduce((a:number,r:any)=>a+Number(r.quantity_received),0)} / {o.quantity}</small></td><td>{o.request_number||"—"}<small className="tableSub">{o.request_date||"Date pending"}</small></td><td>{o.invoice_number||"—"}<small className="tableSub">{o.invoice_date||"—"} · {o.invoice_cost==null?"Cost pending":(o.invoice_currency||"AED")+" "+Number(o.invoice_cost).toFixed(2)}</small></td>
          {profile.role==="storekeeper"&&<td><div className="storeEditForm">{(["request_number","request_date","invoice_number","invoice_date","invoice_cost"] as const).map(k=><label key={k}>{({request_number:"Request No.",request_date:"Request Date",invoice_number:"Invoice No.",invoice_date:"Invoice Date",invoice_cost:"Cost"} as any)[k]}<input type={k.endsWith("date")?"date":k==="invoice_cost"?"number":"text"} step={k==="invoice_cost"?"0.01":undefined} value={storeEdits[o.id]?.[k]??""} onChange={e=>setStoreEdits(p=>({...p,[o.id]:{...(p[o.id]||{request_number:"",request_date:"",invoice_number:"",invoice_date:"",invoice_cost:"",invoice_currency:"AED"}),[k]:e.target.value}}))}/></label>)}<label>Currency<select value={storeEdits[o.id]?.invoice_currency||"AED"} onChange={e=>setStoreEdits(p=>({...p,[o.id]:{...(p[o.id]||{request_number:"",request_date:"",invoice_number:"",invoice_date:"",invoice_cost:""}),invoice_currency:e.target.value}}))}><option>AED</option><option>USD</option><option>INR</option><option>EUR</option></select></label><button type="button" className="primaryBtn siteSave" disabled={partsSaving} onClick={()=>saveStoreOrder(o.id)}>Save details</button></div></td>}</tr>)}
          {partOrders.filter(o=>partsFilter==="all"||o.status===partsFilter).length===0&&<tr><td colSpan={profile.role==="storekeeper"?9:8}>No orders found.</td></tr>}</tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/>{profile.role==="storekeeper"?"Store Keeper can update request and purchase fields only.":"Supervisors see their assigned site; Admin sees all sites."}</div>
          </>}
        </section>}
        {(section==="parts-receive"||section==="receipts")&&<section className="sitePage partsPage"><div className="siteIntro"><div><span className="eyebrow dark">PARTS MANAGEMENT</span><h1>{section==="parts-receive"?"Parts Received":"Parts Received History"}</h1><p>{section==="parts-receive"?"Record the parts physically received at your garage.":"Review all physical parts receipt records."}</p></div><button className="refreshBtn" onClick={loadPartsOrders}><RefreshCw size={16}/> Refresh</button></div>
          {partsMessage&&<div className={partsMessage.includes("successfully")?"siteSuccess":"siteError"}>{partsMessage}</div>}
          {section==="parts-receive"&&profile.role!=="storekeeper"&&<div className="siteFormCard"><div className="siteFormTitle"><div className="siteIcon"><Boxes size={20}/></div><div><h3>Confirm garage receipt</h3><p>Enter the quantity physically received.</p></div></div><form className="siteForm" onSubmit={savePartsReceipt}><div className="siteFields">
            <label className="siteAddress">Parts order<select required value={receiptOrderId} onChange={e=>setReceiptOrderId(e.target.value)}><option value="">Select open order</option>{partOrders.filter(o=>o.status!=="received").map(o=><option key={o.id} value={o.id}>{o.site_name+" · "+(o.vehicle?.ptc_id||o.vehicle_ptc_id||"Not Linked")+" · "+o.part_name+" · "+o.quantity+" "+o.unit}</option>)}</select></label>
            <label>Quantity received<input type="number" min="0.01" step="0.01" value={receiptQty} onChange={e=>setReceiptQty(e.target.value)}/></label><label>Remarks<input value={receiptRemarks} onChange={e=>setReceiptRemarks(e.target.value)}/></label></div><div className="siteFormActions"><button className="primaryBtn siteSave" disabled={receiptSaving||!receiptOrderId}>{receiptSaving?"Saving...":"Confirm receipt"}</button></div></form></div>}
          {(section==="receipts"||section==="parts-receive")&&<>
          <div className="siteListHeader"><div><h3>Receiving history</h3><p>Includes partial deliveries and completion history.</p></div><span className="siteCount">{partOrders.reduce((n,o)=>n+o.receipts.length,0)} Receipts</span></div>
          {partsLoading?<div className="siteEmpty">Loading receipts...</div>:<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>Date / Time</th><th>Site</th><th>PTC ID</th><th>Part</th><th>Ordered</th><th>Received</th><th>Remarks</th><th>Status</th></tr></thead><tbody>
          {partOrders.flatMap(o=>o.receipts.map((r:any)=><tr key={r.id}><td>{new Date(r.received_at).toLocaleString()}</td><td>{o.site_name}</td><td><span className="ptcIdTag">{o.vehicle?.ptc_id||o.vehicle_ptc_id||"Not Linked"}</span></td><td>{o.part_name}</td><td>{o.quantity} {o.unit}</td><td>{r.quantity_received} {o.unit}</td><td>{r.remarks||"—"}</td><td>{o.status}</td></tr>))}
          {partOrders.every(o=>!o.receipts.length)&&<tr><td colSpan={8}>No receipt records found.</td></tr>}</tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/>{profile.role==="storekeeper"?"View-only receiving history.":"Admin and assigned Supervisor can confirm physical receipt."}</div>
          </>}
        </section>}

        {section==="breakdown-dashboard"&&profile.role!=="storekeeper"&&<section className="sitePage">
          <div className="siteIntro"><div><span className="eyebrow dark">BREAKDOWN MANAGEMENT</span><h1>Breakdown Dashboard</h1><p>Live overview of vehicles registered under Breakdown purpose.</p></div><button className="refreshBtn" onClick={loadVehicles}><RefreshCw size={16}/> Refresh</button></div>
          <div className="statsGrid"><Stat icon={<AlertTriangle/>} label="Total Breakdowns" value={breakdownVehicles.length} hint="All loaded records"/><Stat icon={<CarFront/>} label="Currently in Garage" value={breakdownVehicles.filter(v=>v.status==="IN").length} hint="Open breakdown cases"/><Stat icon={<LogOut/>} label="Released Vehicles" value={breakdownVehicles.filter(v=>v.status==="OUT").length} hint="Completed / released"/></div>
          <div className="siteListHeader"><div><h3>Recent breakdown activity</h3><p>Latest Breakdown entries across your permitted site scope.</p></div><button className="secondaryBtn" onClick={()=>setSection("breakdowns")}>View all breakdowns <ArrowUpRight size={15}/></button></div>
          <VisitTable rows={breakdownVehicles.slice(0,12)}/>
        </section>}
        {(section==="breakdowns"||section==="maintenance")&&profile.role!=="storekeeper"&&<ModuleWorkspace section={section} profile={profile} sites={sites} onNavigate={setSection}/>}
        {section==="reports"&&profile.role!=="storekeeper"&&<section className="sitePage">
          <div className="siteIntro"><div><span className="eyebrow dark">REPORT CENTRE</span><h1>Report Creation</h1><p>Generate vehicle activity reports for any date range.</p></div></div>
          <div className="siteFormCard reportFormCard"><div className="siteFormTitle"><div className="siteIcon"><FileBarChart2 size={20}/></div><div><h3>Choose report filters</h3><p>Reports use the vehicle IN date and respect your account permissions.</p></div></div>
            <form className="siteForm" onSubmit={generateReport}><div className="siteFields">
              <label>From date<input type="date" value={reportFrom} max={reportTo||undefined} onChange={e=>setReportFrom(e.target.value)} required/></label>
              <label>To date<input type="date" value={reportTo} min={reportFrom||undefined} onChange={e=>setReportTo(e.target.value)} required/></label>
              <label>Purpose category<select value={reportCategory} onChange={e=>setReportCategory(e.target.value)}><option value="all">All purposes</option><option value="breakdown">Breakdown</option><option value="maintenance">Maintenance</option></select></label>
              {profile.role==="admin"&&<label>Site<select value={reportSiteId} onChange={e=>setReportSiteId(e.target.value)}><option value="">All sites</option>{sites.filter(site=>site.is_active).map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
            </div><div className="siteFormActions"><button className="primaryBtn siteSave" disabled={reportLoading}>{reportLoading?"Generating...":"Generate Report"} <FileBarChart2 size={16}/></button></div></form>
            {reportMessage&&<div className={reportMessage.includes("successfully")?"siteSuccess":"siteError"}>{reportMessage}</div>}
          </div>
          <div className="siteListHeader"><div><h3>Report results</h3><p>{reportRows.length} vehicle visit(s) · {reportFrom} to {reportTo}</p></div><button className="secondaryBtn" onClick={downloadReport} disabled={!reportRows.length}><FileBarChart2 size={15}/> Download CSV</button></div>
          <VisitTable rows={reportRows}/>
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
            {!isStore && <Quick icon={<CarFront/>} title="Vehicle IN" desc="Register a vehicle arriving at the garage" onClick={()=>setSection("vehicle-in")}/>}
            {!isStore && <Quick icon={<LogOut/>} title="Vehicle OUT" desc="Complete release of a vehicle" onClick={()=>setSection("vehicle-out")}/>}
            <Quick icon={<Package/>} title="Parts Order" desc="Create and submit a parts request" onClick={()=>setSection(isStore?"orders":"parts-order")}/>
            <Quick icon={<Boxes/>} title="Parts Received" desc="Record or review physical receipt" onClick={()=>setSection(isStore?"receipts":"parts-receive")}/>
            {profile.role==="admin" && <Quick icon={<Users/>} title="User Management" desc="Create and manage team accounts" onClick={()=>setSection("users")}/>}
          </div>
          <div className="notice"><LockKeyhole size={18}/><div><b>Role-based access is enabled</b><p>{isStore?"Your portal is limited to parts orders and receiving. Vehicle records are not available to this account.":profile.role==="supervisor"?"You can manage vehicle and parts operations for your assigned site.":"You have administrator access to all sites and modules."}</p></div></div>
        </>}
        {["vehicle-in","vehicle-out","vehicle-in-history","vehicle-out-history"].includes(section) && profile.role!=="storekeeper" && <section className="sitePage">
          <div className="siteIntro"><div><span className="eyebrow dark">GARAGE OPERATIONS</span><h1>{section==="vehicle-in"?"Vehicle IN":section==="vehicle-out"?"Vehicle OUT":section==="vehicle-in-history"?"Vehicle IN History":"Vehicle OUT History"}</h1><p>{section==="vehicle-in"?"Register a new vehicle arriving at the garage.":section==="vehicle-out"?"Record completed work and confirm vehicle release.":section==="vehicle-in-history"?"Review all vehicle entry records.":"Review all vehicle release records and work details."}</p></div><button className="refreshBtn" onClick={loadVehicles}><RefreshCw size={16}/> Refresh</button></div>
          {vehicleMessage && <div className={vehicleMessage.includes("successfully") ? "siteSuccess" : "siteError"}>{vehicleMessage}</div>}
          {(section==="vehicle-in"||section==="vehicle-out")&&<div className="vehicleForms">
            {section==="vehicle-in"&&<div className="siteFormCard">
              <div className="siteFormTitle"><div className="siteIcon"><CarFront size={20}/></div><div><h3>Vehicle IN</h3><p>Record a new vehicle arriving at the garage.</p></div></div>
              <form className="siteForm" onSubmit={saveVehicleIn}>
                <div className="siteFields">
                  {profile.role==="admin" && <label>Site<select value={vehicleSiteId} onChange={e=>setVehicleSiteId(e.target.value)} required><option value="">Select site</option>{sites.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
                  <label>PTC ID (optional)<input value={ptcId} onChange={e=>setPtcId(e.target.value)} placeholder="Enter PTC ID"/></label>
                  <label>Vehicle Type<input value={vehicleType} onChange={e=>setVehicleType(e.target.value)} placeholder="e.g. Bus / Van / Pickup" required/></label>
                  <label>Complaint<input value={complaint} onChange={e=>setComplaint(e.target.value)} placeholder="Reason for garage visit" required/></label>
                  <label>Work Description<input value={workDescription} onChange={e=>setWorkDescription(e.target.value)} placeholder="Work to be carried out"/></label>
                  <label>Purpose of Visit<select value={visitPurpose} onChange={e=>{setVisitPurpose(e.target.value);setVisitPurposeOther("");}} required><option value="">Select purpose</option><option>Breakdown</option><option>Maintenance</option></select></label>
                  {visitPurpose === "Other" && <label>Other Purpose Details<input value={visitPurposeOther} onChange={e=>setVisitPurposeOther(e.target.value)} placeholder="Please specify purpose" required/></label>}
                  <label className="siteAddress">IN Remarks<input value={inRemark} onChange={e=>setInRemark(e.target.value)} placeholder="Additional remarks"/></label>
                </div>
                <div className="siteFormActions"><button className="primaryBtn siteSave" disabled={vehicleSaving}>{vehicleSaving?"Saving...":"Register Vehicle IN"} <ArrowUpRight size={17}/></button></div>
              </form>
            </div>}
            {section==="vehicle-out"&&<div className="siteFormCard">
              <div className="siteFormTitle"><div className="siteIcon"><LogOut size={20}/></div><div><h3>Vehicle OUT</h3><p>Only vehicles currently inside the garage can be released.</p></div></div>
              <form className="siteForm" onSubmit={saveVehicleOut}>
                <div className="siteFields">
                  <label className="siteAddress">Select vehicle<select value={selectedOutId} onChange={e=>setSelectedOutId(e.target.value)} required><option value="">Select vehicle currently IN</option>{vehicles.filter(v=>v.status==="IN").map(v=><option key={v.id} value={v.id}>{v.ptc_id || "No PTC ID"} · {v.vehicle_type} · {v.complaint}</option>)}</select></label>
                  <div className="siteAddress workTeamBlock"><div className="workTeamHeading"><b>Staff who worked on this vehicle</b><button type="button" className="secondaryBtn" onClick={()=>setWorkTeam([...workTeam,{name:"",designation:"",work_done:""}])}><Plus size={15}/> Add staff</button></div>{workTeam.map((worker,index)=><div className="workTeamRow" key={index}><label>Staff name<input value={worker.name} onChange={e=>setWorkTeam(workTeam.map((w,i)=>i===index?{...w,name:e.target.value}:w))} placeholder="Enter employee name" required/></label><label>Designation<input value={worker.designation} onChange={e=>setWorkTeam(workTeam.map((w,i)=>i===index?{...w,designation:e.target.value}:w))} placeholder="e.g. Mechanic" required/></label><label>Work done<input value={worker.work_done} onChange={e=>setWorkTeam(workTeam.map((w,i)=>i===index?{...w,work_done:e.target.value}:w))} placeholder="Describe work completed" required/></label>{workTeam.length>1&&<button type="button" className="iconAction deactivate" onClick={()=>setWorkTeam(workTeam.filter((_,i)=>i!==index))}><X size={15}/> Remove</button>}</div>)}</div><label className="siteAddress">OUT Remarks<input value={outRemark} onChange={e=>setOutRemark(e.target.value)} placeholder="Final inspection / release remarks"/></label>
                </div>
                <div className="siteFormActions"><button className="primaryBtn siteSave" disabled={vehicleSaving || !selectedOutId}>{vehicleSaving?"Saving...":"Confirm Vehicle OUT"} <ArrowUpRight size={17}/></button></div>
              </form>
            </div>}
          </div>}
          { (section==="vehicle-in"||section==="vehicle-out"||section==="vehicle-in-history"||section==="vehicle-out-history")&&<>
          <div className="siteListHeader"><div><h3>{section==="vehicle-in"||section==="vehicle-in-history"?"Vehicle IN records":"Vehicle OUT records"}</h3><p>{vehicles.filter(v=>v.status==="IN").length} currently in garage · {vehicles.length} total records</p></div><span className="siteCount">{vehicles.filter(v=>(section==="vehicle-in"||section==="vehicle-in-history")||v.status==="OUT").length} Records</span></div>
          {vehicleLoading?<div className="siteEmpty"><div className="spinner"/> Loading vehicle records...</div>:<div className="siteTableWrap"><table className="siteTable"><thead><tr><th>PTC ID</th><th>Vehicle Type</th><th>Complaint</th><th>IN Date / Time</th><th>OUT Date / Time</th><th>Garage Duration</th><th>Work Details</th><th>Status</th></tr></thead><tbody>
            {vehicles.filter(v=>(section==="vehicle-in"||section==="vehicle-in-history")||v.status==="OUT").map(v=><tr key={v.id}><td><b>{v.ptc_id||"—"}</b></td><td>{v.vehicle_type}</td><td>{v.complaint}</td><td>{new Date(v.in_at).toLocaleString()}</td><td>{v.out_at?new Date(v.out_at).toLocaleString():"—"}</td><td>{formatDuration(v.in_at,v.out_at)}</td><td>{v.work_details?.length ? v.work_details.map(w=>`${w.name} (${w.designation}): ${w.work_done}`).join("; ") : "—"}</td><td><span className={v.status==="IN"?"statusActive":"statusInactive"}>{v.status}</span></td></tr>)}
            {vehicles.filter(v=>(section==="vehicle-in"||section==="vehicle-in-history")||v.status==="OUT").length===0 && <tr><td colSpan={8}>No vehicle records found.</td></tr>}
          </tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/> {profile.role==="admin"?"You can view vehicle movements across all sites.":"You can view vehicle movements for your assigned site only."} IN / OUT timestamps are recorded automatically.</div>
          </>}
        </section>}
        {section==="employee-directory" && profile.role==="admin" && <section className="sitePage">
          <div className="siteIntro"><div><span className="eyebrow dark">ADMINISTRATION</span><h1>Employee Directory</h1><p>Manage every garage and support employee, whether they have an app login or not.</p></div><div className="siteActions"><button className="refreshBtn" onClick={()=>{setEmployeeMessage("");void loadEmployeeDirectory();void loadTeamUsers();}}><RefreshCw size={16}/> Refresh</button><button className="primaryBtn siteSave" onClick={startNewEmployee}><Plus size={16}/> Add Employee</button></div></div>
          {employeeFormOpen && <div className="siteFormCard">
            <div className="siteFormTitle"><div className="siteIcon"><ContactRound size={20}/></div><div><h3>{editingEmployee?"Edit employee details":"Add a new employee"}</h3><p>Login account is optional. You can create the employee record now and link an account later.</p></div></div>
            <form className="siteForm" onSubmit={saveEmployee}>
              <div className="siteFields">
                <label>Employee ID<input value={employeeForm.employee_code} onChange={e=>setEmployeeForm({...employeeForm,employee_code:e.target.value})} placeholder="e.g. EMP001" required maxLength={40}/></label>
                <label>Employee Name<input value={employeeForm.full_name} onChange={e=>setEmployeeForm({...employeeForm,full_name:e.target.value})} placeholder="Enter full name" required maxLength={120}/></label>
                <label>Department<input value={employeeForm.department} onChange={e=>setEmployeeForm({...employeeForm,department:e.target.value})} placeholder="e.g. Garage / Transport / Stores"/></label>
                <label>Designation<input value={employeeForm.designation} onChange={e=>setEmployeeForm({...employeeForm,designation:e.target.value})} placeholder="e.g. Mechanic / Electrician / Driver"/></label>
                <label>Assigned Site<select value={employeeForm.site_id} onChange={e=>setEmployeeForm({...employeeForm,site_id:e.target.value})}><option value="">Not assigned / Head Office</option>{sites.map(site=><option key={site.id} value={site.id}>{site.name}{site.is_active?"":" (Inactive)"}</option>)}</select></label>
                <label>Reporting Manager<input value={employeeForm.reporting_manager} onChange={e=>setEmployeeForm({...employeeForm,reporting_manager:e.target.value})} placeholder="Manager name"/></label>
                <label>Phone<input type="tel" value={employeeForm.phone} onChange={e=>setEmployeeForm({...employeeForm,phone:e.target.value})} placeholder="Contact number"/></label>
                <label>Email<input type="email" value={employeeForm.email} onChange={e=>setEmployeeForm({...employeeForm,email:e.target.value})} placeholder="name@company.com"/></label>
                <label>Date Joined<input type="date" value={employeeForm.date_joined} onChange={e=>setEmployeeForm({...employeeForm,date_joined:e.target.value})}/></label>
                <label>Employment Status<select value={employeeForm.employment_status} onChange={e=>setEmployeeForm({...employeeForm,employment_status:e.target.value as EmployeeForm["employment_status"]})}><option>Active</option><option>Inactive</option><option>On Leave</option></select></label>
                <label className="siteAddress">Link Login Account (Optional)<select value={employeeForm.linked_user_id} onChange={e=>setEmployeeForm({...employeeForm,linked_user_id:e.target.value})}><option value="">No login account linked</option>{teamUsers.map(user=><option key={user.user_id} value={user.user_id}>{user.full_name} · {user.username||user.role}</option>)}</select></label>
                <label className="siteAddress">Notes<textarea className="employeeNotes" value={employeeForm.notes} onChange={e=>setEmployeeForm({...employeeForm,notes:e.target.value})} placeholder="Additional employee details (optional)" rows={3}/></label>
              </div>
              {employeeMessage && <div className={employeeMessage.includes("successfully")||employeeMessage.includes(" is now ")? "siteSuccess":"siteError"}>{employeeMessage}</div>}
              <div className="siteFormActions"><button type="button" className="secondaryBtn" onClick={()=>{setEmployeeFormOpen(false);setEditingEmployee(null);setEmployeeForm(emptyEmployeeForm());}}><X size={15}/> Cancel</button><button className="primaryBtn siteSave" disabled={employeeSaving}>{employeeSaving?"Saving...":editingEmployee?"Save Changes":"Save Employee"} <Plus size={16}/></button></div>
            </form>
          </div>}
          <div className="siteFormCard employeeDirectoryTools">
            <div className="employeeDirectoryFilters">
              <label>Search employee<input value={employeeSearch} onChange={e=>setEmployeeSearch(e.target.value)} placeholder="Search ID, name, department, designation..."/></label>
              <label>Status<select value={employeeStatusFilter} onChange={e=>setEmployeeStatusFilter(e.target.value)}><option value="all">All statuses</option><option>Active</option><option>Inactive</option><option>On Leave</option></select></label>
              <label>Assigned Site<select value={employeeSiteFilter} onChange={e=>setEmployeeSiteFilter(e.target.value)}><option value="all">All sites</option>{sites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
              <button className="secondaryBtn employeeExport" type="button" onClick={exportEmployeeDirectory}><Upload size={15}/> Export CSV</button>
            </div>
          </div>
          <div className="siteListHeader"><div><h3>All employees</h3><p>{employees.filter(employee=>employee.employment_status==="Active").length} active · {employees.length} total employee records</p></div><span className="siteCount">{filteredEmployees.length} Showing</span></div>
          {employeeMessage && !employeeFormOpen && <div className={employeeMessage.includes("successfully")||employeeMessage.includes(" is now ")? "siteSuccess":"siteError"} style={{marginBottom:14}}>{employeeMessage}</div>}
          {employeesLoading?<div className="siteEmpty"><div className="spinner"/> Loading employee directory...</div>:<div className="siteTableWrap"><table className="siteTable employeeTable"><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Assigned Site</th><th>Reporting Manager</th><th>Login Account</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {filteredEmployees.map(employee=><tr key={employee.id}><td><div className="employeeNameCell"><span className="employeeAvatar">{employee.full_name.trim().split(/\s+/).map(part=>part[0]).slice(0,2).join("").toUpperCase()}</span><span><b>{employee.full_name}</b><small>{employee.employee_code}</small></span></div></td><td>{employee.department||"—"}</td><td>{employee.designation||"—"}</td><td>{sites.find(site=>site.id===employee.site_id)?.name||"—"}</td><td>{employee.reporting_manager||"—"}</td><td>{employee.linked_user_id?(teamUsers.find(user=>user.user_id===employee.linked_user_id)?.username||"Linked"):"No login"}</td><td><span className={employee.employment_status==="Active"?"statusActive":"statusInactive"}>{employee.employment_status}</span></td><td><div className="siteActions"><button type="button" className="iconAction" onClick={()=>startEditEmployee(employee)}><Pencil size={14}/> Edit</button><button type="button" className={employee.employment_status==="Active"?"iconAction deactivate":"iconAction activate"} onClick={()=>toggleEmployeeStatus(employee)}><Power size={14}/>{employee.employment_status==="Active"?"Deactivate":"Activate"}</button></div></td></tr>)}
            {filteredEmployees.length===0&&<tr><td colSpan={8}>No employees match your search. Add an employee or change the filters.</td></tr>}
          </tbody></table></div>}
          <div className="siteFootnote"><LockKeyhole size={15}/> Employee records are separate from login accounts. Creating, editing or deactivating a directory record does not create or disable a sign-in account.</div>
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
        {!["overview","sites","users","employee-directory","vehicle-in","vehicle-out","vehicle-in-history","vehicle-out-history","parts-order","orders","parts-receive","receipts","breakdown-dashboard","breakdowns","maintenance","reports"].includes(section) && <ModuleWorkspace section={section} profile={profile} sites={sites} onNavigate={setSection}/>}

      </div>
    </section>
  </main></ArabicTranslator>;
}

function formatDuration(start: string, end: string | null) {
  const ms = Math.max(0, (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function visitCategory(purpose:string|null):"breakdown"|"maintenance"|"other" {
  const value=(purpose||"").toLowerCase();
  if(value.includes("breakdown")) return "breakdown";
  if(value.includes("maintenance")||value.includes("preventive")||value.includes("(pm)")) return "maintenance";
  return "other";
}
function VisitTable({rows}:{rows:Vehicle[]}) {
  return <div className="siteTableWrap"><table className="siteTable visitTable"><thead><tr><th>PTC ID</th><th>Vehicle</th><th>Purpose</th><th>Complaint / Problem</th><th>Work Description</th><th>IN Date / Time</th><th>OUT Date / Time</th><th>Duration</th><th>Status</th><th>IN Remarks</th><th>OUT Remarks</th><th>Work Details</th></tr></thead><tbody>
    {rows.map(v=><tr key={v.id}><td><span className="ptcIdTag">{v.ptc_id||"—"}</span></td><td>{v.vehicle_type}</td><td>{v.purpose_of_visit||"—"}</td><td>{v.complaint}</td><td>{v.work_description||"—"}</td><td>{new Date(v.in_at).toLocaleString()}</td><td>{v.out_at?new Date(v.out_at).toLocaleString():"—"}</td><td>{formatDuration(v.in_at,v.out_at)}</td><td><span className={v.status==="IN"?"statusActive":"statusInactive"}>{v.status}</span></td><td>{v.in_remark||"—"}</td><td>{v.out_remark||"—"}</td><td>{v.work_details?.length?v.work_details.map(w=>w.name+" ("+w.designation+"): "+w.work_done).join("; "):"—"}</td></tr>)}
    {rows.length===0&&<tr><td colSpan={12}>No records found for this category.</td></tr>}
  </tbody></table></div>;
}
function Stat({icon,label,value,hint}:{icon:React.ReactNode;label:string;value:number;hint:string}) { return <div className="statCard"><div className="statTop"><span>{label}</span><i>{icon}</i></div><strong>{value.toLocaleString()}</strong><small>{hint}</small></div>; }
function Quick({icon,title,desc,onClick}:{icon:React.ReactNode;title:string;desc:string;onClick:()=>void}) { return <button className="quickCard" onClick={onClick}><i>{icon}</i><b>{title}</b><span>{desc}</span><ArrowUpRight className="quickArrow" size={18}/></button>; }
