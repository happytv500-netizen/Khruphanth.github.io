import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { fetchSheetData, postAction } from "../services/api";
import { AuthService } from "../services/auth";

const SHEET = "SHOW"; // 🔥 ฟันธง ไม่มั่ว

const Report = () => {
  const [rawData, setRawData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const reportRef = useRef();

  // ---------------------------
  // load data
  // ---------------------------
  useEffect(() => {
    setCurrentUser(AuthService.getCurrentUser());

    const load = async () => {
      const rows = await fetchSheetData(SHEET);
      setRawData(rows.length > 1 ? rows.slice(1) : []);
    };
    load();
  }, []);

  // ---------------------------
  // search (preview only)
  // ---------------------------
  const handleSearch = () => {
    setHasSearched(true);

    let filtered = rawData.map((r, i) => ({
      id: i + 1,
      code: String(r[1] || ""),
      name: String(r[2] || ""),
      location: String(r[3] || ""),
      status: String(r[4] || ""),
      note: String(r[5] || "")
    }));

    const s = filters.search.trim().toLowerCase();
    if (s) {
      filtered = filtered.filter(
        x =>
          x.code.toLowerCase().includes(s) ||
          x.name.toLowerCase().includes(s)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(x => x.status === filters.status);
    }

    setDisplayData(filtered);
  };

  // ---------------------------
  // export report (ยิง GAS)
  // ---------------------------
  const handleExport = async (format) => {
    if (!displayData.length) {
      Swal.fire("ไม่มีข้อมูล", "กรุณาค้นหาข้อมูลก่อน", "warning");
      return;
    }

    Swal.fire({
      title: `กำลังสร้าง ${format.toUpperCase()}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await postAction(
        SHEET,
        "generateReport",
        {
          format,
          filters: JSON.stringify({
            search: filters.search || "",
            status: filters.status || ""
          })
        }
      );

      if (!res || !res.ok) {
        throw new Error(res?.message || "สร้างรายงานไม่สำเร็จ");
      }

      const base64 = res.fileData.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const mime =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      a.click();

      Swal.fire("สำเร็จ", "ดาวน์โหลดรายงานแล้ว", "success");

    } catch (err) {
      Swal.fire("ผิดพลาด", err.message, "error");
    }
  };

  // ---------------------------
  // render
  // ---------------------------
  return (
    <div className="container py-4">
      {/* filter */}
      <div className="card shadow-sm mb-4 no-print">
        <div className="card-body row g-3">
          <div className="col-md-5">
            <label className="form-label fw-bold small">ค้นหารหัส/ชื่อ</label>
            <input
              className="form-control"
              onChange={e =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-bold small">สถานะ</label>
            <select
              className="form-select"
              onChange={e =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">ทุกสถานะ</option>
              <option value="ใช้งานได้">ใช้งานได้</option>
              <option value="ชำรุด">ชำรุด</option>
              <option value="ส่งซ่อม">ส่งซ่อม</option>
              <option value="เสื่อมสภาพ">เสื่อมสภาพ</option>
            </select>
          </div>

          <div className="col-md-3 d-flex align-items-end">
            <button className="btn btn-primary w-100" onClick={handleSearch}>
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {hasSearched && (
        <div className="text-end mb-3 no-print">
          <button
            className="btn btn-danger me-2"
            onClick={() => handleExport("pdf")}
          >
            PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleExport("doc")}
          >
            Word
          </button>
        </div>
      )}

      {/* preview */}
      <div
        ref={reportRef}
        className="bg-white p-5 shadow-sm mx-auto"
        style={{ width: "210mm", minHeight: "297mm" }}
      >
        <h4 className="text-center fw-bold mb-3">
          ใบรายงานสรุปสถานะครุภัณฑ์
        </h4>

        <p>
          <strong>ผู้พิมพ์รายงาน:</strong>{" "}
          {currentUser?.name || "แอดมินระบบ"}
        </p>
        <p>
          <strong>วันที่:</strong>{" "}
          {new Date().toLocaleDateString("th-TH")}
        </p>

        <table className="table table-bordered mt-3">
          <thead className="text-center">
            <tr>
              <th>ลำดับ</th>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>สถานะ</th>
              <th>สถานที่</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((d, i) => (
              <tr key={i}>
                <td className="text-center">{i + 1}</td>
                <td className="text-center">{d.code}</td>
                <td>{d.name}</td>
                <td className="text-center">{d.status}</td>
                <td>{d.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Report;
