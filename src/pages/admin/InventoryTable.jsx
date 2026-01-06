import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';

const CATEGORIES = ["-", "เครื่องใช้ไฟฟ้า", "พัดลม", "เครื่องปรับอากาศ", "เฟอร์นิเจอร์", "อุปกรณ์คอมพิวเตอร์", "สื่อการสอน", "อื่นๆ"];

// --- Component: รูปภาพพร้อมปุ่มโหลดใหม่ ---
const RetryImage = ({ src, alt, height }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setImgSrc(src); setError(false); setLoading(true); }, [src]);

  const handleRetry = (e) => {
    e.stopPropagation();
    setLoading(true);
    setError(false);
    setImgSrc(`${src}&t=${Date.now()}`);
  };

  return (
    <div className="position-relative d-inline-block" style={{ minWidth: '30px', minHeight: height }}>
      {loading && !error && <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>}
      <img 
        src={imgSrc} alt={alt} height={height}
        className={error ? 'd-none' : ''}
        onLoad={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        style={{ cursor: 'pointer' }}
        onClick={() => window.open(src, '_blank')}
      />
      {error && (
        <button className="btn btn-sm btn-light border shadow-sm p-0 px-1" onClick={handleRetry} title="โหลดรูปใหม่">
          <i className="bi bi-arrow-clockwise text-danger"></i>
        </button>
      )}
    </div>
  );
};

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modes: 'view' (ดูปกติ), 'edit' (แก้ทุกแถว), 'delete' (เลือกเพื่อลบ)
  const [mode, setMode] = useState('view');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Data States
  const [newItems, setNewItems] = useState([{ id: 1, code: '', name: '', category: '-' }]); // ตัด detail ออก
  const [currentItem, setCurrentItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Table Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'no', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Action States
  const [selectedRows, setSelectedRows] = useState(new Set()); 
  const [editBuffer, setEditBuffer] = useState({}); 

  // ================= LOAD =================
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
        detail: r[5] || ""
      }));
      setData(mapped);
      resetModes();
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  const resetModes = () => {
    setMode('view');
    setEditBuffer({});
    setSelectedRows(new Set());
  };

  // ================= PROCESS DATA =================
  const processedData = useMemo(() => {
    let items = [...data];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(item => 
        String(item.code).toLowerCase().includes(lower) ||
        String(item.name).toLowerCase().includes(lower) ||
        String(item.category).toLowerCase().includes(lower)
      );
    }
    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        const numA = parseFloat(valA); const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [data, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ================= HANDLERS: ADD (Auto Row) =================
  const handleNewItemChange = (id, field, value) => {
    const updatedItems = newItems.map(item => item.id === id ? { ...item, [field]: value } : item);
    setNewItems(updatedItems);

    // Auto Add Row: ถ้ากรอกแถวสุดท้ายครบ (รหัส+ชื่อ+หมวด) ให้เติมแถวใหม่ทันที
    const lastItem = updatedItems[updatedItems.length - 1];
    if (lastItem.id === id && lastItem.code && lastItem.name && lastItem.category !== '-') {
        // เพิ่มแถวใหม่ (ไม่มี detail)
        setNewItems([...updatedItems, { id: Date.now(), code: '', name: '', category: '-' }]);
    }
  };

  const handleRemoveNewRow = (id) => {
    if (newItems.length > 1) setNewItems(newItems.filter(item => item.id !== id));
  };

  const saveBatchAdd = async () => {
    const validItems = newItems.filter(i => i.code.trim() !== '' && i.name.trim() !== '');
    if (validItems.length === 0) return Swal.fire('เตือน', 'กรุณากรอกข้อมูล', 'warning');

    setShowAddModal(false);
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let count = 0;
    for (const item of validItems) {
        Swal.update({ html: `กำลังเพิ่มรายการ: ${item.code}` });
        await postAction("DATA", "add", {
            "รหัส": item.code, "ชื่อ": item.name, "ที่อยู่": item.category,
            "สถานะ": "ใช้งานได้", "รายละเอียด": "-" // ส่ง - ไปแทน
        });
        count++;
    }
    Swal.fire('สำเร็จ', `เพิ่ม ${count} รายการเรียบร้อย`, 'success');
    setNewItems([{ id: Date.now(), code: '', name: '', category: '-' }]); // Reset
    loadList();
  };

  // ================= HANDLERS: EDIT MODE =================
  const enterEditMode = () => {
    // โหลดข้อมูล "ทุกแถวในหน้าปัจจุบัน" เข้า Buffer เพื่อรอแก้ไข
    const buffer = {};
    currentItems.forEach(item => { buffer[item.row] = { ...item }; });
    setEditBuffer(buffer);
    setMode('edit');
  };

  const handleEditChange = (rowId, field, value) => {
    setEditBuffer(prev => ({ 
        ...prev, 
        [rowId]: { ...prev[rowId], [field]: value } // อัปเดตค่าใน Buffer
    }));
  };

  const saveBulkEdit = async () => {
    const rowsToUpdate = Object.keys(editBuffer);
    if (rowsToUpdate.length === 0) return resetModes();

    Swal.fire({ title: `กำลังบันทึก ${rowsToUpdate.length} รายการ...`, didOpen: () => Swal.showLoading() });
    
    for (const rowId of rowsToUpdate) {
        const item = editBuffer[rowId];
        // ส่งข้อมูลทั้งหมด (ทั้งที่แก้และไม่ได้แก้) กลับไป
        await postAction("DATA", "edit", {
            row: rowId, 
            "รหัส": item.code, 
            "ชื่อ": item.name,
            "ที่อยู่": item.category, 
            "สถานะ": item.status, 
            "รายละเอียด": item.detail
        });
    }
    Swal.fire('บันทึกเรียบร้อย', '', 'success');
    loadList();
  };

  // ================= HANDLERS: DELETE MODE =================
  const toggleSelect = (rowId) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(rowId)) newSet.delete(rowId); else newSet.add(rowId);
    setSelectedRows(newSet);
  };

  const deleteBulk = async () => {
    if (selectedRows.size === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการที่จะลบ', 'warning');
    if ((await Swal.fire({ title: `ยืนยันลบ ${selectedRows.size} รายการ?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' })).isConfirmed) {
      Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });
      const sorted = Array.from(selectedRows).sort((a, b) => b - a);
      for (const row of sorted) await postAction("DATA", "delete", { row });
      Swal.fire('ลบเสร็จสิ้น', '', 'success');
      loadList();
    }
  };

  // ================= HANDLERS: OTHERS =================
  const openHistory = async (item) => {
    setCurrentItem(item); setShowHistoryModal(true); setHistoryLoading(true); setHistoryLogs([]);
    try {
      const rows = await fetchSheetData(SHEET_NAMES.LOG || "LOG");
      setHistoryLogs(rows.filter(r => String(r[0]) === String(item.code)));
    } catch(e) { console.error(e); }
    setHistoryLoading(false);
  };

  const getSortIcon = (key) => sortConfig.key === key 
    ? (sortConfig.direction === 'asc' ? <i className="bi bi-caret-up-fill ms-1"></i> : <i className="bi bi-caret-down-fill ms-1"></i>)
    : <i className="bi bi-caret-up ms-1 text-muted opacity-25"></i>;

  return (
    <div className="card shadow-sm rounded-4">
      
      {/* --- HEADER --- */}
      <div className="card-header bg-white py-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          
          <div className="d-flex align-items-center gap-2">
            <h5 className="fw-bold text-primary m-0"><i className="bi bi-box-seam me-2"></i>ฐานข้อมูลครุภัณฑ์</h5>
            {/* Status Badge */}
            {mode === 'edit' && <span className="badge bg-warning text-dark">โหมดแก้ไข</span>}
            {mode === 'delete' && <span className="badge bg-danger">โหมดลบรายการ</span>}
          </div>
          
          <div className="d-flex align-items-center gap-2">
             
             {/* Search (ซ่อนตอนแก้ไข/ลบ) */}
             {mode === 'view' && (
                <div className="input-group input-group-sm" style={{width: '200px'}}>
                    <span className="input-group-text bg-light"><i className="bi bi-search"></i></span>
                    <input className="form-control" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
             )}

            {/* BUTTON GROUP */}
            <div className="btn-group btn-group-sm">
                
                {/* 1. View Mode Buttons */}
                {mode === 'view' && (
                    <>
                        <button className="btn btn-outline-secondary" onClick={loadList} disabled={loading} title="รีเฟรช">
                            <i className={`bi bi-arrow-clockwise ${loading ? 'spin-anim' : ''}`}></i>
                        </button>
                        <button className="btn btn-warning text-dark" onClick={enterEditMode}>
                            <i className="bi bi-pencil-square"></i> แก้ไขหลายรายการ
                        </button>
                        <button className="btn btn-danger" onClick={() => setMode('delete')}>
                            <i className="bi bi-trash"></i> ลบหลายรายการ
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            <i className="bi bi-plus-lg"></i> เพิ่มรายการ
                        </button>
                    </>
                )}

                {/* 2. Edit Mode Buttons */}
                {mode === 'edit' && (
                    <>
                        <button className="btn btn-success px-3" onClick={saveBulkEdit}>
                            <i className="bi bi-save me-1"></i> บันทึกการแก้ไข
                        </button>
                        <button className="btn btn-secondary px-3" onClick={resetModes}>ยกเลิก</button>
                    </>
                )}

                {/* 3. Delete Mode Buttons */}
                {mode === 'delete' && (
                    <>
                        <button className="btn btn-danger px-3" onClick={deleteBulk} disabled={selectedRows.size === 0}>
                            <i className="bi bi-trash me-1"></i> ยืนยันลบ ({selectedRows.size})
                        </button>
                        <button className="btn btn-secondary px-3" onClick={resetModes}>ยกเลิก</button>
                    </>
                )}

            </div>
          </div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="table-responsive" style={{ maxHeight: '70vh' }}>
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light sticky-top" style={{zIndex: 5}}>
            <tr>
              {/* Checkbox Column (Only in Delete Mode) */}
              {mode === 'delete' && <th width="40" className="text-center bg-danger bg-opacity-10 text-danger"><i className="bi bi-check2-square"></i></th>}
              
              <th onClick={() => setSortConfig({ key: 'no', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer', width: '80px'}}>ลำดับ {getSortIcon('no')}</th>
              <th onClick={() => setSortConfig({ key: 'code', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer', width: '150px'}}>รหัส {getSortIcon('code')}</th>
              <th onClick={() => setSortConfig({ key: 'name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer'}}>ชื่อครุภัณฑ์ {getSortIcon('name')}</th>
              <th onClick={() => setSortConfig({ key: 'category', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer'}}>หมวดหมู่ {getSortIcon('category')}</th>
              
              {/* Images Column (Hide in Edit Mode) */}
              {mode !== 'edit' && <><th className="text-center">Barcode</th><th className="text-center">QR Code</th></>}
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
               <tr><td colSpan="7" className="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>
            ) : currentItems.map((item, i) => {
              // ในโหมดแก้ไข ใช้ข้อมูลจาก Buffer แทน
              const buffer = mode === 'edit' ? (editBuffer[item.row] || item) : item;

              return (
                <tr 
                  key={item.row} 
                  className={mode === 'view' ? "align-middle table-row-hover" : "align-middle"}
                  style={mode === 'view' ? { cursor: 'pointer' } : {}}
                  onClick={mode === 'view' ? () => openHistory(item) : mode === 'delete' ? () => toggleSelect(item.row) : undefined}
                >
                  {/* Delete Checkbox */}
                  {mode === 'delete' && (
                      <td className="text-center bg-danger bg-opacity-10">
                        <input type="checkbox" className="form-check-input" checked={selectedRows.has(item.row)} onChange={() => toggleSelect(item.row)} />
                      </td>
                  )}

                  <td>{item.no}</td>

                  {/* Code */}
                  <td>
                    {mode === 'edit' ? (
                        <input className="form-control form-control-sm" value={buffer.code} onChange={e => handleEditChange(item.row, 'code', e.target.value)} />
                    ) : <span className="fw-bold text-primary">{item.code}</span>}
                  </td>

                  {/* Name */}
                  <td>
                    {mode === 'edit' ? (
                        <input className="form-control form-control-sm" value={buffer.name} onChange={e => handleEditChange(item.row, 'name', e.target.value)} />
                    ) : item.name}
                  </td>

                  {/* Category */}
                  <td>
                    {mode === 'edit' ? (
                        <select className="form-select form-select-sm" value={buffer.category} onChange={e => handleEditChange(item.row, 'category', e.target.value)}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    ) : <span className="badge bg-secondary bg-opacity-10 text-dark border">{item.category}</span>}
                  </td>

                  {/* Images */}
                  {mode !== 'edit' && (
                    <>
                      <td className="text-center" onClick={e => e.stopPropagation()}>
                        <RetryImage src={`https://barcode.tec-it.com/barcode.ashx?data=${item.code}&code=Code128&translate-esc=on`} alt="bc" height="25" />
                      </td>
                      <td className="text-center" onClick={e => e.stopPropagation()}>
                        <RetryImage src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.code}`} alt="qr" height="35" />
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
      <div className="card-footer bg-white py-3 d-flex justify-content-between align-items-center">
        <select className="form-select form-select-sm w-auto" value={itemsPerPage} onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}}>
            <option value="20">20 / หน้า</option>
            <option value="50">50 / หน้า</option>
            <option value="100">100 / หน้า</option>
        </select>
        <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>ก่อนหน้า</button>
            <span className="btn btn-outline-secondary disabled">{currentPage} / {totalPages || 1}</span>
            <button className="btn btn-outline-secondary" disabled={currentPage===totalPages || totalPages===0} onClick={()=>setCurrentPage(p=>p+1)}>ถัดไป</button>
        </div>
      </div>

      {/* --- ADD BATCH MODAL (No Detail Column) --- */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-table me-2"></i>เพิ่มรายการใหม่</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body p-0">
                <table className="table table-bordered mb-0">
                    <thead className="table-light">
                        {/* ตัดคอลัมน์รายละเอียดออก */}
                        <tr><th width="50">#</th><th width="25%">รหัส *</th><th width="40%">ชื่อครุภัณฑ์ *</th><th width="25%">หมวดหมู่</th><th width="50"></th></tr>
                    </thead>
                    <tbody>
                        {newItems.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="text-center align-middle">{idx + 1}</td>
                                <td><input className="form-control form-control-sm" placeholder="รหัส" value={item.code} onChange={e => handleNewItemChange(item.id, 'code', e.target.value)} /></td>
                                <td><input className="form-control form-control-sm" placeholder="ชื่อ" value={item.name} onChange={e => handleNewItemChange(item.id, 'name', e.target.value)} /></td>
                                <td><select className="form-select form-select-sm" value={item.category} onChange={e => handleNewItemChange(item.id, 'category', e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                                <td className="text-center align-middle">{newItems.length > 1 && (<button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleRemoveNewRow(item.id)}><i className="bi bi-x-lg"></i></button>)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
              <div className="modal-footer bg-light">
                <small className="text-muted me-auto">* แถวใหม่จะปรากฏอัตโนมัติเมื่อกรอกข้อมูลครบ</small>
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ยกเลิก</button>
                <button className="btn btn-primary px-4" onClick={saveBatchAdd}>บันทึกทั้งหมด</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL (View Only) --- */}
      {showHistoryModal && currentItem && (
        <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-clock-history me-2"></i>ประวัติครุภัณฑ์</h5>
                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowHistoryModal(false)}></button>
              </div>
              <div className="modal-body bg-light">
                 <div className="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm mb-3 border-start border-4 border-primary">
                    <div><div className="text-muted small">รหัส: {currentItem.code}</div><div className="fw-bold fs-5">{currentItem.name}</div></div>
                    <div className="text-end"><span className="badge bg-info text-dark mb-1">{currentItem.category}</span><div className="small text-muted">{currentItem.status}</div></div>
                 </div>
                 <div className="card border-0 shadow-sm">
                    <table className="table table-striped mb-0">
                        <thead className="table-light"><tr><th>วัน/เวลา</th><th>สถานะ</th><th>ที่เก็บ</th><th>หมายเหตุ</th></tr></thead>
                        <tbody>
                            {historyLoading ? <tr><td colSpan="4" className="text-center py-3">กำลังโหลด...</td></tr> :
                             historyLogs.length === 0 ? <tr><td colSpan="4" className="text-center py-3 text-muted">ไม่พบประวัติ</td></tr> :
                             historyLogs.map((log, i) => (<tr key={i}><td>{new Date(log[5]).toLocaleDateString('th-TH')} <span className="text-muted small">{log[6] && String(log[6]).substring(0,5)}</span></td><td><span className="badge bg-secondary">{log[3]}</span></td><td>{log[2]}</td><td>{log[4]}</td></tr>))}
                        </tbody>
                    </table>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background-color: #f8f9fa !important; box-shadow: inset 0 0 0 9999px rgba(0,0,0,0.02); }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin-anim { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default InventoryTable;