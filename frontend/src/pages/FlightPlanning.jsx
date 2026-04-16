import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function FlightPlanning() {
  const [planes, setPlanes] = useState(3);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("planes", planes);
      if (file) formData.append("file", file);
      const res = await axios.post("https://nouvelair-backend.onrender.com/api/optimize", formData);
      setResult(res.data);
    } catch (e) {
      setError("Optimization failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:800, margin:"40px auto", fontFamily:"sans-serif", padding:"0 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={() => navigate("/home")}
          style={{ padding:"6px 12px", background:"#666", color:"white", border:"none", borderRadius:4, cursor:"pointer" }}>
          ← Back
        </button>
        <h2 style={{ margin:0 }}>📅 Flight Planning</h2>
      </div>

      <div style={{ background:"#f9f9f9", padding:20, borderRadius:8, marginBottom:20 }}>
        <label style={{ display:"block", marginBottom:5 }}>Number of Aircraft</label>
        <input type="number" value={planes} onChange={e => setPlanes(e.target.value)}
          style={{ width:"100%", marginBottom:15, padding:8, borderRadius:4, border:"1px solid #ccc" }} />

        <label style={{ display:"block", marginBottom:5 }}>Upload Flights Excel File</label>
        <input type="file" accept=".xlsx"
          onChange={e => setFile(e.target.files[0])}
          style={{ width:"100%", marginBottom:5, padding:8 }} />
        <p style={{ fontSize:12, color:"#888", marginBottom:15 }}>
          Excel format: Flight No | From | To | Duration (h)
        </p>

        <button onClick={handleSubmit} disabled={loading}
          style={{ padding:"10px 25px", background:"#0055a5", color:"white", border:"none", borderRadius:4, cursor:"pointer", fontSize:16 }}>
          {loading ? "⏳ Optimizing..." : "🚀 Run Optimization"}
        </button>
      </div>

      {error && <p style={{ color:"red" }}>{error}</p>}

      {result && (
        <div>
          <div style={{ background:"#e8f5e9", padding:15, borderRadius:8, marginBottom:20 }}>
            <h3 style={{ margin:0 }}>✅ {result.status}</h3>
            <p>Aircraft used: <strong>{result.planes}</strong></p>
            <p style={{ fontSize:20 }}>Total Cost: <strong>{result.total_cost.toLocaleString()} €</strong></p>
          </div>

          <div style={{ background:"#fff3e0", padding:15, borderRadius:8, marginBottom:20 }}>
            <h3>📊 Cost Breakdown</h3>
            {Object.entries(result.cost_breakdown).map(([key, val]) => (
              <div key={key} style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span>
                  {key === "fuel" ? "⛽ Fuel" :
                   key === "delays" ? "⏰ Delays" :
                   key === "night" ? "🌙 Night Flights" :
                   key === "maintenance" ? "🔧 Maintenance" :
                   key === "handling" ? "🛠️ Handling" :
                   key === "catering" ? "🍽️ Catering" :
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
                  <th style={{ padding:8 }}>From</th>
                  <th style={{ padding:8 }}>To</th>
                  <th style={{ padding:8 }}>Departure</th>
                  <th style={{ padding:8 }}>Return</th>
                  <th style={{ padding:8 }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((s, i) => (
                  <tr key={i} style={{ background: i%2===0 ? "#fff" : "#f0f7ff", textAlign:"center" }}>
                    <td style={{ padding:8 }}>✈️ {s.plane}</td>
                    <td style={{ padding:8 }}>{s.flight_no}</td>
                    <td style={{ padding:8 }}>{s.from}</td>
                    <td style={{ padding:8 }}>{s.to}</td>
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