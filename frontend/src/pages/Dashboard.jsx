import { useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [planes, setPlanes] = useState(3);
  const [gearPrice, setGearPrice] = useState("");
  const [airport, setAirport] = useState("");
  const [maintenanceTime, setMaintenanceTime] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post("https://nouvelair-backend.onrender.com/api/optimize", {
        planes, gear_price: gearPrice, airport, maintenance_time: maintenanceTime
      });
      setResult(res.data);
    } catch (e) {
      setError("Optimization failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:700, margin:"40px auto", fontFamily:"sans-serif", padding:"0 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2>✈️ Nouvelair Flight Optimization</h2>
        <button onClick={() => window.location.href="/aog"}
          style={{ padding:"8px 16px", background:"#d32f2f", color:"white", border:"none", borderRadius:4, cursor:"pointer" }}>
          🚨 AOG Alert
        </button>
      </div>

      <div style={{ background:"#f9f9f9", padding:20, borderRadius:8, marginBottom:20 }}>
        <label style={{ display:"block", marginBottom:5 }}>Number of Aircraft</label>
        <input type="number" value={planes}
          onChange={e => setPlanes(e.target.value)}
          style={{ width:"100%", marginBottom:15, padding:8, borderRadius:4, border:"1px solid #ccc" }} />

        <label style={{ display:"block", marginBottom:5 }}>Repair Cost (€)</label>
        <input type="number" value={gearPrice} placeholder="e.g. 1000"
          onChange={e => setGearPrice(e.target.value)}
          style={{ width:"100%", marginBottom:15, padding:8, borderRadius:4, border:"1px solid #ccc" }} />

        <label style={{ display:"block", marginBottom:5 }}>Airport</label>
        <input placeholder="e.g. Tunis-Carthage" value={airport}
          onChange={e => setAirport(e.target.value)}
          style={{ width:"100%", marginBottom:15, padding:8, borderRadius:4, border:"1px solid #ccc" }} />

        <label style={{ display:"block", marginBottom:5 }}>Expected Maintenance Time (hours)</label>
        <input type="number" placeholder="e.g. 4" value={maintenanceTime}
          onChange={e => setMaintenanceTime(e.target.value)}
          style={{ width:"100%", marginBottom:15, padding:8, borderRadius:4, border:"1px solid #ccc" }} />

        <button onClick={handleSubmit} disabled={loading}
          style={{ padding:"10px 25px", background:"#0055a5", color:"white", border:"none", borderRadius:4, cursor:"pointer", fontSize:16 }}>
          {loading ? "⏳ Running..." : "🚀 Run Optimization"}
        </button>
      </div>

      {error && <p style={{ color:"red" }}>{error}</p>}

      {result && (
        <div>
          <div style={{ background:"#e8f5e9", padding:15, borderRadius:8, marginBottom:20 }}>
            <h3 style={{ margin:0 }}>✅ {result.status}</h3>
            <p>Airport: <strong>{result.airport}</strong></p>
            <p>Aircraft used: <strong>{result.planes}</strong></p>
            <p style={{ fontSize:20 }}>Total Cost: <strong>{result.total_cost.toLocaleString()} €</strong></p>
          </div>

          <div style={{ background:"#fff3e0", padding:15, borderRadius:8, marginBottom:20 }}>
            <h3>📊 Cost Breakdown</h3>
            {Object.entries(result.cost_breakdown).map(([key, val]) => (
              <div key={key} style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ textTransform:"capitalize" }}>
                  {key === "fuel" ? "⛽ Fuel" :
                   key === "delays" ? "⏰ Delays" :
                   key === "night" ? "🌙 Night Flights" :
                   key === "maintenance" ? "🔧 Maintenance" :
                   "🚁 Repositioning"}
                </span>
                <strong>{val.toLocaleString()} €</strong>
              </div>
            ))}
          </div>

          <div style={{ background:"#e3f2fd", padding:15, borderRadius:8 }}>
            <h3>🗓️ Flight Schedule</h3>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#0055a5", color:"white" }}>
                  <th style={{ padding:8 }}>Plane</th>
                  <th style={{ padding:8 }}>Flight</th>
                  <th style={{ padding:8 }}>Departure</th>
                  <th style={{ padding:8 }}>Return</th>
                  <th style={{ padding:8 }}>Duration</th>
                  <th style={{ padding:8 }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((s, i) => (
                  <tr key={i} style={{ background: i%2===0 ? "#fff" : "#f0f7ff", textAlign:"center" }}>
                    <td style={{ padding:8 }}>✈️ {s.plane}</td>
                    <td style={{ padding:8 }}>Vol {s.flight}</td>
                    <td style={{ padding:8 }}>{s.departure}</td>
                    <td style={{ padding:8 }}>{s.return}</td>
                    <td style={{ padding:8 }}>{s.duration}</td>
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