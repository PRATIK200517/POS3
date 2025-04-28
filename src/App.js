import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AutoContext";
import Login from "./components/Login";
import POS from "./components/POS";
import ManagerScreen from "./components/ManagerScreen";
import ManagerLogin from "./components/ManagerLogin"


export default function App() {
  return (
    
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/employee-login" element={<Login />} /> 
          <Route path="/" element={<POS />} />
          <Route path="/manager-login" element={<ManagerLogin />} />
          <Route path="/manager" element={<ManagerScreen />} />
         
        </Routes>
      </AuthProvider>
    </Router>
    
  );
}
