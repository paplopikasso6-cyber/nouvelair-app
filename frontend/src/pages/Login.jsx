import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("https://nouvelair-backend.onrender.com/api/login", {
        username, password
      });
      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      }
    } catch (e) {
      setError("Invalid username or password");
    }
  };

  return (
    <div style={{ maxWidth:400, margin:"100px auto", fontFamily:"sans-serif" }}>
      <h2>✈️ Nouvelair Login</h2>
      <input placeholder="Username" value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ display:"block", width:"100%", marginBottom:10, padding:8 }} />
      <input placeholder="Password" type="password" value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display:"block", width:"100%", marginBottom:10, padding:8 }} />
      {error && <p style={{ color:"red" }}>{error}</p>}
      <button onClick={handleLogin}
        style={{ padding:"10px 20px", background:"#0055a5", color:"white", border:"none", cursor:"pointer" }}>
        Login
      </button>
    </div>
  );
}