import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AOG() {
  const [planes, setPlanes] = useState(3);
  const [aogPlane, setAogPlane] = useState(1);
  const [aogAirport, setAogAirport] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [repairTime, setRepairTime] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post("https://nouvelair-backend.onrender.com/api/aog", {
        planes, aog_plane: aogPlane, aog_airport: aogAirport,
        repair_cost: repairCost, repair_time: repairTime
      });
      setResult(res.data);
    } catch (e) {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const colors  = ["#fff3e0", "#e3f2fd", "#f3e5f5"];
  const borders = ["#ff9800", "#2196f3", "#9c27b0"];

  return (
    <div style={{ maxWidth:900, margin:"40px auto", fontFamily:"sans-serif", padding:"0 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={() => navigate("/home")}
          style={{ padding:"6px 12px", background:"#666", color:"white", border:"none", borderRadius:4, cursor:"pointer" }}>
          ← Back
        </button>
        <h2 style={{ margin:0 }}>🚨 AOG Recovery</h2>
      </div>

      <div style={{ background:"#ffebee", padding:20, borderRadius:8, marginBottom:20, border:"2px solid #d32f2f" }}>
        <h3 style={{ color:"#d32f2f", margin:"0 0 15px" }}>⚠️ AOG Details</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:15 }}>
          <div>
            <label style={{ display:"block", marginBottom:5 }}>Total Aircraft in Fleet</label>
            <input type="number" value={planes} onChange={e => setPlanes(e.target.value)}
              style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
          </div>
          <div>
            <label style={{ display:"block", marginBottom:5 }}>AOG Plane Number</label>
            <input type="number" value={aogPlane} onChange={e => setAogPlane(e.target.value)}
              style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
          </div>
          <div>
            <label style={{ display:"block", marginBottom:5 }}>AOG Airport (IATA code)</label>
            <input placeholder="e.g. TUN, CDG, FCO" value={aogAirport} onChange={e => setAogAirport(e.target.value)}
              style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
          </div>
          <div>
            <label style={{ display:"block", marginBottom:5 }}>🔧 Repair / Gear Cost (€)</label>
            <input type="number" placeholder="e.g. 5000" value={repairCost} onChange={e => setRepairCost(e.target.value)}
              style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
          </div>
          <div>
            <label style={{ display:"block", marginBottom:5 }}>⏱️ Estimated Maintenance Time (hours)</label>
            <input type="number" placeholder="e.g. 4" value={repairTime} onChange={e => setRepairTime(e.target.value)}
              style={{ width:"100%", padding:8, borderRadius:4, border:"1px solid #ccc" }} />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ marginTop:20, padding:"10px 25px", background:"#d32f2f", color:"white", border:"none", borderRadius:4, cursor:"pointer", fontSize:16 }}>
          {loading ? "⏳ Calculating..." : "🚨 Calculate Recovery Options"}
        </button>
      </div>

      {error && <p style={{ color:"red" }}>{error}</p>}

      {result && (
        <div>
          <h3>Recovery Options — ✈️ Plane {result.aog_plane} AOG at {result.aog_airport}</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:15 }}>
            {result.options.map((opt, idx) => (
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
                    <p style={{ fontSize:22, fontWeight:"bold" }}>{opt.total_cost?.toLocaleString()} €</p>
                    <p style={{ fontSize:12, color:"#d32f2f" }}>includes +{opt.extra_cost?.toLocaleString()} € extra costs</p>
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
                      <summary style={{ cursor:"pointer", fontWeight:"bold" }}>View Schedule</summary>
                      <table style={{ width:"100%", marginTop:8, fontSize:12, borderCollapse:"collapse" }}>
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
      )}
    </div>
  );
}