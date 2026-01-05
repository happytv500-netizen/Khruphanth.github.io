export const getStatusBadgeClass = (status) => {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("ใช้งานได้")) return "bg-success";
  if (s.includes("ชำรุด") || s.includes("เสื่อมสภาพ")) return "bg-danger";
  if (s.includes("ซ่อม") || s.includes("ส่งซ่อม")) return "bg-warning text-dark";
  return "bg-secondary";
};

export const formatDate = (val) => {
  if (!val) return "-";
  // กรณี Google Sheet ส่งมาเป็น "Date(2023,0,1)"
  const m = String(val).match(/Date\(([^)]+)\)/);
  if (m) {
    const [y, mo, d] = m[1].split(',').map(Number);
    return `${String(d).padStart(2,'0')}/${String(mo+1).padStart(2,'0')}/${y+543}`;
  }
  return val;
};