import React,{useState} from "react";
import {useNavigate} from "react-router-dom";

export default function Footer() {
    const navigate =useNavigate();
    
    const handleRefresh=()=>{
        window.location.reload();
    }
    const handleManagerClick=()=>{
        navigate("/manager-login");
    }

  return (
    <div className="w-[420px] p-2 space-y-2">
      {/* Top row: REFRESH, RECALL, MANAGER SCREEN */}
      <div className="grid grid-cols-3 gap-2">
        <button 
        onClick={handleRefresh}
        className="bg-blue-600 text-white font-bold py-4 rounded shadow text-sm">
          REFRESH<br />SCREEN
        </button>
        <button className="bg-blue-600 text-white font-bold py-4 rounded shadow text-sm">
          RECALL<br />ORDER
        </button>
        <button onClick={handleManagerClick}
        className="bg-red-600 text-white font-bold py-4 rounded shadow text-sm">
          MANAGER<br />SCREEN
        </button>
      </div>

      {/* Bottom row: HELP and REPORT */}
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-gray-800 text-white font-bold py-4 rounded shadow text-sm">
          HELP
        </button>
        <button className="bg-blue-600 text-white font-bold py-4 rounded shadow text-sm">
          REPORT
        </button>
      </div>
    </div>
  );
}
