import { useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [planes, setPlanes] = useState(3);
  const [gearPrice, setGearPrice] = useState("");
  const [airport, setAirport] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    const res = await axios.post("http://localhost:5000/api/optimize", {
      planes, gear_price: gearPrice, airport
    });
    setResult(res.data);
  };

  return (
    <div style={{ maxWidth:500, margin:"60px auto", fontFamily:"sans-serif" }}>
      <h2>✈️ Flight Optimization</h2>
      <label>Number of Aircraft</label>
      <input type="number" value={planes}
        onChange={e => setPlanes(e.target.value)}
        style={{ display:"block", width:"100%", marginBottom:15, padding:8 }} />
      <label>Gear Price (€)</label>
      <input type="number" value={gearPrice}
        onChange={e => setGearPrice(e.target.value)}
        style={{ display:"block", width:"100%", marginBottom:15, padding:8 }} />
      <label>Airport</label>
      <input placeholder="e.g. Tunis-Carthage" value={airport}
        onChange={e => setAirport(e.target.value)}
        style={{ display:"block", width:"100%", marginBottom:15, padding:8 }} />
      <button onClick={handleSubmit}
        style={{ padding:"10px 20px", background:"#0055a5", color:"white", border:"none", cursor:"pointer" }}>
        Run Optimization
      </button>
      {result && (
        <div style={{ marginTop:30, padding:15, background:"#f0f8ff", borderRadius:8 }}>
          <h3>Result</h3>
          <p>Status: <strong>{result.status}</strong></p>
          <p>Total Cost: <strong>{result.total_cost} €</strong></p>
          <p>Airport: <strong>{result.airport}</strong></p>
        </div>
      )}
    </div>
  );
}