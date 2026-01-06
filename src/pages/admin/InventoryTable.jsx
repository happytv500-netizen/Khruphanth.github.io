import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';

// ตัวเลือกหมวดหมู่ (ปรับแก้ได้ตามจริง)
const CATEGORIES = ["-", "เครื่องใช้ไฟฟ้า", "พัดลม", "เครื่องปรับอากาศ", "เฟอร์นิเจอร์", "อุปกรณ์คอมพิวเตอร์", "สื่อการสอน", "อื่นๆ"];

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- States Modals ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // --- States Add/View ---
  const [currentItem, setCurrentItem] = useState({ code: '', name: '', category: '-', detail: '' });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- States Table Features ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'no', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- States Bulk Actions ---
  const [selectedRows, setSelectedRows] = useState(new Set()); // เก็บ row ที่ถูกติ๊ก
  const [isMultiEditMode, setIsMultiEditMode] = useState(false); // โหมดแก้ไขหลายรายการ
  const [editBuffer, setEditBuffer] = useState({}); // เก็บค่าที่ถูกแก้ { row: { code, name, ... } }

  // ================= LOAD DATA =================
  const loadList = async () => {
    setLoading(true);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.DATA || "DATA");
      // Mapping: [0]=ลำดับ, [1]=รหัส, [2]=ชื่อ, [3]=หมวดหมู่, [4]=สถานะ, [5]=รายละเอียด
      const mapped = rows.map((r, i) => ({
        row: i + 2,
        no: i + 1,
        code: r[1] || "",
        name: r[2] || "",
        category: r[3] || "-",
        status: r[4] || "ใช้งานได้",
        detail: r[5] || ""
      }));
      setData(mapped);
      setEditBuffer({});
      setSelectedRows(new Set());
      setIsMultiEditMode(false);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  // ================= DATA PROCESSING =================
  const processedData = useMemo(() => {
    let items = [...data];
    
    // 1. Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.code.toLowerCase().includes(lower) ||
        item.name.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
      );
    }

    // 2. Sort
    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [data, searchTerm, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ================= HANDLERS =================

  // 1. Checkbox Handler
  const toggleSelect = (rowId) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(rowId)) newSet.delete(rowId);
    else newSet.add(rowId);
    setSelectedRows(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === currentItems.length && currentItems.length > 0) {
      setSelectedRows(new Set());
    } else {
      const newSet = new Set();
      currentItems.forEach(item => newSet.add(item.row));
      setSelectedRows(newSet);
    }
  };

  // 2. Multi-Edit Handler
  const handleBufferChange = (row, field, value) => {
    setEditBuffer(prev => ({
      ...prev,
      [row]: {
        ...prev[row], // ค่าเดิมที่แก้ไว้
        [field]: value // ค่าใหม่
      }
    }));
  };

  // 3. Save Bulk Edit
  const saveBulkEdit = async () => {
    const rowsToUpdate = Object.keys(editBuffer);
    if (rowsToUpdate.length === 0) {
      setIsMultiEditMode(false);
      return;
    }

    Swal.fire({ title: `กำลังบันทึก ${rowsToUpdate.length} รายการ...`, didOpen: () => Swal.showLoading() });

    // Loop ส่ง API ทีละรายการ (หรือถ้า API รองรับ Batch ก็ส่งทีเดียวได้)
    for (const row of rowsToUpdate) {
      const changes = editBuffer[row];
      const original = data.find(d => String(d.row) === String(row));
      if (!original) continue;

      // Merge ค่าเดิมกับค่าที่แก้
      await postAction("DATA", "edit", {
        row: row,
        "รหัส": changes.code !== undefined ? changes.code : original.code,
        "ชื่อ": changes.name !== undefined ? changes.name : original.name,
        "ที่อยู่": changes.category !== undefined ? changes.category : original.category,
        "สถานะ": original.status,
        "รายละเอียด": original.detail
      });
    }

    Swal.fire('เรียบร้อย', 'บันทึกข้อมูลแล้ว', 'success');
    loadList();
  };

  // 4. Bulk Delete
  const deleteBulk = async () => {
    const count = selectedRows.size;
    if (count === 0) return;

    const res = await Swal.fire({
      title: `ลบ ${count} รายการ?`,
      text: "การกระทำนี้ไม่สามารถย้อนกลับได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ยืนยันลบ'
    });

    if (res.isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });
      
      // แปลง Set เป็น Array แล้ววนลบ (เรียงจาก row มากไปน้อย เพื่อป้องกัน row shift)
      const sortedRows = Array.from(selectedRows).sort((a, b) => b - a);
      
      for (const row of sortedRows) {
        await postAction("DATA", "delete", { row });
      }

      Swal.fire('ลบเสร็จสิ้น', '', 'success');
      loadList();
    }
  };

  // 5. Add Item (Continuous)
  const handleAddItem = async (e) => {
    e.preventDefault();
    // ไม่ปิด Modal แต่แสดง Loading overlay ชั่วคราว
    Swal.fire({ title: 'กำลังเพิ่ม...', didOpen: () => Swal.showLoading() });

    await postAction("DATA", "add", {
      "รหัส": currentItem.code,
      "ชื่อ": currentItem.name,
      "ที่อยู่": currentItem.category,
      "สถานะ": "ใช้งานได้",
      "รายละเอียด": currentItem.detail || "-"
    });

    Swal.close(); // ปิด Loading
    
    // เคลียร์ฟอร์ม เตรียมกรอกรายการต่อไป
    setCurrentItem({ code: '', name: '', category: '-', detail: '' });
    
    // แจ้งเตือนเล็กๆ (Toast)
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    Toast.fire({ icon: 'success', title: 'เพิ่มรายการแล้ว' });
    
    // รีโหลดข้อมูลเบื้องหลัง
    loadList();
  };

  // 6. View History
  const openHistory = async (item) => {
    setCurrentItem(item); // เก็บตัวที่เลือกไว้โชว์ใน header modal
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryLogs([]);
    
    try {
      const rows = await fetchSheetData(SHEET_NAMES.LOG || "LOG");
      const logs = rows.filter(r => String(r[0]) === String(item.code));
      setHistoryLogs(logs);
    } catch(e) { console.error(e); }
    setHistoryLoading(false);
  };

  // Helper: Download Image
  const downloadImg = (url, name, e) => {
    e.stopPropagation(); // ป้องกันไม่ให้ trigger row click
    // Logic download เดิม...
    window.open(url, '_blank'); 
  };

  // Helper: Sort Icon
  const getSortIcon = (key) => sortConfig.key === key 
    ? (sortConfig.direction === 'asc' ? <i className="bi bi-caret-up-fill"></i> : <i className="bi bi-caret-down-fill"></i>)
    : <i className="bi bi-caret-up text-muted opacity-25"></i>;

  return (
    <div className="card shadow-sm rounded-4">
      {/* --- HEADER --- */}
      <div className="card-header bg-white py-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <h5 className="fw-bold text-primary m-0">ฐานข้อมูลครุภัณฑ์</h5>
            {/* Bulk Action Buttons */}
            {isMultiEditMode ? (
              <div className="btn-group btn-group-sm">
                <button className="btn btn-success" onClick={saveBulkEdit}><i className="bi bi-check-lg"></i> บันทึกทั้งหมด</button>
                <button className="btn btn-secondary" onClick={() => {setIsMultiEditMode(false); setEditBuffer({});}}>ยกเลิก</button>
              </div>
            ) : (
              <button className="btn btn-outline-warning btn-sm text-dark" onClick={() => setIsMultiEditMode(true)}>
                <i className="bi bi-pencil-square"></i> แก้ไขหลายรายการ
              </button>
            )}
            
            {selectedRows.size > 0 && !isMultiEditMode && (
              <button className="btn btn-danger btn-sm" onClick={deleteBulk}>
                <i className="bi bi-trash"></i> ลบที่เลือก ({selectedRows.size})
              </button>
            )}
          </div>

          <div className="d-flex gap-2">
            <input 
              className="form-control form-control-sm" 
              placeholder="🔍 ค้นหา..." 
              style={{width: '200px'}}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddModal(true); setCurrentItem({code:'', name:'', category:'-', detail:''}); }}>
              + เพิ่ม
            </button>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="table-responsive" style={{ maxHeight: '70vh' }}>
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light sticky-top" style={{zIndex: 5}}>
            <tr>
              <th width="40" className="text-center">
                <input type="checkbox" className="form-check-input" 
                  checked={selectedRows.size === currentItems.length && currentItems.length > 0} 
                  onChange={toggleSelectAll} 
                />
              </th>
              <th onClick={() => setSortConfig({ key: 'no', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer'}}>
                ลำดับ {getSortIcon('no')}
              </th>
              <th onClick={() => setSortConfig({ key: 'code', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer'}}>
                รหัส {getSortIcon('code')}
              </th>
              <th onClick={() => setSortConfig({ key: 'name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer'}}>
                ชื่อครุภัณฑ์ {getSortIcon('name')}
              </th>
              <th onClick={() => setSortConfig({ key: 'category', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer'}}>
                หมวดหมู่ {getSortIcon('category')}
              </th>
              {!isMultiEditMode && (
                <>
                  <th className="text-center">Barcode</th>
                  <th className="text-center">QR Code</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, i) => {
              const buffer = editBuffer[item.row] || {}; // ค่าที่กำลังแก้ (ถ้ามี)
              
              return (
                <tr 
                  key={i} 
                  className={!isMultiEditMode ? "cursor-pointer" : ""}
                  onClick={!isMultiEditMode ? () => openHistory(item) : undefined}
                  title={!isMultiEditMode ? "คลิกเพื่อดูรายละเอียดเพิ่มเติม" : ""}
                  style={{ transition: '0.2s' }}
                >
                  <td className="text-center" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="form-check-input" 
                      checked={selectedRows.has(item.row)} 
                      onChange={() => toggleSelect(item.row)} 
                    />
                  </td>
                  <td>{item.no}</td>
                  
                  {/* Column: Code */}
                  <td>
                    {isMultiEditMode ? (
                      <input className="form-control form-control-sm" 
                        value={buffer.code !== undefined ? buffer.code : item.code}
                        onChange={(e) => handleBufferChange(item.row, 'code', e.target.value)}
                      />
                    ) : <span className="fw-bold text-primary">{item.code}</span>}
                  </td>

                  {/* Column: Name */}
                  <td>
                    {isMultiEditMode ? (
                      <input className="form-control form-control-sm" 
                        value={buffer.name !== undefined ? buffer.name : item.name}
                        onChange={(e) => handleBufferChange(item.row, 'name', e.target.value)}
                      />
                    ) : item.name}
                  </td>

                  {/* Column: Category */}
                  <td>
                    {isMultiEditMode ? (
                      <select className="form-select form-select-sm"
                        value={buffer.category !== undefined ? buffer.category : item.category}
                        onChange={(e) => handleBufferChange(item.row, 'category', e.target.value)}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : <span className="badge bg-secondary bg-opacity-10 text-dark border">{item.category}</span>}
                  </td>

                  {/* Images (Hide in Edit Mode) */}
                  {!isMultiEditMode && (
                    <>
                      <td className="text-center" onClick={(e) => downloadImg(`https://barcode.tec-it.com/barcode.ashx?data=${item.code}&code=Code128`, 'bc', e)}>
                        <img src={`https://barcode.tec-it.com/barcode.ashx?data=${item.code}&code=Code128`} height="25" alt="bc" />
                      </td>
                      <td className="text-center" onClick={(e) => downloadImg(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.code}`, 'qr', e)}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.code}`} height="30" alt="qr" />
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION --- */}
      <div className="card-footer bg-white py-3 d-flex justify-content-between">
        <select className="form-select form-select-sm w-auto" value={itemsPerPage} onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}>
            <option value="20">20 / หน้า</option>
            <option value="50">50 / หน้า</option>
            <option value="100">100 / หน้า</option>
        </select>
        <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>ก่อนหน้า</button>
            <button className="btn btn-outline-secondary disabled">{currentPage} / {totalPages}</button>
            <button className="btn btn-outline-secondary" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>ถัดไป</button>
        </div>
      </div>

      {/* --- ADD MODAL --- */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleAddItem}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">+ เพิ่มรายการใหม่</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">รหัสครุภัณฑ์</label>
                    <input required className="form-control" autoFocus 
                      value={currentItem.code} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">ชื่อครุภัณฑ์</label>
                    <input required className="form-control" 
                      value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">หมวดหมู่</label>
                    <select className="form-select" 
                      value={currentItem.category} onChange={e => setCurrentItem({...currentItem, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">รายละเอียด</label>
                    <textarea className="form-control" rows="2"
                      value={currentItem.detail} onChange={e => setCurrentItem({...currentItem, detail: e.target.value})}></textarea>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <small className="text-muted me-auto">*กดบันทึกเพื่อเพิ่มรายการถัดไปทันที</small>
                  <button type="submit" className="btn btn-primary px-4">บันทึก</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && (
        <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title"><i className="bi bi-clock-history"></i> ประวัติ: {currentItem.code}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowHistoryModal(false)}></button>
              </div>
              <div className="modal-body bg-light">
                <div className="alert alert-light border shadow-sm mb-3 d-flex justify-content-between">
                    <span><strong>ชื่อ:</strong> {currentItem.name}</span>
                    <span><strong>หมวด:</strong> {currentItem.category}</span>
                </div>
                <table className="table table-striped bg-white border">
                    <thead className="table-primary"><tr><th>วัน/เวลา</th><th>สถานะ</th><th>ที่เก็บ/ผู้รับผิดชอบ</th><th>หมายเหตุ</th></tr></thead>
                    <tbody>
                        {historyLoading ? <tr><td colSpan="4" className="text-center">Loading...</td></tr> :
                         historyLogs.length === 0 ? <tr><td colSpan="4" className="text-center text-muted">ไม่พบประวัติ</td></tr> :
                         historyLogs.map((log, i) => (
                            <tr key={i}>
                                <td>{new Date(log[5]).toLocaleDateString('th-TH')} {log[6] && String(log[6]).substring(0,5)}</td>
                                <td>{log[3]}</td>
                                <td>{log[2]}</td>
                                <td>{log[4]}</td>
                            </tr>
                         ))}
                    </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryTable;