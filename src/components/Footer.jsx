import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleManagerClick = () => {
    navigate("/manager-login");
  };

  return (
    <div className="w-full px-4 py-2">
      <div className="flex flex-wrap justify-start gap-2">
        <button
          onClick={handleRefresh}
          className="bg-blue-600 text-white font-bold py-3 px-4 rounded shadow text-sm w-[120px]"
        >
          REFRESH<br />SCREEN
        </button>

        <button
          className="bg-blue-600 text-white font-bold py-3 px-4 rounded shadow text-sm w-[120px]"
        >
          RECALL<br />ORDER
        </button>

        <button
          onClick={handleManagerClick}
          className="bg-red-600 text-white font-bold py-3 px-4 rounded shadow text-sm w-[120px]"
        >
          MANAGER<br />SCREEN
        </button>

        <button
          className="bg-gray-800 text-white font-bold py-3 px-4 rounded shadow text-sm w-[100px]"
        >
          HELP
        </button>

        <button
          className="bg-blue-600 text-white font-bold py-3 px-4 rounded shadow text-sm w-[100px]"
        >
          REPORT
        </button>
      </div>
    </div>
  );
}
