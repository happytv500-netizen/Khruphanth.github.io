import { useEffect, useState } from "react";
import { fetchScriptData, postAction } from "../services/api";
import { AuthService } from "../services/auth";
import { SHEET_NAMES } from "../config/config";

export default function Report() {
  // 🔐 กันคนไม่ login
  useEffect(() => {
    AuthService.requireAuth();
  }, []);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= โหลดข้อมูล =================
  const loadReport = async () => {
    setLoading(true);
    const data = await fetchScriptData(SHEET_NAMES.REPORT || "REPORT");
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  // ================= ลบรายการ =================
  const handleDelete = async (id) => {
    if (!window.confirm("ลบรายการนี้?")) return;

    const res = await postAction(
      SHEET_NAMES.REPORT || "REPORT",
      "delete",
      { id }
    );

    if (res.status === "success") {
      loadReport();
    } else {
      alert("ลบไม่สำเร็จ");
    }
  };

  // ================= UI =================
  return (
    <div className="page">
      <h2>📄 รายงาน</h2>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>รายละเอียด</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="5" align="center">ไม่มีข้อมูล</td>
              </tr>
            )}

            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.detail}</td>
                <td>{r.date}</td>
                <td>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(r.id)}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
