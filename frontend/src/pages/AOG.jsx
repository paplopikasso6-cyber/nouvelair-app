import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AOG() {
  const [numAOGs, setNumAOGs] = useState("");
  const [aogEvents, setAogEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleNumAOGs = (val) => {
    const n = parseInt(val);
    setNumAOGs(val);
    if (!isNaN(n) && n > 0) {
      setAogEvents(Array.from({ length: n }, () => ({
        aog_plane: "", aog_airport: "", repair_cost: "", repair_time: "", aog_time: ""
      })));
      setResult(null);
    }
  };

  const updateEvent = (idx, field, value) => {
    const updated = [...aogEvents];
    updated[idx][field] = value;
    setAogEvents(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post("https://nouvelair-backend.onrender.com/api/aog", {
        aog_events: aogEvents
      });
      setResult(res.data);
    } catch (e) {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const colors  = ["#fff3e0", "#e3f2fd", "#f3e5f5"];
  const borders = ["#ff9800", "#2196f3", "#9c27b0"];

  // Build final merged schedule from all recommended options
  const getFinalSchedule = () => {
    if (!result) return [];
    return result.aog_events.flatMap((ev, eidx) => {
      const recommended = ev.options.find(o => o.recommended);
      if (!recommended) return [];
      return recommended.schedule.map(s => ({
        ...s,
        aog_event: eidx + 1,
        option: recommended.title
      }));
    });
  };

  return (
    <div style={{ maxWidth:1000, margin:"40px auto", fontFamily:"sans-serif", padding:"0 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={() => navigate("/home")}
          style={{ padding:"6px 12px", background:"#666", color:"white", border:"none", borderRadius:4, cursor:"pointer" }}>
          ← Back
        </button>
        <h2 style={{ margin:0 }}>🚨 AOG Recovery</h2>
      </div>

      <div style={{ background:"#fff3e0", padding:20, borderRadius:8, marginBottom:20, border:"2px solid #ff9800" }}>
        <label style={{ display:"block", marginBottom:8, fontWeight:"bold", fontSize:16 }}>
          How many AOG events?
        </label>
        <input type="number" min="1" max="14" placeholder="e.g. 2"
          value={numAOGs} onChange={e => handleNumAOGs(e.target.value)}
          style={{ width:"100%", padding:10, borderRadius:4, border:"1px solid #ccc", fontSize:16 }} />
      </div>

      {aogEvents.map((event, idx) => (
        <div key={idx} style={{ background:"#ffebee", padding:20, borderRadius:8, marginBottom:15, border:"2px solid #d32f2f" }}>
          <h3 style={{ color:"#d32f2f", margin:"0 0 15px" }}>⚠️ AOG Event #{idx + 1}</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:15 }}>
            <div>
              <label style={{ display:"block", marginBottom:5 }}>✈️ Plane Number (1-14)</label>
              <input type="number" min="1" max="14" placeholder="e.g. 3"
                value={event.aog_plane} onChange={e => updateEvent(idx, "aog_plane", e.target.value)}
                style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
            </div>
            <div>
              <label style={{ display:"block", marginBottom:5 }}>🛬 AOG Airport (IATA)</label>
              <input placeholder="e.g. CDG, FCO, TUN"
                value={event.aog_airport} onChange={e => updateEvent(idx, "aog_airport", e.target.value)}
                style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
            </div>
            <div>
              <label style={{ display:"block", marginBottom:5 }}>🕐 Time of AOG</label>
              <input type="time"
                value={event.aog_time} onChange={e => updateEvent(idx, "aog_time", e.target.value)}
                style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
            </div>
            <div>
              <label style={{ display:"block", marginBottom:5 }}>🔧 Aircraft Spare Cost (€)</label>
              <input type="number" placeholder="e.g. 5000"
                value={event.repair_cost} onChange={e => updateEvent(idx, "repair_cost", e.target.value)}
                style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
            </div>
            <div>
              <label style={{ display:"block", marginBottom:5 }}>⏱️ Estimated Maintenance Time (h)</label>
              <input type="number" placeholder="e.g. 4"
                value={event.repair_time} onChange={e => updateEvent(idx, "repair_time", e.target.value)}
                style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
            </div>
          </div>
        </div>
      ))}

      {aogEvents.length > 0 && (
        <button onClick={handleSubmit} disabled={loading}
          style={{ padding:"10px 25px", background:"#d32f2f", color:"white", border:"none", borderRadius:4, cursor:"pointer", fontSize:15, marginBottom:20 }}>
          {loading ? "⏳ Calculating..." : "🚨 Calculate Recovery Options"}
        </button>
      )}

      {error && <p style={{ color:"red" }}>{error}</p>}

      {result && (
        <div>
          {result.aog_events.map((ev, eidx) => (
            <div key={eidx} style={{ marginBottom:30 }}>
              <h3 style={{ borderBottom:"2px solid #d32f2f", paddingBottom:8 }}>
                🚨 AOG #{eidx+1} — Plane {ev.aog_plane} at {ev.aog_airport} ({ev.aog_time}) — {ev.affected_flights} flights affected
              </h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:15 }}>
                {ev.options.map((opt, idx) => (
                  <div key={idx} style={{
                    background: colors[idx],
                    border: `2px solid ${opt.recommended ? "#4caf50" : borders[idx]}`,
                    borderRadius:8, padding:15, position:"relative"
                  }}>
                    {opt.recommended && (
                      <div style={{ position:"absolute", top:-12, right:10, background:"#4caf50", color:"white", padding:"2px 10px", borderRadius:10, fontSize:12 }}>
                        ⭐ RECOMMENDED
                      </div>
                    )}
                    <h3 style={{ margin:"0 0 10px" }}>{opt.title}</h3>
                    <p style={{ fontSize:13, color:"#555" }}>{opt.description}</p>
                    {opt.feasible ? (
                      <>
                        <p style={{ fontSize:20, fontWeight:"bold" }}>+{opt.extra_cost?.toLocaleString()} € extra costs</p>
                        <p style={{ fontSize:12, color:"#555" }}>Total: {opt.total_cost?.toLocaleString()} €</p>
                        {opt.breakdown && (
                          <div style={{ fontSize:12, marginTop:8, background:"rgba(0,0,0,0.05)", padding:8, borderRadius:4 }}>
                            {Object.entries(opt.breakdown).map(([k,v]) => (
                              <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                                <span style={{ textTransform:"capitalize" }}>{k}</span>
                                <strong>{v?.toLocaleString()} €</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        <details style={{ marginTop:10 }}>
                          <summary style={{ cursor:"pointer", fontWeight:"bold", fontSize:13 }}>View Schedule</summary>
                          <table style={{ width:"100%", marginTop:8, fontSize:11, borderCollapse:"collapse" }}>
                            <thead>
                              <tr style={{ background:"rgba(0,0,0,0.1)" }}>
                                <th style={{ padding:4 }}>Plane</th>
                                <th style={{ padding:4 }}>Flight</th>
                                <th style={{ padding:4 }}>Dep.</th>
                                <th style={{ padding:4 }}>Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {opt.schedule.map((s, i) => (
                                <tr key={i} style={{ textAlign:"center" }}>
                                  <td style={{ padding:4 }}>✈️ {s.plane}</td>
                                  <td style={{ padding:4 }}>Vol {s.flight}</td>
                                  <td style={{ padding:4 }}>{s.departure}</td>
                                  <td style={{ padding:4 }}>{s.cost.toLocaleString()} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      </>
                    ) : (
                      <p style={{ color:"#d32f2f", fontWeight:"bold" }}>❌ Not feasible</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Combined Summary */}
          {result.total_aogs > 1 && (
            <div style={{ background:"#e8f5e9", padding:20, borderRadius:8, border:"2px solid #4caf50", marginTop:20 }}>
              <h3 style={{ color:"#2e7d32", margin:"0 0 10px" }}>📊 Combined Summary — {result.total_aogs} AOG Events</h3>
              <p style={{ fontSize:13, color:"#555" }}>Total extra costs if best option chosen for each AOG:</p>
              <p style={{ fontSize:24, fontWeight:"bold", color:"#2e7d32" }}>+{result.combined_total?.toLocaleString()} € extra costs</p>
              <p style={{ fontSize:12, color:"#555" }}>Total (inc. operations): {result.aog_events.reduce((sum, ev) => sum + (ev.options.find(o => o.recommended)?.total_cost || 0), 0).toLocaleString()} €</p>
            </div>
          )}

          {/* Final merged schedule */}
          <div style={{ background:"#e3f2fd", padding:20, borderRadius:8, border:"2px solid #0055a5", marginTop:20 }}>
            <h3 style={{ color:"#0055a5", margin:"0 0 15px" }}>🗓️ Final Schedule — All Recommended Options</h3>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#0055a5", color:"white" }}>
                  <th style={{ padding:8 }}>AOG #</th>
                  <th style={{ padding:8 }}>Option</th>
                  <th style={{ padding:8 }}>Plane</th>
                  <th style={{ padding:8 }}>Flight</th>
                  <th style={{ padding:8 }}>Departure</th>
                  <th style={{ padding:8 }}>Return</th>
                  <th style={{ padding:8 }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {getFinalSchedule().map((s, i) => (
                  <tr key={i} style={{ background: i%2===0 ? "#fff" : "#f0f7ff", textAlign:"center" }}>
                    <td style={{ padding:8 }}>AOG #{s.aog_event}</td>
                    <td style={{ padding:8, fontSize:12 }}>{s.option}</td>
                    <td style={{ padding:8 }}>✈️ {s.plane}</td>
                    <td style={{ padding:8 }}>Vol {s.flight}</td>
                    <td style={{ padding:8 }}>{s.departure}</td>
                    <td style={{ padding:8 }}>{s.return}</td>
                    <td style={{ padding:8 }}>{s.cost.toLocaleString()} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}