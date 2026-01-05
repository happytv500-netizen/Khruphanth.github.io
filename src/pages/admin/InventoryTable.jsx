import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentItem, setCurrentItem] = useState({
    row: '',
    code: '',
    name: ''
  });

  // ================= LOAD =================
  const loadList = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.DATA || "DATA");

      // DATA:
      // [0]=ลำดับ, [1]=รหัส, [2]=ชื่อ, [3]=Barcode, [4]=QRCode
      const mapped = rows.map((r, i) => ({
        row: i + 2,
        no: r[0],
        code: r[1],
        name: r[2],
        barcode: r[3],
        qrcode: r[4]
      }));

      setData(mapped);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  // ================= ADD =================
  const handleAddItem = async (e) => {
    e.preventDefault();
    setShowAddModal(false);

    Swal.fire({ title: 'กำลังเพิ่ม...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await postAction("DATA", "add", {
      code: currentItem.code,
      name: currentItem.name,
      barcode: currentItem.code,
      qrcode: `=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=" & B)`
    });

    Swal.fire('สำเร็จ', '', 'success');
    loadList();
  };

  // ================= UPDATE =================
  const handleEditSave = async () => {
    setShowEditModal(false);

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await postAction("DATA", "update", {
      row: currentItem.row,
      code: currentItem.code,
      name: currentItem.name,
      barcode: currentItem.code,
      qrcode: `=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=" & B${currentItem.row})`
    });

    Swal.fire('บันทึกแล้ว', '', 'success');
    loadList();
  };

  // ================= DELETE =================
  const handleDelete = async (row) => {
    const res = await Swal.fire({
      title: 'ยืนยันลบ?',
      icon: 'warning',
      showCancelButton: true
    });

    if (!res.isConfirmed) return;

    Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await postAction("DATA", "delete", { row });

    Swal.fire('ลบแล้ว', '', 'success');
    loadList();
  };

  // ================= UI =================
  return (
    <div className="card shadow-sm rounded-4">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-primary m-0">ฐานข้อมูลครุภัณฑ์</h5>
        <button className="btn btn-primary btn-sm" onClick={() => { setCurrentItem({}); setShowAddModal(true); }}>
          + เพิ่ม
        </button>
      </div>

      <div className="table-responsive p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>ลำดับ</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ชื่อครุภัณฑ์</th>
              <th>BarCode</th>
              <th>QRCode</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center">กำลังโหลด...</td></tr>
            ) : data.map((item, i) => (
              <tr key={i}>
                <td>{item.no}</td>
                <td className="fw-bold">{item.code}</td>
                <td>{item.name}</td>
                <td>{item.barcode ? '✔' : '-'}</td>
                <td>{item.qrcode ? '✔' : '-'}</td>
                <td className="text-center">
                  <button className="btn btn-warning btn-sm me-1"
                    onClick={() => { setCurrentItem(item); setShowEditModal(true); }}>
                    แก้ไข
                  </button>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(item.row)}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAddItem}>
                <div className="modal-header"><h5>เพิ่มครุภัณฑ์</h5></div>
                <div className="modal-body">
                  <input required className="form-control mb-2" placeholder="รหัสครุภัณฑ์"
                    value={currentItem.code || ''}
                    onChange={e => setCurrentItem({ ...currentItem, code: e.target.value })} />
                  <input required className="form-control" placeholder="ชื่อครุภัณฑ์"
                    value={currentItem.name || ''}
                    onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ปิด</button>
                  <button type="submit" className="btn btn-primary">บันทึก</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5>แก้ไขครุภัณฑ์</h5></div>
              <div className="modal-body">
                <input className="form-control mb-2"
                  value={currentItem.code || ''}
                  onChange={e => setCurrentItem({ ...currentItem, code: e.target.value })} />
                <input className="form-control"
                  value={currentItem.name || ''}
                  onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>ปิด</button>
                <button className="btn btn-primary" onClick={handleEditSave}>บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
