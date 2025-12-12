import React, { useState, useEffect } from "react";
import "../css/Dashboard.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Patients from "./patients";
import Reports from "./reports";
import Settings from "./settings";
import supabase from "../supabaseClient";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type GenderFilter = "all" | "male" | "female";

const Dashboard: React.FC = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // chart states
  const [chartData, setChartData] = useState<any>(null); // risk patients overview
  const [type1Chart, setType1Chart] = useState<any>(null);
  const [type2Chart, setType2Chart] = useState<any>(null);

  // gender filters
  const [type1Gender, setType1Gender] = useState<GenderFilter>("all");
  const [type2Gender, setType2Gender] = useState<GenderFilter>("all");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const doctorId = localStorage.getItem("doctor_id");
        if (!doctorId) {
          setLoading(false);
          return;
        }

        const { data: doctorData } = await supabase
          .from("doctors")
          .select("full_name")
          .eq("id", doctorId)
          .single();

        if (doctorData) setDoctorName(doctorData.full_name);

        const { data: patientsData } = await supabase
          .from("patients")
          .select("*")
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false });

        setPatients(patientsData || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // helper: normalize gender string
  const isGenderMatch = (pGender: any, filter: GenderFilter) => {
    if (filter === "all") return true;
    if (!pGender) return false;
    const g = String(pGender).toLowerCase();
    return filter === "male" ? g === "male" : g === "female";
  };

  // compute counts for charts
  const computeMonthlyCounts = (condition: string, genderFilter: GenderFilter) => {
    const maleCounts = Array(12).fill(0);
    const femaleCounts = Array(12).fill(0);

    patients.forEach((p) => {
      if (!p.created_at) return;
      if (p.condition !== condition) return;

      const gender = p.gender ? String(p.gender).toLowerCase() : "";
      if (gender === "male" && isGenderMatch("male", genderFilter)) {
        const month = new Date(p.created_at).getMonth();
        maleCounts[month]++;
      }
      if (gender === "female" && isGenderMatch("female", genderFilter)) {
        const month = new Date(p.created_at).getMonth();
        femaleCounts[month]++;
      }
    });

    if (genderFilter === "all") {
      return [
        { label: "Male", data: maleCounts, backgroundColor: "rgba(54, 162, 235, 0.7)" },
        { label: "Female", data: femaleCounts, backgroundColor: "rgba(255, 99, 132, 0.7)" },
      ];
    } else if (genderFilter === "male") {
      return [{ label: "Male", data: maleCounts, backgroundColor: "rgba(54, 162, 235, 0.9)" }];
    } else {
      return [{ label: "Female", data: femaleCounts, backgroundColor: "rgba(255, 99, 132, 0.9)" }];
    }
  };

  // Type 1 chart
  useEffect(() => {
    setType1Chart({
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: computeMonthlyCounts("Type 1 Diabetes", type1Gender),
    });
  }, [patients, selectedYear, type1Gender]);

  // Type 2 chart
  useEffect(() => {
    setType2Chart({
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: computeMonthlyCounts("Type 2 Diabetes", type2Gender),
    });
  }, [patients, selectedYear, type2Gender]);

  // Risk Patients Overview
  useEffect(() => {
    const riskPatients = patients.filter(
      (p) => p.condition === "Type 1 Diabetes" || p.condition === "Type 2 Diabetes"
    );

    const monthCounts = Array(12).fill(0);
    riskPatients.forEach((p) => {
      if (!p.created_at) return;
      const month = new Date(p.created_at).getMonth();
      if (new Date(p.created_at).getFullYear() === selectedYear) {
        monthCounts[month]++;
      }
    });

    setChartData({
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [
        {
          label: `Risk Patients (${selectedYear})`,
          data: monthCounts,
          backgroundColor: "rgba(255, 159, 64, 0.6)",
        },
      ],
    });
  }, [patients, selectedYear]);

  const availableYears = Array.from(
    new Set(patients.map(p => {
      try { return new Date(p.created_at).getFullYear(); } catch { return new Date().getFullYear(); }
    }))
  ).sort((a,b) => b-a);

  return (
    <div className="dashboard-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="main-content">
        <div className="topbar">
          <Topbar activePage={activePage} onSearchChange={setSearchTerm} />
          {activePage === "patients" && <Patients searchTerm={searchTerm} />}
        </div>

        {activePage === "dashboard" && (
          <div className="dashboard-body">
            <div className="three-box-row">
              {/* TYPE 1 */}
              <div className="dashboard-box chart-box">
                <div className="box-header">
                  <h3>Type 1 Diabetes Overview</h3>
                  <div className="pill-group">
                    <button className={`pill ${type1Gender==="all"?"active":""}`} onClick={()=>setType1Gender("all")}>All</button>
                    <button className={`pill ${type1Gender==="male"?"active":""}`} onClick={()=>setType1Gender("male")}>Male</button>
                    <button className={`pill ${type1Gender==="female"?"active":""}`} onClick={()=>setType1Gender("female")}>Female</button>
                  </div>
                </div>
                <div className="chart-wrapper">
                  {type1Chart ? <Bar data={type1Chart} options={{
                    responsive:true,
                    plugins:{legend:{position:"top"}},
                    scales:{ x:{stacked:true}, y:{stacked:true} }
                  }} /> : <p>No data available.</p>}
                </div>
              </div>

              {/* TYPE 2 */}
              <div className="dashboard-box chart-box">
                <div className="box-header">
                  <h3>Type 2 Diabetes Overview</h3>
                  <div className="pill-group">
                    <button className={`pill ${type2Gender==="all"?"active":""}`} onClick={()=>setType2Gender("all")}>All</button>
                    <button className={`pill ${type2Gender==="male"?"active":""}`} onClick={()=>setType2Gender("male")}>Male</button>
                    <button className={`pill ${type2Gender==="female"?"active":""}`} onClick={()=>setType2Gender("female")}>Female</button>
                  </div>
                </div>
                <div className="chart-wrapper">
                  {type2Chart ? <Bar data={type2Chart} options={{
                    responsive:true,
                    plugins:{legend:{position:"top"}},
                    scales:{ x:{stacked:true}, y:{stacked:true} }
                  }} /> : <p>No data available.</p>}
                </div>
              </div>
            </div>

            {/* RISK PATIENTS OVERVIEW */}
            <div className="dashboard-graph">
              <div className="graph-header">
                <label>Select Year:</label>
                <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}>
                  {availableYears.length===0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
                  {availableYears.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <h2 className="chart-name">Monthly Risk Patients Overview</h2>
              <div className="chart-wrapper">
                {chartData ? <Bar data={chartData} options={{responsive:true,plugins:{legend:{position:"top"}}}} /> : <p>No data available.</p>}
              </div>
            </div>
          </div>
        )}

        {activePage==="reports" && <Reports />}
        {activePage==="settings" && <Settings />}
      </div>
    </div>
  );
};

export default Dashboard;
