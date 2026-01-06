import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import { fetchSheetData, postAction } from '../../services/api';
import { SHEET_NAMES } from '../../config/config';

// หมวดหมู่สำหรับ Dropdown
const CATEGORIES = ["-", "เครื่องใช้ไฟฟ้า", "พัดลม", "เครื่องปรับอากาศ", "เฟอร์นิเจอร์", "อุปกรณ์คอมพิวเตอร์", "สื่อการสอน", "อื่นๆ"];

// --- Component ย่อย: รูปภาพที่โหลดใหม่ได้ (RetryImage) ---
const RetryImage = ({ src, alt, height }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setImgSrc(src); setError(false); setLoading(true); }, [src]);

  const handleRetry = (e) => {
    e.stopPropagation();
    setLoading(true);
    setError(false);
    // เติม timestamp เพื่อบังคับโหลดใหม่
    setImgSrc(`${src}&t=${Date.now()}`);
  };

  return (
    <div className="position-relative d-inline-block" style={{ minWidth: '30px', minHeight: height }}>
      {loading && !error && <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>}
      
      <img 
        src={imgSrc} 
        alt={alt} 
        height={height}
        className={error ? 'd-none' : ''}
        onLoad={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        style={{ cursor: 'pointer' }}
        onClick={() => window.open(src, '_blank')}
      />

      {error && (
        <button className="btn btn-sm btn-outline-secondary p-0 px-1" onClick={handleRetry} title="โหลดรูปใหม่">
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      )}
    </div>
  );
};

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- States Modals ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // --- States Add Batch (เพิ่มหลายรายการ) ---
  const [newItems, setNewItems] = useState([{ id: 1, code: '', name: '', category: '-', detail: '' }]);
  
  // --- States View History ---
  const [currentItem, setCurrentItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- States Table Features ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'no', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- States Bulk Actions ---
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isMultiEditMode, setIsMultiEditMode] = useState(false);
  const [editBuffer, setEditBuffer] = useState({}); // { rowId: { code:..., name:... } }

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
        // เปรียบเทียบตัวเลขถ้าเป็นไปได้
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [data, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentItems = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ================= HANDLERS: SELECTION =================
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

  // ================= HANDLERS: ADD BATCH =================
  const handleAddNewRow = () => {
    setNewItems([...newItems, { id: Date.now(), code: '', name: '', category: '-', detail: '' }]);
  };

  const handleRemoveNewRow = (id) => {
    setNewItems(newItems.filter(item => item.id !== id));
  };

  const handleNewItemChange = (id, field, value) => {
    setNewItems(newItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const saveBatchAdd = async () => {
    // กรองเอาเฉพาะแถวที่มีข้อมูลรหัสและชื่อ
    const validItems = newItems.filter(i => i.code.trim() !== '' && i.name.trim() !== '');
    if (validItems.length === 0) {
      Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลอย่างน้อย 1 รายการ (รหัสและชื่อ)', 'warning');
      return;
    }

    setShowAddModal(false);
    Swal.fire({ 
        title: 'กำลังบันทึก...', 
        html: `กำลังเพิ่ม 0/${validItems.length} รายการ`,
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
    });

    let successCount = 0;
    for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        Swal.update({ html: `กำลังเพิ่ม ${i + 1}/${validItems.length} รายการ<br>(${item.code})` });
        
        await postAction("DATA", "add", {
            "รหัส": item.code,
            "ชื่อ": item.name,
            "ที่อยู่": item.category,
            "สถานะ": "ใช้งานได้",
            "รายละเอียด": item.detail || "-"
        });
        successCount++;
    }

    Swal.fire('สำเร็จ', `เพิ่มข้อมูลเสร็จสิ้น ${successCount} รายการ`, 'success');
    setNewItems([{ id: Date.now(), code: '', name: '', category: '-', detail: '' }]); // Reset form
    loadList();
  };

  // ================= HANDLERS: BULK EDIT =================
  const startBulkEdit = () => {
    if (selectedRows.size === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการที่จะแก้ไขก่อน', 'warning');
    
    // Initialize editBuffer with current values of selected rows
    const buffer = {};
    selectedRows.forEach(rowId => {
        const item = data.find(d => d.row === rowId);
        if (item) {
            buffer[rowId] = { ...item };
        }
    });
    setEditBuffer(buffer);
    setIsMultiEditMode(true);
  };

  const handleEditChange = (rowId, field, value) => {
    setEditBuffer(prev => ({
        ...prev,
        [rowId]: { ...prev[rowId], [field]: value }
    }));
  };

  const saveBulkEdit = async () => {
    const rowsToUpdate = Object.keys(editBuffer);
    if (rowsToUpdate.length === 0) return setIsMultiEditMode(false);

    Swal.fire({ title: `กำลังอัปเดต ${rowsToUpdate.length} รายการ...`, didOpen: () => Swal.showLoading() });

    for (const rowId of rowsToUpdate) {
        const changes = editBuffer[rowId];
        await postAction("DATA", "edit", {
            row: rowId,
            "รหัส": changes.code,
            "ชื่อ": changes.name,
            "ที่อยู่": changes.category,
            "สถานะ": changes.status,
            "รายละเอียด": changes.detail
        });
    }

    Swal.fire('เรียบร้อย', 'บันทึกข้อมูลแล้ว', 'success');
    loadList();
  };

  // ================= HANDLERS: BULK DELETE =================
  const deleteBulk = async () => {
    const count = selectedRows.size;
    if (count === 0) return Swal.fire('เตือน', 'กรุณาเลือกรายการที่จะลบ', 'warning');

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
      const sortedRows = Array.from(selectedRows).sort((a, b) => b - a); // ลบจากท้ายขึ้นบน
      
      for (const row of sortedRows) {
        await postAction("DATA", "delete", { row });
      }

      Swal.fire('ลบเสร็จสิ้น', '', 'success');
      loadList();
    }
  };

  // ================= HANDLERS: HISTORY =================
  const openHistory = async (item) => {
    setCurrentItem(item);
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

  // Helper: Sort Icon
  const getSortIcon = (key) => sortConfig.key === key 
    ? (sortConfig.direction === 'asc' ? <i className="bi bi-caret-up-fill ms-1"></i> : <i className="bi bi-caret-down-fill ms-1"></i>)
    : <i className="bi bi-caret-up ms-1 text-muted opacity-25"></i>;

  return (
    <div className="card shadow-sm rounded-4">
      {/* --- HEADER --- */}
      <div className="card-header bg-white py-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          
          {/* Left: Title */}
          <h5 className="fw-bold text-primary m-0"><i className="bi bi-box-seam me-2"></i>ฐานข้อมูลครุภัณฑ์</h5>
          
          {/* Right: Actions Group */}
          <div className="d-flex align-items-center gap-2">
             {/* Search */}
             <div className="input-group input-group-sm" style={{width: '200px'}}>
                <span className="input-group-text bg-light"><i className="bi bi-search"></i></span>
                <input 
                    className="form-control" 
                    placeholder="ค้นหา..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Action Buttons */}
            {isMultiEditMode ? (
               <>
                 <button className="btn btn-success btn-sm" onClick={saveBulkEdit}><i className="bi bi-save me-1"></i>บันทึก</button>
                 <button className="btn btn-secondary btn-sm" onClick={() => {setIsMultiEditMode(false); setEditBuffer({});}}>ยกเลิก</button>
               </>
            ) : (
               <>
                 <button className="btn btn-outline-secondary btn-sm" onClick={loadList} title="รีเฟรช">
                    <i className="bi bi-arrow-clockwise"></i>
                 </button>
                 
                 {selectedRows.size > 0 && (
                    <>
                        <button className="btn btn-warning btn-sm" onClick={startBulkEdit}>
                            <i className="bi bi-pencil"></i> แก้ไข ({selectedRows.size})
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={deleteBulk}>
                            <i className="bi bi-trash"></i> ลบ ({selectedRows.size})
                        </button>
                    </>
                 )}

                 <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                    <i className="bi bi-plus-lg me-1"></i> เพิ่มรายการ
                 </button>
               </>
            )}
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
                  disabled={isMultiEditMode}
                />
              </th>
              <th onClick={() => setSortConfig({ key: 'no', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer', width: '80px'}}>
                ลำดับ {getSortIcon('no')}
              </th>
              <th onClick={() => setSortConfig({ key: 'code', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} style={{cursor:'pointer', width: '150px'}}>
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
            {currentItems.length === 0 ? (
               <tr><td colSpan="7" className="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>
            ) : currentItems.map((item, i) => {
              const inEdit = isMultiEditMode && selectedRows.has(item.row);
              const buffer = inEdit ? editBuffer[item.row] : item;

              return (
                <tr 
                  key={item.row} 
                  className={!isMultiEditMode ? "align-middle table-row-hover" : "align-middle"}
                  style={!isMultiEditMode ? { cursor: 'pointer' } : {}}
                  onClick={!isMultiEditMode ? () => openHistory(item) : undefined}
                  title={!isMultiEditMode ? "คลิกเพื่อดูประวัติ" : ""}
                >
                  <td className="text-center" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="form-check-input" 
                      checked={selectedRows.has(item.row)} 
                      onChange={() => toggleSelect(item.row)}
                      disabled={isMultiEditMode}
                    />
                  </td>
                  <td>{item.no}</td>

                  {/* Code */}
                  <td>
                    {inEdit ? (
                        <input className="form-control form-control-sm" value={buffer.code} onChange={e => handleEditChange(item.row, 'code', e.target.value)} />
                    ) : <span className="fw-bold text-primary">{item.code}</span>}
                  </td>

                  {/* Name */}
                  <td>
                    {inEdit ? (
                        <input className="form-control form-control-sm" value={buffer.name} onChange={e => handleEditChange(item.row, 'name', e.target.value)} />
                    ) : item.name}
                  </td>

                  {/* Category */}
                  <td>
                    {inEdit ? (
                        <select className="form-select form-select-sm" value={buffer.category} onChange={e => handleEditChange(item.row, 'category', e.target.value)}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    ) : <span className="badge bg-secondary bg-opacity-10 text-dark border">{item.category}</span>}
                  </td>

                  {/* Images */}
                  {!isMultiEditMode && (
                    <>
                      <td className="text-center" onClick={e => e.stopPropagation()}>
                        <RetryImage 
                            src={`https://barcode.tec-it.com/barcode.ashx?data=${item.code}&code=Code128&translate-esc=on`} 
                            alt="bc" height="25" 
                        />
                      </td>
                      <td className="text-center" onClick={e => e.stopPropagation()}>
                        <RetryImage 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.code}`} 
                            alt="qr" height="35" 
                        />
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

      {/* --- ADD BATCH MODAL --- */}
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
                        <tr>
                            <th width="50">#</th>
                            <th width="20%">รหัส *</th>
                            <th width="30%">ชื่อครุภัณฑ์ *</th>
                            <th width="20%">หมวดหมู่</th>
                            <th>รายละเอียด</th>
                            <th width="50"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {newItems.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="text-center align-middle">{idx + 1}</td>
                                <td>
                                    <input className="form-control form-control-sm" placeholder="รหัส" value={item.code} onChange={e => handleNewItemChange(item.id, 'code', e.target.value)} />
                                </td>
                                <td>
                                    <input className="form-control form-control-sm" placeholder="ชื่อ" value={item.name} onChange={e => handleNewItemChange(item.id, 'name', e.target.value)} />
                                </td>
                                <td>
                                    <select className="form-select form-select-sm" value={item.category} onChange={e => handleNewItemChange(item.id, 'category', e.target.value)}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <input className="form-control form-control-sm" placeholder="รายละเอียด" value={item.detail} onChange={e => handleNewItemChange(item.id, 'detail', e.target.value)} />
                                </td>
                                <td className="text-center align-middle">
                                    {newItems.length > 1 && (
                                        <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleRemoveNewRow(item.id)}><i className="bi bi-x-lg"></i></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-3 bg-light border-top">
                    <button className="btn btn-outline-primary btn-sm dashed-border w-100" onClick={handleAddNewRow}>
                        <i className="bi bi-plus-lg me-1"></i> เพิ่มแถว
                    </button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ยกเลิก</button>
                <button className="btn btn-primary px-4" onClick={saveBatchAdd}>บันทึกทั้งหมด</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && currentItem && (
        <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-clock-history me-2"></i>ประวัติครุภัณฑ์</h5>
                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowHistoryModal(false)}></button>
              </div>
              <div className="modal-body bg-light">
                 {/* Header Info */}
                 <div className="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm mb-3 border-start border-4 border-primary">
                    <div>
                        <div className="text-muted small">รหัส: {currentItem.code}</div>
                        <div className="fw-bold fs-5">{currentItem.name}</div>
                    </div>
                    <div className="text-end">
                        <span className="badge bg-info text-dark mb-1">{currentItem.category}</span>
                        <div className="small text-muted">{currentItem.status}</div>
                    </div>
                 </div>

                 {/* Timeline / Table */}
                 <h6 className="text-muted ms-1 mb-2">บันทึกการตรวจสอบ</h6>
                 <div className="card border-0 shadow-sm">
                    <table className="table table-striped mb-0">
                        <thead className="table-light">
                            <tr><th>วัน/เวลา</th><th>สถานะ</th><th>ที่เก็บ</th><th>หมายเหตุ</th></tr>
                        </thead>
                        <tbody>
                            {historyLoading ? <tr><td colSpan="4" className="text-center py-3">กำลังโหลด...</td></tr> :
                             historyLogs.length === 0 ? <tr><td colSpan="4" className="text-center py-3 text-muted">ไม่พบประวัติ</td></tr> :
                             historyLogs.map((log, i) => (
                                <tr key={i}>
                                    <td>{new Date(log[5]).toLocaleDateString('th-TH')} <span className="text-muted small">{log[6] && String(log[6]).substring(0,5)}</span></td>
                                    <td><span className="badge bg-secondary">{log[3]}</span></td>
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
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
            background-color: #f8f9fa !important;
            box-shadow: inset 0 0 0 9999px rgba(0,0,0,0.02);
        }
        .dashed-border {
            border-style: dashed !important;
        }
      `}</style>
    </div>
  );
};

export default InventoryTable;