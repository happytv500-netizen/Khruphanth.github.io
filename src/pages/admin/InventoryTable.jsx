// =======================
// IMPORTS
// =======================
import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";

import { fetchSheetData, postAction } from "../../services/api";
import { SHEET_NAMES } from "../../config/config";

// =======================
// CONSTANTS
// =======================
const CATEGORIES = [
  "-",
  "เครื่องใช้ไฟฟ้า",
  "พัดลม",
  "เครื่องปรับอากาศ",
  "เฟอร์นิเจอร์",
  "อุปกรณ์คอมพิวเตอร์",
  "สื่อการสอน",
  "อื่นๆ",
];

// =======================
// COMPONENT: RetryImage
// =======================
const RetryImage = ({ src, alt, height }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setLoading(true);
    setError(false);
  }, [src]);

  const handleRetry = (e) => {
    e.stopPropagation();
    setLoading(true);
    setError(false);
    setImgSrc(`${src}&t=${Date.now()}`);
  };

  return (
    <div
      className="position-relative d-inline-block"
      style={{ minWidth: 30, minHeight: height }}
    >
      {loading && !error && (
        <div className="spinner-border spinner-border-sm text-secondary" />
      )}

      <img
        src={imgSrc}
        alt={alt}
        height={height}
        className={error ? "d-none" : ""}
        style={{ cursor: "pointer" }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onClick={() => window.open(src, "_blank")}
      />

      {error && (
        <button
          className="btn btn-sm btn-light border shadow-sm p-0 px-1"
          title="โหลดรูปใหม่"
          onClick={handleRetry}
        >
          <i className="bi bi-arrow-clockwise text-danger" />
        </button>
      )}
    </div>
  );
};

// =======================
// MAIN COMPONENT
// =======================
const InventoryTable = () => {
  // ---------- STATE ----------
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // view | edit | delete
  const [mode, setMode] = useState("view");

  // modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // add
  const [newItems, setNewItems] = useState([
    { id: 1, code: "", name: "", category: "-" },
  ]);

  // history
  const [currentItem, setCurrentItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // table control
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "no", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // edit / delete
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editBuffer, setEditBuffer] = useState({});

  // =======================
  // LOAD DATA
  // =======================
  const resetModes = () => {
    setMode("view");
    setEditBuffer({});
    setSelectedRows(new Set());
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.DATA || "DATA");
      const mapped = rows.map((r, i) => ({
        row: i + 2,
        no: i + 1,
        code: r[1] || "",
        name: r[2] || "",
        category: r[3] || "-",
        status: r[4] || "ใช้งานได้",
        detail: r[5] || "",
      }));
      setData(mapped);
      resetModes();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "โหลดข้อมูลไม่สำเร็จ", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, []);

  // =======================
  // PROCESS DATA
  // =======================
  const processedData = useMemo(() => {
    let items = [...data];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(
        (i) =>
          i.code.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    if (sortConfig.key) {
      items.sort((a, b) => {
        const A = a[sortConfig.key];
        const B = b[sortConfig.key];

        const nA = parseFloat(A);
        const nB = parseFloat(B);

        if (!isNaN(nA) && !isNaN(nB)) {
          return sortConfig.direction === "asc" ? nA - nB : nB - nA;
        }

        if (A < B) return sortConfig.direction === "asc" ? -1 : 1;
        if (A > B) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [data, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentItems = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // =======================
  // ADD (AUTO ROW)
  // =======================
  const handleNewItemChange = (id, field, value) => {
    const updated = newItems.map((i) =>
      i.id === id ? { ...i, [field]: value } : i
    );
    setNewItems(updated);

    const last = updated[updated.length - 1];
    if (
      last.id === id &&
      last.code &&
      last.name &&
      last.category !== "-"
    ) {
      setNewItems([
        ...updated,
        { id: Date.now(), code: "", name: "", category: "-" },
      ]);
    }
  };

  const handleRemoveNewRow = (id) => {
    if (newItems.length > 1) {
      setNewItems(newItems.filter((i) => i.id !== id));
    }
  };

  const saveBatchAdd = async () => {
    const valid = newItems.filter(
      (i) => i.code.trim() && i.name.trim()
    );
    if (!valid.length)
      return Swal.fire("เตือน", "กรุณากรอกข้อมูล", "warning");

    setShowAddModal(false);
    Swal.fire({
      title: "กำลังบันทึก...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let count = 0;
    for (const item of valid) {
      Swal.update({ html: `กำลังเพิ่ม: ${item.code}` });
      await postAction("DATA", "add", {
        รหัส: item.code,
        ชื่อ: item.name,
        ที่อยู่: item.category,
        สถานะ: "ใช้งานได้",
        รายละเอียด: "-",
      });
      count++;
    }

    Swal.fire("สำเร็จ", `เพิ่ม ${count} รายการ`, "success");
    setNewItems([{ id: Date.now(), code: "", name: "", category: "-" }]);
    loadList();
  };

  // =======================
  // EDIT
  // =======================
  const enterEditMode = () => {
    const buffer = {};
    currentItems.forEach((i) => {
      buffer[i.row] = { ...i };
    });
    setEditBuffer(buffer);
    setMode("edit");
  };

  const handleEditChange = (row, field, value) => {
    setEditBuffer((prev) => ({
      ...prev,
      [row]: { ...prev[row], [field]: value },
    }));
  };

  const saveBulkEdit = async () => {
    const rows = Object.keys(editBuffer);
    if (!rows.length) return resetModes();

    Swal.fire({
      title: `กำลังบันทึก ${rows.length} รายการ`,
      didOpen: () => Swal.showLoading(),
    });

    for (const row of rows) {
      const i = editBuffer[row];
      await postAction("DATA", "edit", {
        row,
        รหัส: i.code,
        ชื่อ: i.name,
        ที่อยู่: i.category,
        สถานะ: i.status,
        รายละเอียด: i.detail,
      });
    }

    Swal.fire("บันทึกเรียบร้อย", "", "success");
    loadList();
  };

  // =======================
  // DELETE
  // =======================
  const toggleSelect = (row) => {
    const set = new Set(selectedRows);
    set.has(row) ? set.delete(row) : set.add(row);
    setSelectedRows(set);
  };

  const deleteBulk = async () => {
    if (!selectedRows.size)
      return Swal.fire("เตือน", "ยังไม่ได้เลือกรายการ", "warning");

    const confirm = await Swal.fire({
      title: `ยืนยันลบ ${selectedRows.size} รายการ`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({ title: "กำลังลบ...", didOpen: () => Swal.showLoading() });

    const rows = [...selectedRows].sort((a, b) => b - a);
    for (const r of rows) {
      await postAction("DATA", "delete", { row: r });
    }

    Swal.fire("ลบเรียบร้อย", "", "success");
    loadList();
  };

  // =======================
  // HISTORY
  // =======================
  const openHistory = async (item) => {
    setCurrentItem(item);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryLogs([]);

    try {
      const rows = await fetchSheetData(SHEET_NAMES.LOG || "LOG");
      setHistoryLogs(rows.filter((r) => String(r[0]) === String(item.code)));
    } catch (e) {
      console.error(e);
    }

    setHistoryLoading(false);
  };

  // =======================
  // RENDER
  // =======================
  return (
    <div className="card shadow-sm rounded-4">
      {/* UI ส่วนนี้เหมือนเดิมทุกอย่าง */}
    </div>
  );
};

export default InventoryTable;
