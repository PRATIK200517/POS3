import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  runTransaction,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";

export default function ManagerScreen() {
  const navigate = useNavigate(); // Initialize navigate
  const [activeTab, setActiveTab] = useState("Orders");
  const [orders, setOrders] = useState([]);
  const [selectedItemInfo, setSelectedItemInfo] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [empId, setEmpId] = useState("");
  const [attendanceMessages, setAttendanceMessages] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrderAsc, setSortOrderAsc] = useState(true);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState(null);

  // Daily reset check
  const checkDailyReset = async () => {
    try {
      const lastResetRef = doc(db, "system", "lastReset");
      const lastResetSnap = await getDoc(lastResetRef);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const needsReset =
        !lastResetSnap.exists() ||
        lastResetSnap.data().date.toDate().toDateString() !==
          today.toDateString();

      if (needsReset) {
        const employeesSnap = await getDocs(collection(db, "Employees"));
        const updatePromises = [];

        for (const empDoc of employeesSnap.docs) {
          const mealRef = doc(db, "Employees", empDoc.id, "meal", "1");
          const mealSnap = await getDoc(mealRef);

          if (mealSnap.exists()) {
            const defaultCredits = mealSnap.data().defaultCredits;
            updatePromises.push(
              updateDoc(mealRef, { mealCredits: defaultCredits })
            );
          }
        }

        updatePromises.push(
          updateDoc(lastResetRef, { date: today }, { merge: true })
        );
        await Promise.all(updatePromises);
        console.log("Daily credits reset completed");
      }
    } catch (err) {
      console.error("Daily reset error:", err);
    }
  };

  const handleRefund = async (orderId, itemId, refundAmount) => {
    const kotRef = doc(db, "KOT", orderId);
    const kotSnap = await getDoc(kotRef);
    if (!kotSnap.exists()) return;

    const data = kotSnap.data();
    const updatedItems = data.items.filter((item) => item.id !== itemId);
    const newAmount = data.amount - refundAmount;

    if (updatedItems.length === 0) {
      await deleteDoc(kotRef);
    } else {
      await updateDoc(kotRef, { items: updatedItems, amount: newAmount });
    }

    setSelectedItemInfo(null);
    fetchOrders();
  };

  const handleVoid = async (orderId) => {
    await deleteDoc(doc(db, "KOT", orderId));
    setSelectedItemInfo(null);
    fetchOrders();
  };

  const fetchEmployees = async () => {
    try {
      const snapshot = await getDocs(collection(db, "Employees"));
      const today = new Date();
      const monthDocId = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}`;
      const dayKey = String(today.getDate()).padStart(2, "0");

      const employeePromises = snapshot.docs.map(async (empDoc) => {
        const attendanceDocRef = doc(
          db,
          "Employees",
          empDoc.id,
          "attendance",
          monthDocId
        );
        const attendanceSnap = await getDoc(attendanceDocRef);

        let isClockedIn = false;
        if (attendanceSnap.exists()) {
          const attendanceData = attendanceSnap.data();
          const todayAttendance = attendanceData?.days?.[dayKey] || {};
          isClockedIn = todayAttendance.isClockedIn || false;
        }

        const mealRef = doc(db, "Employees", empDoc.id, "meal", "1");
        const mealSnap = await getDoc(mealRef);
        const mealData = mealSnap.exists() ? mealSnap.data() : {};

        return {
          id: empDoc.id,
          ...empDoc.data(),
          meal: mealData,
          isClockedIn: isClockedIn,
        };
      });

      const resolvedData = await Promise.all(employeePromises);
      setEmployees(resolvedData);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      let q = collection(db, "KOT");
      if (filterDate) {
        const selectedDate = new Date(filterDate);
        selectedDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(selectedDate);
        nextDate.setDate(nextDate.getDate() + 1);

        q = query(
          q,
          where("date", ">=", selectedDate),
          where("date", "<", nextDate)
        );
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  // Attendance Handlers
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const handleClockIn = async () => {
    if (!empId) return alert("Please enter Employee ID");

    try {
      const empRef = doc(db, "Employees", empId);
      const empSnap = await getDoc(empRef);
      if (!empSnap.exists()) return alert("Employee not found");

      const today = new Date();
      const monthDocId = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}`;
      const dayKey = String(today.getDate()).padStart(2, "0");

      const monthRef = doc(db, "Employees", empId, "attendance", monthDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(monthRef);
        const newSession = { checkIn: Timestamp.now(), checkOut: null };

        // Check existing clock status
        const existingDay = docSnap.exists()
          ? docSnap.data().days?.[dayKey]
          : null;
        if (existingDay?.isClockedIn) {
          throw new Error("You must clock out before clocking in again.");
        }

        if (!docSnap.exists()) {
          transaction.set(monthRef, {
            days: {
              [dayKey]: {
                sessions: [newSession],
                isClockedIn: true,
              },
            },
            metadata: {
              created: serverTimestamp(),
              lastUpdated: serverTimestamp(),
            },
          });
        } else {
          transaction.update(monthRef, {
            [`days.${dayKey}.sessions`]: arrayUnion(newSession),
            [`days.${dayKey}.isClockedIn`]: true,
            "metadata.lastUpdated": serverTimestamp(),
          });
        }
      });

      setAttendanceMessages((prev) => [
        ...prev,
        `✅ Clocked in ${
          empSnap.data().name
        } at ${new Date().toLocaleTimeString()}`,
      ]);
      setEmpId("");
    } catch (err) {
      console.error("Clock In error:", err);
      alert(err.message || "Clock In failed");
    }
  };

  const handleClockOut = async () => {
    if (!empId) return alert("Please enter Employee ID");

    try {
      const today = new Date();
      const monthDocId = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}`;
      const dayKey = String(today.getDate()).padStart(2, "0");

      const monthRef = doc(db, "Employees", empId, "attendance", monthDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(monthRef);
        if (!docSnap.exists()) return;

        const dayData = docSnap.data().days?.[dayKey] || {};
        if (!dayData.isClockedIn) {
          throw new Error("You are not currently clocked in.");
        }

        const sessions = [...dayData.sessions];
        const lastSession = sessions[sessions.length - 1];

        if (lastSession && !lastSession.checkOut) {
          lastSession.checkOut = Timestamp.now();
        }

        transaction.update(monthRef, {
          [`days.${dayKey}.sessions`]: sessions,
          [`days.${dayKey}.isClockedIn`]: false,
          "metadata.lastUpdated": serverTimestamp(),
        });
      });

      setAttendanceMessages((prev) => [
        ...prev,
        `✅ Clocked out ${empId} at ${new Date().toLocaleTimeString()}`,
      ]);
      setEmpId("");
    } catch (err) {
      console.error("Clock Out error:", err);
      alert(err.message || "Clock Out failed");
    }
  };

  const handleShowLogs = async () => {
    try {
      const today = getTodayDate();
      const employeesSnap = await getDocs(collection(db, "Employees"));
      const logs = [];

      for (const empDoc of employeesSnap.docs) {
        const monthDocId = `${new Date().getFullYear()}-${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}`;
        const monthRef = doc(
          db,
          "Employees",
          empDoc.id,
          "attendance",
          monthDocId
        );
        const monthSnap = await getDoc(monthRef);

        if (monthSnap.exists()) {
          const dayKey = String(new Date().getDate()).padStart(2, "0");
          const sessions = monthSnap.data().days?.[dayKey]?.sessions || [];

          sessions.forEach((session) => {
            const checkIn =
              session.checkIn?.toDate().toLocaleTimeString() || "—";
            const checkOut =
              session.checkOut?.toDate().toLocaleTimeString() || "—";
            let duration = "Incomplete";

            if (session.checkIn && session.checkOut) {
              const diff = session.checkOut.toDate() - session.checkIn.toDate();
              duration = `${Math.floor(diff / 3600000)}h ${Math.floor(
                (diff % 3600000) / 60000
              )}m`;
            }

            logs.push({
              empName: empDoc.data().name,
              checkInStr: checkIn,
              checkOutStr: checkOut,
              worked: duration,
            });
          });
        }
      }

      setTodayLogs(logs);
      setLogsVisible(!logsVisible);
    } catch (err) {
      console.error("Fetch logs error:", err);
      alert("Failed to load attendance logs");
    }
  };

  useEffect(() => {
    if (activeTab === "Orders") fetchOrders();
    if (activeTab === "Staff Meal") {
      checkDailyReset().then(fetchEmployees);
    }
  }, [activeTab, filterDate]);

  const filteredOrders = orders.filter((order) => {
    const query = searchTerm.toLowerCase();
    const orderDate = order.date?.toDate?.().toISOString().split("T")[0];

    return (
      (!filterDate || orderDate === filterDate) &&
      (!searchTerm ||
        order.kot_id?.toString()?.toLowerCase().includes(query) ||
        order.customerID?.toString()?.toLowerCase().includes(query) ||
        order.amount?.toString()?.toLowerCase().includes(query))
    );
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const idA = a.kot_id || a.id || "";
    const idB = b.kot_id || b.id || "";
    return sortOrderAsc ? idA.localeCompare(idB) : idB.localeCompare(idA);
  });

  return (
    <div className="flex min-h-screen">
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
      >
        &times;
      </button>
      <aside className="w-64 bg-gray-800 text-white p-6 space-y-4">
        <h2 className="text-2xl font-bold mb-6">Manager Panel</h2>
        <nav className="space-y-2">
          <button
            className={`block w-full text-left px-4 py-2 rounded ${
              activeTab === "Orders" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Orders")}
          >
            Orders
          </button>
          <button
            className={`block w-full text-left px-4 py-2 rounded ${
              activeTab === "Staff Meal" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Staff Meal")}
          >
            Staff Meal
          </button>
          <button
            className={`block w-full text-left px-4 py-2 rounded ${
              activeTab === "Cash" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Cash")}
          >
            Cash
          </button>
          <button
            className={`block w-full text-left px-4 py-2 rounded ${
              activeTab === "Attendance" ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Attendance")}
          >
            Attendance
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 bg-white overflow-auto">
        <h1 className="text-3xl font-bold mb-4">Manager Screen</h1>

        {activeTab === "Orders" && (
          <div>
            <div className="mb-4">
              <label className="block mb-2 font-medium">Filter by Date:</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="border p-2 rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium">Search Orders:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Order ID, Customer ID, Amount..."
                  className="border p-2 rounded w-full"
                />
                <button
                  onClick={() => {}}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Search
                </button>
              </div>
            </div>

            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Date</th>
                  <th
                    className="p-2 border cursor-pointer select-none"
                    onClick={() => setSortOrderAsc(!sortOrderAsc)}
                  >
                    Order ID (KOT ID)
                    <span className="ml-1">{sortOrderAsc ? "↑" : "↓"}</span>
                  </th>
                  <th className="p-2 border">Customer ID</th>
                  <th className="p-2 border">User ID</th>
                  <th className="p-2 border">Total Items</th>
                  <th className="p-2 border">Total Amount</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedOrders.length > 0 ? (
                  sortedOrders.map((order) => {
                    const orderId = order.id || order.kot_id;
                    const totalItems = order.items?.reduce(
                      (total, item) => total + (item.quantity || 0),
                      0
                    );

                    const isSelected = selectedOrderInfo?.orderId === orderId;

                    return (
                      <React.Fragment key={orderId}>
                        <tr
                          className={`text-center border-t cursor-pointer ${
                            isSelected ? "bg-gray-100" : ""
                          }`}
                          onClick={() =>
                            setSelectedOrderInfo(
                              isSelected
                                ? null
                                : {
                                    orderId,
                                    order,
                                  }
                            )
                          }
                        >
                          <td className="p-2 border">
                            {order.date?.toDate?.().toLocaleString() || "N/A"}
                          </td>
                          <td className="p-2 border">
                            {order.kot_id || order.id}
                          </td>
                          <td className="p-2 border">
                            {order.customerID || "N/A"}
                          </td>
                          <td className="p-2 border">
                            {order.user_id || "N/A"}
                          </td>
                          <td className="p-2 border">{totalItems || 0}</td>
                          <td className="p-2 border">
                            £{order.amount ? order.amount.toFixed(2) : "0.00"}
                          </td>
                          <td className="p-2 border">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVoid(orderId);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Void Order
                            </button>
                          </td>
                        </tr>

                        {isSelected && (
                          <tr className="bg-gray-50 text-center">
                            <td colSpan={7} className="p-4 text-left">
                              <h4 className="font-semibold mb-2">
                                Order Items:
                              </h4>
                              {order.items && order.items.length > 0 ? (
                                <ul className="list-disc list-inside">
                                  {order.items.map((item, idx) => (
                                    <li key={idx}>
                                      {item.name} × {item.quantity} — £
                                      {(item.price * item.quantity).toFixed(2)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No items found for this order.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-4 text-center">
                      No Orders Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "Staff Meal" && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Staff Meal Credits</h3>
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Employee</th>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Credits Left</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Clock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b hover:bg-gray-100 cursor-pointer"
                      onClick={() =>
                        navigate("/", {
                          state: {
                            selectedEmployee: {
                              id: employee.id,
                              name: employee.name,
                              EmployeeID: employee.EmployeeID,
                              phone: employee.phone,
                              mealCredits: employee.meal.mealCredits,
                              isClockedIn: employee.isClockedIn,
                            },
                          },
                        })
                      }
                    >
                      <td className="p-2">{employee.name}</td>
                      <td className="p-2">{employee.EmployeeID}</td>
                      <td className="p-2">{employee.meal.mealCredits || 0}</td>
                      <td className="p-2">
                        {employee.meal.mealCredits === 0 ? (
                          <span className="text-red-600 font-medium">
                            Used All
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {employee.isClockedIn ? (
                          <span className="text-green-600">Clocked In</span>
                        ) : (
                          <span className="text-red-600">Clocked Out</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && (
                <p className="text-center text-gray-500 mt-4">
                  No employees found
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "Cash" && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold">Cash Management</h3>
            <p className="mt-2 text-gray-600">
              Cash overview panel coming soon!
            </p>
          </div>
        )}

        {activeTab === "Attendance" && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Attendance Management
            </h3>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Employee ID"
                className="border p-2 rounded flex-1"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
              />
              <button
                onClick={handleClockIn}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Clock In
              </button>
              <button
                onClick={handleClockOut}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Clock Out
              </button>
            </div>

            <div className="mb-4 space-y-2">
              {attendanceMessages.map((msg, index) => (
                <div key={index} className="bg-white p-2 rounded shadow-sm">
                  {msg}
                </div>
              ))}
            </div>

            <button
              onClick={handleShowLogs}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
            >
              {logsVisible ? "Hide Today's Logs" : "Show Today's Logs"}
            </button>

            {logsVisible && (
              <div className="bg-white p-4 rounded shadow">
                <h4 className="text-center font-medium mb-2">
                  Today's Attendance
                </h4>
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2">Employee</th>
                      <th className="p-2">Check-In</th>
                      <th className="p-2">Check-Out</th>
                      <th className="p-2">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayLogs.map((log, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-center">{log.empName}</td>
                        <td className="p-2 text-center">{log.checkInStr}</td>
                        <td className="p-2 text-center">{log.checkOutStr}</td>
                        <td className="p-2 text-center">{log.worked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
