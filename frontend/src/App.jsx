import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/home";
import FlightPlanning from "./pages/FlightPlanning";
import AOG from "./pages/AOG";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/planning" element={<PrivateRoute><FlightPlanning /></PrivateRoute>} />
        <Route path="/aog" element={<PrivateRoute><AOG /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}