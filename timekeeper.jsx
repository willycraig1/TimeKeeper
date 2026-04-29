import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const PALETTE = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

const fmtDate = d => d.toISOString().split("T")[0];
const todayStr = () => fmtDate(new Date());

const getMonday = s => {
  const d = new Date(s + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
};

const weekDatesFrom = start => Array.from({length: 7}, (_, i) => {
  const d = new Date(start + "T12:00:00");
  d.setDate(d.getDate() + i);
  return fmtDate(d);
});

const dispDate = s => new Date(s + "T12:00:00").toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric"});
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const s = {
  root: {fontFamily:"system-ui, -apple-system, sans-serif", minHeight:"100vh", background:"#f9fafb"},
  nav: {background:"white", borderBottom:"1px solid #e5e7eb", padding:"0 20px", position:"sticky", top:0, zIndex:10},
  navInner: {maxWidth:860, margin:"0 auto", display:"flex", alignItems:"center"},
  brand: {padding:"12px 0", marginRight:24},
  brandName: {fontSize:15, fontWeight:600, color:"#111827", letterSpacing:"-0.01em"},
  brandSub: {fontSize:10, color:"#9ca3af", letterSpacing:"0.07em", marginTop:1},
  tab: a => ({padding:"14px 14px", background:"none", border:"none", borderBottom: a?"2px solid #4f46e5":"2px solid transparent", color: a?"#4f46e5":"#6b7280", fontSize:13, fontWeight: a?500:400, cursor:"pointer", transition:"all 0.12s", whiteSpace:"nowrap"}),
  main: {maxWidth:860, margin:"0 auto", padding:"20px"},
  card: {background:"white", border:"1px solid #e5e7eb", borderRadius:10, padding:"18px 20px"},
  label: {fontSize:11, fontWeight:500, color:"#6b7280", letterSpacing:"0.06em", marginBottom:5, display:"block"},
  input: {width:"100%", border:"1px solid #d1d5db", borderRadius:6, padding:"8px 10px", fontSize:13, color:"#111827", background:"white", boxSizing:"border-box", outline:"none"},
  btnPrimary: (bg) => ({background:bg||"#4f46e5", color:"white", border:"none", borderRadius:6, padding:"9px 18px", fontSize:13, fontWeight:500, cursor:"pointer", width:"100%"}),
  btnGhost: {background:"transparent", color:"#9ca3af", border:"1px solid #e5e7eb", borderRadius:5, padding:"3px 8px", fontSize:11, cursor:"pointer"},
  btnAI: {background:"#ede9fe", color:"#6d28d9", border:"1px solid #c4b5fd", borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap"},
  stat: {background:"#f9fafb", border:"1px solid #f3f4f6", borderRadius:8, padding:"12px 14px", flex:1},
  statNum: {fontSize:22, fontWeight:600, color:"#111827", lineHeight:1},
  statLabel: {fontSize:11, color:"#9ca3af", marginTop:4},
};

export default function App() {
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("log");
  const [ready, setReady] = useState(false);

  const [lDate, setLDate] = useState(todayStr());
  const [lProj, setLProj] = useState("");
  const [lHours, setLHours] = useState("");
  const [lNote, setLNote] = useState("");
  const [aiLoading, setAiLoading] = useState(null);
  const [flash, setFlash] = useState(false);

  const [showPF, setShowPF] = useState(false);
  const [pName, setPName] = useState("");
  const [pCode, setPCode] = useState("");
  const [pColor, setPColor] = useState(PALETTE[0]);

  const [xWeek, setXWeek] = useState(todayStr());
  const [xMonth, setXMonth] = useState(todayStr().slice(0, 7));
  const [filterMonth, setFilterMonth] = useState(todayStr().slice(0, 7));

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("tk_projects"); if (r) setProjects(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get("tk_entries"); if (r) setEntries(JSON.parse(r.value)); } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) window.storage.set("tk_projects", JSON.stringify(projects)).catch(()=>{}); }, [projects, ready]);
  useEffect(() => { if (ready) window.storage.set("tk_entries", JSON.stringify(entries)).catch(()=>{}); }, [entries, ready]);

  const projMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const addEntry = () => {
    const h = parseFloat(lHours);
    if (!lProj || !lHours || !lDate || isNaN(h) || h <= 0) return;
    setEntries(prev => [{id:Date.now().toString(), date:lDate, projectId:lProj, hours:h, note:lNote.trim(), aiNote:""}, ...prev]);
    setLHours(""); setLNote("");
    setFlash(true); setTimeout(() => setFlash(false), 1200);
  };

  const expandAI = async id => {
    const entry = entries.find(e => e.id === id);
    if (!entry?.note) return;
    const proj = projMap[entry.projectId];
    setAiLoading(id);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:300,
          messages:[{role:"user", content:`Expand this brief time log note into a professional billing description for a client invoice. 2-3 sentences. No first person. Start with an action verb. Output ONLY the description, nothing else.\n\nProject: ${proj?.name||""}\nHours: ${entry.hours}\nNote: "${entry.note}"`}]
        })
      });
      const data = await res.json();
      const txt = data.content?.find(b=>b.type==="text")?.text?.trim()||"";
      if (txt) setEntries(p => p.map(e => e.id===id ? {...e, aiNote:txt} : e));
    } catch {}
    setAiLoading(null);
  };

  const saveProject = () => {
    if (!pName.trim()) return;
    setProjects(p => [...p, {id:Date.now().toString(), name:pName.trim(), code:pCode.trim().toUpperCase(), color:pColor}]);
    setPName(""); setPCode(""); setPColor(PALETTE[projects.length % PALETTE.length]);
    setShowPF(false);
  };

  const exportExcel = () => {
    const mon = getMonday(xWeek);
    const dates = weekDatesFrom(mon);
    const sun = dates[6];
    const we = entries.filter(e => e.date >= mon && e.date <= sun);
    const used = projects.filter(p => we.some(e => e.projectId === p.id));
    if (!used.length) { alert("No entries for that week."); return; }

    const wb = XLSX.utils.book_new();
    const hdr = ["Project","Code",...dates.map((d,i) => { const dt=new Date(d+"T12:00:00"); return `${DAYS[i]} ${dt.getMonth()+1}/${dt.getDate()}`; }),"Total"];
    const rows = used.map(proj => {
      const cells = dates.map(d => { const t=we.filter(e=>e.projectId===proj.id&&e.date===d).reduce((s,e)=>s+e.hours,0); return t||""; });
      return [proj.name, proj.code||"", ...cells, +cells.reduce((s,v)=>s+(v||0),0).toFixed(2)];
    });
    const totRow = ["TOTAL","",...dates.map(d => { const t=we.filter(e=>e.date===d).reduce((s,e)=>s+e.hours,0); return t||""; }), +we.reduce((s,e)=>s+e.hours,0).toFixed(2)];

    const ws = XLSX.utils.aoa_to_sheet([hdr,...rows,totRow]);
    ws["!cols"] = [{wch:32},{wch:12},...Array(8).fill({wch:10})];
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    XLSX.writeFile(wb, `Timesheet_${mon}.xlsx`);
  };

  const exportWord = () => {
    const [y, m] = xMonth.split("-");
    const mStart = xMonth + "-01";
    const mEnd = fmtDate(new Date(parseInt(y), parseInt(m), 0));
    const me = entries.filter(e => e.date >= mStart && e.date <= mEnd);
    if (!me.length) { alert("No entries for that month."); return; }
    const used = projects.filter(p => me.some(e => e.projectId === p.id));
    const monthLabel = new Date(mStart+"T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});
    const grand = me.reduce((s,e)=>s+e.hours,0);

    const rows = used.map(proj => {
      const pe = me.filter(e=>e.projectId===proj.id).sort((a,b)=>a.date.localeCompare(b.date));
      const hrs = pe.reduce((s,e)=>s+e.hours,0);
      const desc = pe.map(e => { const n=e.aiNote||e.note; return n?`<b>${dispDate(e.date)}</b>: ${n}`:null; }).filter(Boolean).join("<br>");
      return `<tr><td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top;font-weight:bold;width:22%">${proj.name}${proj.code?`<br><span style="font-weight:normal;font-size:10px;color:#9ca3af">Code: ${proj.code}</span>`:""}</td><td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top;width:63%;line-height:1.6">${desc||"(no notes)"}</td><td style="border:1px solid #d1d5db;padding:8px 10px;text-align:center;vertical-align:top;font-weight:bold;width:15%">${hrs.toFixed(1)}</td></tr>`;
    }).join("");

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:Calibri,sans-serif;font-size:11pt;margin:1in}h1{font-size:16pt;color:#1e3a5f;margin-bottom:2pt}p.sub{font-size:11pt;color:#6b7280;margin-top:0}table{border-collapse:collapse;width:100%;margin-top:14pt}th{background:#1e3a5f;color:white;padding:8px 10px;text-align:left;font-size:10pt}</style></head><body><h1>Project work descriptions</h1><p class="sub">${monthLabel}</p><table><tr><th style="width:22%;border:1px solid #1e3a5f">Project</th><th style="width:63%;border:1px solid #1e3a5f">Work completed</th><th style="width:15%;border:1px solid #1e3a5f;text-align:center">Hours</th></tr>${rows}<tr><td colspan="2" style="border:1px solid #d1d5db;padding:8px 10px;text-align:right;font-weight:bold">Total hours</td><td style="border:1px solid #d1d5db;padding:8px 10px;text-align:center;font-weight:bold">${grand.toFixed(1)}</td></tr></table></body></html>`;

    const blob = new Blob([html], {type:"application/msword"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`Descriptions_${xMonth}.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  const thisMonth = todayStr().slice(0,7);
  const mAll = entries.filter(e=>e.date.startsWith(thisMonth));
  const mHours = mAll.reduce((s,e)=>s+e.hours,0);
  const pendingAI = entries.filter(e=>e.note&&!e.aiNote).length;

  const visibleEntries = entries.filter(e => e.date.startsWith(filterMonth));
  const grouped = visibleEntries.reduce((acc,e) => { (acc[e.date]=acc[e.date]||[]).push(e); return acc; }, {});
  const sortedDates = Object.keys(grouped).sort((a,b)=>b.localeCompare(a));

  const availableMonths = [...new Set(entries.map(e=>e.date.slice(0,7)))].sort((a,b)=>b.localeCompare(a));

  return (
    <div style={s.root}>
      <div style={s.nav}>
        <div style={s.navInner}>
          <div style={s.brand}>
            <div style={s.brandName}>Timekeeper</div>
            <div style={s.brandSub}>TIME &amp; BILLING</div>
          </div>
          {[["log","Log time"],["projects","Projects"],["export","Export"]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={s.tab(tab===id)}>{label}</button>
          ))}
          <div style={{marginLeft:"auto", fontSize:12, color:"#9ca3af"}}>
            {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
          </div>
        </div>
      </div>

      <div style={s.main}>

        {tab==="log" && (
          <div>
            <div style={{display:"flex", gap:8, marginBottom:16}}>
              {[
                [mHours.toFixed(1)+"h","this month"],
                [new Set(mAll.map(e=>e.projectId)).size+" proj","active"],
                [mAll.length+" entries","logged"],
                [pendingAI+" notes","need AI expand"]
              ].map(([num,lbl]) => (
                <div key={lbl} style={s.stat}>
                  <div style={s.statNum}>{num}</div>
                  <div style={s.statLabel}>{lbl}</div>
                </div>
              ))}
            </div>

            <div style={{...s.card, marginBottom:16}}>
              <div style={{display:"grid", gridTemplateColumns:"150px 1fr 100px", gap:10, marginBottom:10}}>
                <div>
                  <label style={s.label}>DATE</label>
                  <input type="date" value={lDate} onChange={e=>setLDate(e.target.value)} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>PROJECT</label>
                  <select value={lProj} onChange={e=>setLProj(e.target.value)} style={s.input}>
                    <option value="">— select project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.code?` · ${p.code}`:""}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>HOURS</label>
                  <input type="number" step="0.25" min="0.25" max="24" placeholder="0.00" value={lHours}
                    onChange={e=>setLHours(e.target.value)} style={{...s.input, fontFamily:"monospace"}} />
                </div>
              </div>
              <div style={{display:"flex", gap:10, alignItems:"flex-end"}}>
                <div style={{flex:1}}>
                  <label style={s.label}>NOTE (brief — AI will expand later)</label>
                  <input type="text" value={lNote} onChange={e=>setLNote(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addEntry()}
                    placeholder="e.g. drafted wireframes for homepage, client review call, fixed auth bug"
                    style={s.input} />
                </div>
                <button onClick={addEntry} style={{
                  background: flash?"#16a34a":"#4f46e5", color:"white", border:"none", borderRadius:6,
                  padding:"9px 20px", fontSize:13, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap",
                  transition:"background 0.2s", opacity:(!lProj||!lHours||!lDate)?0.4:1
                }}>
                  {flash ? "✓ Added" : "Add entry"}
                </button>
              </div>
              {projects.length===0 && (
                <div style={{marginTop:10, fontSize:12, color:"#ef4444"}}>
                  → Add your billing projects first under the Projects tab
                </div>
              )}
            </div>

            {entries.length > 0 && (
              <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
                <label style={{...s.label, margin:0, whiteSpace:"nowrap"}}>VIEWING</label>
                <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{...s.input, width:"auto", fontSize:12}}>
                  {availableMonths.map(m => {
                    const lbl = new Date(m+"-01T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});
                    return <option key={m} value={m}>{lbl}{m===thisMonth?" (current)":""}</option>;
                  })}
                </select>
                <span style={{fontSize:12, color:"#9ca3af", whiteSpace:"nowrap"}}>
                  {visibleEntries.reduce((s,e)=>s+e.hours,0).toFixed(1)}h · {visibleEntries.length} entries
                </span>
                {visibleEntries.some(e=>e.note&&!e.aiNote) && (
                  <button onClick={async()=>{
                    const toExpand = visibleEntries.filter(e=>e.note&&!e.aiNote);
                    for (const e of toExpand) await expandAI(e.id);
                  }} style={{...s.btnAI, marginLeft:"auto", whiteSpace:"nowrap"}}>
                    ✦ Expand all notes with AI
                  </button>
                )}
              </div>
            )}

            {visibleEntries.length===0 && entries.length===0 ? (
              <div style={{textAlign:"center", color:"#d1d5db", padding:"48px 0", fontSize:14}}>
                No entries yet — start logging above
              </div>
            ) : visibleEntries.length===0 ? (
              <div style={{textAlign:"center", color:"#d1d5db", padding:"36px 0", fontSize:14}}>
                No entries for this month
              </div>
            ) : (
              <div>
                {sortedDates.map(date => (
                  <div key={date} style={{marginBottom:10}}>
                    <div style={{fontSize:11, fontWeight:500, color:"#9ca3af", padding:"4px 0 5px", display:"flex", alignItems:"center", gap:8}}>
                      <span>{dispDate(date)}</span>
                      <span style={{color:"#d1d5db"}}>·</span>
                      <span style={{fontFamily:"monospace"}}>{grouped[date].reduce((s,e)=>s+e.hours,0).toFixed(1)}h</span>
                    </div>
                    {grouped[date].map(entry => {
                      const proj = projMap[entry.projectId];
                      return (
                        <div key={entry.id} style={{
                          background:"white", border:"1px solid #f3f4f6",
                          borderLeft:`3px solid ${proj?.color||"#e5e7eb"}`,
                          borderRadius:"0 7px 7px 0", padding:"9px 12px",
                          display:"flex", alignItems:"flex-start", gap:10, marginBottom:2
                        }}>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom: (entry.note||entry.aiNote)?4:0}}>
                              <span style={{fontSize:13, fontWeight:500, color:proj?.color||"#374151"}}>{proj?.name||"Unknown project"}</span>
                              {proj?.code && <span style={{fontSize:10, color:"#9ca3af", background:"#f3f4f6", padding:"1px 5px", borderRadius:3, fontFamily:"monospace"}}>{proj.code}</span>}
                              <span style={{fontSize:13, fontWeight:600, color:"#111827", marginLeft:"auto", fontFamily:"monospace"}}>{entry.hours.toFixed(2)}h</span>
                            </div>
                            {entry.aiNote ? (
                              <div style={{fontSize:12, color:"#374151", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:5, padding:"5px 9px", display:"flex", gap:6, lineHeight:1.5}}>
                                <span style={{fontSize:10, color:"#16a34a", fontWeight:500, flexShrink:0, paddingTop:2}}>AI ✦</span>
                                <span>{entry.aiNote}</span>
                              </div>
                            ) : entry.note ? (
                              <div style={{fontSize:12, color:"#6b7280", lineHeight:1.5}}>{entry.note}</div>
                            ) : null}
                          </div>
                          <div style={{display:"flex", gap:4, flexShrink:0, paddingTop:1}}>
                            {entry.note && (
                              <button onClick={()=>expandAI(entry.id)} disabled={aiLoading===entry.id}
                                style={{...s.btnAI, opacity:aiLoading===entry.id?0.45:1}}>
                                {aiLoading===entry.id ? "..." : entry.aiNote ? "↺ Re-expand" : "✦ AI expand"}
                              </button>
                            )}
                            <button onClick={()=>setEntries(p=>p.filter(e=>e.id!==entry.id))} style={s.btnGhost}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="projects" && (
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
              <span style={{fontSize:13, color:"#6b7280"}}>{projects.length} project{projects.length!==1?"s":""}</span>
              <button onClick={()=>setShowPF(v=>!v)} style={{...s.btnPrimary(), width:"auto", padding:"8px 16px"}}>
                {showPF?"Cancel":"+ Add project"}
              </button>
            </div>

            {showPF && (
              <div style={{...s.card, marginBottom:14, border:"1px solid #c7d2fe", background:"#fafafe"}}>
                <div style={{display:"grid", gridTemplateColumns:"1fr 150px", gap:12, marginBottom:12}}>
                  <div>
                    <label style={s.label}>PROJECT NAME</label>
                    <input value={pName} onChange={e=>setPName(e.target.value)}
                      placeholder="e.g. Acme Corp — Website Redesign" style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>BILLING CODE</label>
                    <input value={pCode} onChange={e=>setPCode(e.target.value)}
                      placeholder="e.g. ACM-001" style={{...s.input, fontFamily:"monospace"}} />
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={s.label}>COLOUR LABEL</label>
                  <div style={{display:"flex", gap:8}}>
                    {PALETTE.map(c => (
                      <div key={c} onClick={()=>setPColor(c)} style={{
                        width:24, height:24, borderRadius:"50%", background:c, cursor:"pointer",
                        outline: pColor===c?"2px solid #111827":"2px solid transparent",
                        outlineOffset:2, flexShrink:0
                      }} />
                    ))}
                  </div>
                </div>
                <button onClick={saveProject} style={{...s.btnPrimary(), width:"auto", padding:"8px 20px"}}>Save project</button>
              </div>
            )}

            {projects.length===0 ? (
              <div style={{...s.card, textAlign:"center", color:"#d1d5db", padding:"48px 0", fontSize:14}}>
                No projects yet
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                {projects.map(proj => {
                  const pe = entries.filter(e=>e.projectId===proj.id);
                  const hrs = pe.reduce((s,e)=>s+e.hours,0);
                  return (
                    <div key={proj.id} style={{...s.card, display:"flex", alignItems:"center", gap:12, padding:"12px 16px"}}>
                      <div style={{width:10, height:10, borderRadius:"50%", background:proj.color, flexShrink:0}} />
                      <div style={{flex:1}}>
                        <span style={{fontSize:14, fontWeight:500, color:"#111827"}}>{proj.name}</span>
                        {proj.code && <span style={{fontSize:11, color:"#9ca3af", fontFamily:"monospace", marginLeft:8, background:"#f3f4f6", padding:"1px 6px", borderRadius:3}}>{proj.code}</span>}
                      </div>
                      <div style={{fontSize:12, color:"#9ca3af", textAlign:"right", lineHeight:1.6}}>
                        <div>{hrs.toFixed(1)}h total</div>
                        <div>{pe.length} entries</div>
                      </div>
                      <button onClick={()=>{ setProjects(p=>p.filter(x=>x.id!==proj.id)); setEntries(p=>p.filter(e=>e.projectId!==proj.id)); }}
                        style={s.btnGhost}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab==="export" && (
          <div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14}}>

              <div style={s.card}>
                <div style={{fontSize:10, fontWeight:500, color:"#16a34a", letterSpacing:"0.07em", marginBottom:6}}>WEEKLY TIMESHEET</div>
                <div style={{fontSize:15, fontWeight:500, color:"#111827", marginBottom:4}}>Excel export</div>
                <div style={{fontSize:12, color:"#9ca3af", lineHeight:1.6, marginBottom:16}}>
                  Pivot grid: one column per project, one row per day, with totals. Pick any date within the target week.
                </div>
                <div style={{marginBottom:12}}>
                  <label style={s.label}>ANY DATE IN TARGET WEEK</label>
                  <input type="date" value={xWeek} onChange={e=>setXWeek(e.target.value)} style={s.input} />
                </div>
                <div style={{fontSize:12, color:"#9ca3af", marginBottom:12}}>
                  Week: <strong style={{color:"#374151"}}>{getMonday(xWeek)}</strong> → <strong style={{color:"#374151"}}>{weekDatesFrom(getMonday(xWeek))[6]}</strong>
                </div>
                <button onClick={exportExcel} style={s.btnPrimary("#16a34a")}>↓ Download .xlsx</button>
              </div>

              <div style={s.card}>
                <div style={{fontSize:10, fontWeight:500, color:"#d97706", letterSpacing:"0.07em", marginBottom:6}}>MONTHLY DESCRIPTIONS</div>
                <div style={{fontSize:15, fontWeight:500, color:"#111827", marginBottom:4}}>Word export</div>
                <div style={{fontSize:12, color:"#9ca3af", lineHeight:1.6, marginBottom:16}}>
                  Table with one row per project — work descriptions (AI-expanded where available) and total hours.
                </div>
                <div style={{marginBottom:12}}>
                  <label style={s.label}>BILLING MONTH</label>
                  <input type="month" value={xMonth} onChange={e=>setXMonth(e.target.value)} style={s.input} />
                </div>
                <div style={{fontSize:12, color:"#9ca3af", marginBottom:12}}>
                  {(() => {
                    const [y,m] = xMonth.split("-");
                    const me = entries.filter(e=>e.date.startsWith(xMonth));
                    return `${me.length} entries · ${me.reduce((s,e)=>s+e.hours,0).toFixed(1)}h · ${new Set(me.map(e=>e.projectId)).size} projects`;
                  })()}
                </div>
                <button onClick={exportWord} style={s.btnPrimary("#d97706")}>↓ Download .doc</button>
              </div>

            </div>

            <div style={{...s.card, background:"#fafafa"}}>
              <div style={{fontSize:13, fontWeight:500, color:"#374151", marginBottom:12}}>All-time summary</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8}}>
                {[
                  [entries.length, "total entries"],
                  [entries.reduce((s,e)=>s+e.hours,0).toFixed(1)+"h", "total hours logged"],
                  [entries.filter(e=>e.aiNote).length, "AI descriptions ready"],
                  [entries.filter(e=>e.note&&!e.aiNote).length, "notes pending expansion"]
                ].map(([val,lbl]) => (
                  <div key={lbl} style={s.stat}>
                    <div style={s.statNum}>{val}</div>
                    <div style={s.statLabel}>{lbl}</div>
                  </div>
                ))}
              </div>
              {entries.filter(e=>e.note&&!e.aiNote).length > 0 && (
                <div style={{marginTop:12, padding:"10px 14px", background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:7, fontSize:12, color:"#92400e"}}>
                  You have {entries.filter(e=>e.note&&!e.aiNote).length} notes without AI descriptions — expand them from the Log tab before exporting to get the best results.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
