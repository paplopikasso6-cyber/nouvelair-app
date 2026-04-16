import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth:600, margin:"100px auto", fontFamily:"sans-serif", textAlign:"center", padding:"0 20px" }}>
      <h1>✈️ Nouvelair Operations</h1>
      <p style={{ color:"#666", marginBottom:40 }}>Select an operation to continue</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div onClick={() => navigate("/planning")}
          style={{ background:"#e3f2fd", border:"2px solid #0055a5", borderRadius:12, padding:40, cursor:"pointer", transition:"transform 0.2s" }}
          onMouseOver={e => e.currentTarget.style.transform="scale(1.03)"}
          onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>
          <div style={{ fontSize:48 }}>📅</div>
          <h2 style={{ color:"#0055a5" }}>Flight Planning</h2>
          <p style={{ color:"#555" }}>Assign aircraft, times and dates to minimize costs</p>
        </div>

        <div onClick={() => navigate("/aog")}
          style={{ background:"#ffebee", border:"2px solid #d32f2f", borderRadius:12, padding:40, cursor:"pointer", transition:"transform 0.2s" }}
          onMouseOver={e => e.currentTarget.style.transform="scale(1.03)"}
          onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>
          <div style={{ fontSize:48 }}>🚨</div>
          <h2 style={{ color:"#d32f2f" }}>AOG Cases</h2>
          <p style={{ color:"#555" }}>Handle aircraft on ground with recovery options</p>
        </div>
      </div>
    </div>
  );
}