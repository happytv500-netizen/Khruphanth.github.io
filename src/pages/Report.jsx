import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { fetchSheetData, postAction } from "../services/api";
import { SHEET_NAMES } from "../config/config";
import { AuthService } from "../services/auth";

const Report = () => {
  const [rawData, setRawData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [hasSearched, setHasSearched] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(AuthService.getCurrentUser());

    const load = async () => {
      const rows = await fetchSheetData(SHEET_NAMES.SHOW || "SHOW");
      setRawData(rows.length > 1 ? rows.slice(1) : []);
    };
    load();
  }, []);

  const handleSearch = () => {
    setHasSearched(true);
    if (!Array.isArray(rawData)) return;
    let filtered = rawData.map((r, i) => ({
      code: r[1],
      name: r[2],
      location: r[3],
      status: r[4],
      note: r[5]
    }));

    const s = filters.search.toLowerCase();
    if (s) {
      filtered = filtered.filter(
        x =>
          String(x.code).toLowerCase().includes(s) ||
          String(x.name).toLowerCase().includes(s)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(x => x.status === filters.status);
    }

    setDisplayData(filtered);
  };

  // 🔥 EXPORT จุดสำคัญ
  const handleExport = async (format) => {
    if (!displayData.length) {
      Swal.fire("ไม่มีข้อมูล", "กรุณาค้นหาก่อน", "warning");
      return;
    }

    // ✅ แปลงเป็น string ล้วนที่ React
    const rowsForDoc = displayData.map((d, i) => ({
      "ลำดับ": String(i + 1),
      "รหัส": String(d.code ?? "-"),
      "ชื่อ": String(d.name ?? "-"),
      "สถานะ": String(d.status ?? "-"),
      "สถานที่": String(d.location ?? "-"),
      "หมายเหตุ": String(d.note ?? "-")
    }));

    Swal.fire({
      title: "กำลังสร้างไฟล์...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await postAction(
        "SHOW",
        "createDoc",
        {
          format,
          name: "รายงานครุภัณฑ์",
          rows: JSON.stringify(rowsForDoc)
        }
      );

      if (!res?.ok) throw new Error(res?.message || "สร้างไฟล์ไม่สำเร็จ");

      const base64 = res.fileData.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/octet-stream" });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = res.fileName;
      a.click();

      Swal.fire("สำเร็จ", "ดาวน์โหลดแล้ว", "success");
    } catch (err) {
      Swal.fire("ผิดพลาด", err.message, "error");ป
    }
  };

  return (
    <>
      {/* ปุ่ม */}
      {hasSearched && (
        <>
          <button onClick={() => handleExport("pdf")}>PDF</button>
          <button onClick={() => handleExport("doc")}>Word</button>
        </>
      )}
    </>
  );
};

export default Report;
