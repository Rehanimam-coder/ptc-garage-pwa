"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/date-format";

type Profile = { user_id: string; role: "admin" | "supervisor" | "storekeeper"; site_id: string | null };
type Site = { id: string; name: string };

const fields = [
  ["item_code", "Item code"],
  ["item_name", "Item name"],
  ["category", "Category"],
  ["unit", "Unit"],
  ["quantity_on_hand", "Available quantity"],
  ["reorder_level", "Reorder point"],
  ["remarks", "Remarks"]
] as const;

function shown(value: any) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export default function GeneralStoreHistory({ profile, sites }: { profile: Profile; sites: Site[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"grid"|"list">("grid");

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError("");
    let query = supabase.from("general_store_item_history").select("*").order("changed_at", { ascending: false }).limit(500);
    if (profile.role === "supervisor" && profile.site_id) query = query.eq("site_id", profile.site_id);
    const [{ data, error: historyError }, { data: profiles }] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id,full_name,username")
    ]);
    if (historyError) setError("Could not load General Stores history: " + historyError.message);
    else setRows(data || []);
    setPeople(Object.fromEntries((profiles || []).map((person: any) => [
      person.user_id, person.full_name || person.username || "Team member"
    ])));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [profile.user_id, profile.role, profile.site_id]);

  const siteName = (id: string) => sites.find(site => site.id === id)?.name || "—";
  const actionLabel: Record<string, string> = {
    snapshot: "Opening snapshot",
    insert: "Item created",
    update: "Item updated",
    delete: "Item deleted"
  };

  return <section className={`sitePage generalStoreHistory ${viewMode==="list"?"generalStoreHistoryList":""}`} style={{ marginTop: 26 }}>
    <div className="siteListHeader">
      <div>
        <h3>General Stores change history</h3>
        <p>Every saved stock or item change is retained with the previous and new values.</p>
      </div>
      <div className="moduleHeaderActions">
        <span className="siteCount">{rows.length} History records</span>
        <div className="moduleHeaderActions"><button type="button" className={viewMode==="grid"?"toolbarChip active":"toolbarChip"} aria-pressed={viewMode==="grid"} onClick={()=>setViewMode("grid")}>▦ Grid View</button><button type="button" className={viewMode==="list"?"toolbarChip active":"toolbarChip"} aria-pressed={viewMode==="list"} onClick={()=>setViewMode("list")}>☷ List View</button><button type="button" className="refreshBtn" onClick={load}>Refresh history</button></div>
      </div>
    </div>
    {error && <div className="siteError">{error}</div>}
    {loading ? <div className="siteEmpty">Loading General Stores history...</div> :
      rows.length === 0 ? <div className="siteEmpty">No General Stores history found.</div> :
      <div className="recordCardGrid">
        {rows.map(row => {
          const before = row.old_values || {};
          const after = row.new_values || {};
          const current = row.action === "delete" ? before : after;
          const changed = fields.filter(([key]) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
          return <article className="recordCard" key={row.id}>
            <div className="recordCardHead">
              <div className="recordCardTitle">
                <span className="recordCardEyebrow">{siteName(row.site_id)} · {formatDateTime(row.changed_at)}</span>
                <h3>{shown(current.item_name || current.item_code || "General Store item")}</h3>
                <small>{actionLabel[row.action] || row.action} · {people[row.changed_by] || "System / team member"}</small>
              </div>
              <span className="recordStatus">{row.action === "delete" ? "Deleted" : row.action === "update" ? "Updated" : "Saved"}</span>
            </div>
            <div className="recordCardFields">
              <div className="recordCardField"><small>Item code</small><b>{shown(current.item_code)}</b></div>
              <div className="recordCardField"><small>Available quantity</small><b>{shown(current.quantity_on_hand)} {shown(current.unit) === "—" ? "" : current.unit}</b></div>
              <div className="recordCardField"><small>Changed by</small><b>{people[row.changed_by] || "System / team member"}</b></div>
              <div className="recordCardField"><small>Changed at</small><b>{formatDateTime(row.changed_at)}</b></div>
            </div>
            <details className="recordCardDetails">
              <summary>Compare previous and saved details <span>→</span></summary>
              <div className="recordCardFields expanded">
                {fields.map(([key, label]) => <div className="recordCardField" key={"old-" + key}>
                  <small>Previous · {label}</small><b>{row.action === "insert" || row.action === "snapshot" ? "—" : shown(before[key])}</b>
                </div>)}
                {fields.map(([key, label]) => <div className="recordCardField" key={"new-" + key}>
                  <small>{row.action === "delete" ? "Deleted · " : "Saved · "}{label}</small><b>{row.action === "delete" ? "—" : shown(after[key])}</b>
                </div>)}
                <div className="recordCardField"><small>Changed fields</small><b>{row.action === "insert" || row.action === "snapshot" ? "Initial item details" : changed.map(([, label]) => label).join(", ") || "No visible field changes"}</b></div>
              </div>
            </details>
          </article>;
        })}
      </div>}
    <div className="siteFootnote">History is append-only for normal users. Supervisors see their assigned site only; Store Keeper sees General Stores records across sites. Vehicle records are not included.</div>
  </section>;
}
