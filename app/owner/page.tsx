'use client';

import React, { useState, useEffect } from 'react';
import { loginOwnerDashboard, getOwnerPropertyDetails, createProperty, updateProperty, updateTenantData, deleteTenant, updateHouseRules, updateTenantPaymentStatus, addPropertyExpense, deletePropertyExpense, getOwnerAuditLogs } from '../../src/actions/checkin-tenant';

function cleanDigits(p?: string) { return p ? p.replace(/\D/g, '') : ''; }
function isPhoneMatch(a?: string, b?: string) { const x=cleanDigits(a); const y=cleanDigits(b); if(!x||!y) return false; return (x.length>=8?x.slice(-9):x) === (y.length>=8?y.slice(-9):y); }
function parseRoomNumber(r?: string) { if(!r) return null; const m=r.match(/(?:kamar|unit|no\.?)\s*(\d+)/i)||r.match(/^(\d+)/); return m ? parseInt(m[1],10) : null; }

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'penyewa'|'matrix'|'pengeluaran'|'audit'>('penyewa');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState(''); const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false); const [loginError, setLoginError] = useState('');
  
  const [myProperties, setMyProperties] = useState<any[]>([]); const [activeProperty, setActiveProperty] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]); const [expenses, setExpenses] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals
  const [showAddPropModal, setShowAddPropModal] = useState(false); const [editingProperty, setEditingProperty] = useState<any>(null);
  const [propName, setPropName] = useState(''); const [propType, setPropType] = useState<'kos'|'kontrakan'>('kos'); const [propTotalRooms, setPropTotalRooms] = useState(10); const [propOwnerName, setPropOwnerName] = useState(''); const [propOwnerPhone, setPropOwnerPhone] = useState(''); const [propManagerName, setPropManagerName] = useState(''); const [propManagerPhone, setPropManagerPhone] = useState(''); const [propBankName, setPropBankName] = useState('BCA'); const [propBankAcc, setPropBankAcc] = useState(''); const [propBankHolder, setPropBankHolder] = useState(''); const [propAddress, setPropAddress] = useState(''); const [propPin, setPropPin] = useState(''); const [submittingProp, setSubmittingProp] = useState(false);
  
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false); const [expenseTitle, setExpenseTitle] = useState(''); const [expenseCategory, setExpenseCategory] = useState('Listrik'); const [expenseAmount, setExpenseAmount] = useState(''); const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10)); const [savingExpense, setSavingExpense] = useState(false);
  
  const [editingTenant, setEditingTenant] = useState<any>(null); const [tenantName, setTenantName] = useState(''); const [tenantRoom, setTenantRoom] = useState(''); const [tenantRentPrice, setTenantRentPrice] = useState('1500000'); const [savingTenant, setSavingTenant] = useState(false);

  const [editingRulesProp, setEditingRulesProp] = useState<any>(null); const [rulesText, setRulesText] = useState(''); const [savingRules, setSavingRules] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setLoginError('');
    const res = await loginOwnerDashboard(loginPhone, loginPin); setLoginLoading(false);
    if(res.success && res.properties && res.properties.length > 0) { 
      setMyProperties(res.properties); setIsLoggedIn(true); setActiveProperty(res.initialDetails?.property); setTenants(res.initialDetails?.tenants||[]); setExpenses(res.initialDetails?.expenses||[]); 
      const al = await getOwnerAuditLogs(); setAuditLogs(al.logs||[]); 
    } else { setLoginError('Login gagal. Nomor belum terdaftar atau PIN salah.'); }
  };

  const handleSelectProperty = async (prop: any) => { setActiveProperty(prop); const d = await getOwnerPropertyDetails(prop.id); if (d.success) { setTenants(d.tenants||[]); setExpenses(d.expenses||[]); } };

  const handleHardDeleteTenant = async (id: string, name: string) => {
    const confirmation = prompt(`PERINGATAN: Ketik "HAPUS" untuk menghapus permanen data ${name}:`);
    if (confirmation === 'HAPUS') { setTenants(prev => prev.filter(t => t.id !== id)); await deleteTenant(id); }
  };

  // Toggle Tanpa Reload
  const handleTogglePayment = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    setTenants(prev => prev.map(t => t.id === id ? { ...t, payment_status: newStatus } : t));
    await updateTenantPaymentStatus(id, newStatus);
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Hapus pengeluaran "${title}"?`)) { setExpenses(expenses.filter((e) => e.id !== id)); await deletePropertyExpense(id); }
  };

  const handlePropFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmittingProp(true);
    if (editingProperty) {
      await updateProperty(editingProperty.id, { name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin });
      setShowAddPropModal(false); alert('Disimpan.'); window.location.reload();
    } else {
      await createProperty(propName, propType, propAddress, '', propPin, propOwnerName||loginPhone, propOwnerPhone||loginPhone, propManagerName, propManagerPhone, propTotalRooms, propBankName, propBankAcc, propBankHolder);
      setShowAddPropModal(false); alert('Berhasil daftar!'); window.location.reload();
    }
  };

  const handleSaveRules = async () => {
    if (!editingRulesProp) return; setSavingRules(true);
    const res = await updateHouseRules(editingRulesProp.id, rulesText); setSavingRules(false);
    if (res.success) { alert('Tata tertib diperbarui.'); setEditingRulesProp(null); if (activeProperty) setActiveProperty({ ...activeProperty, house_rules: rulesText }); }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingExpense(true); const parsed = parseInt(expenseAmount.replace(/\D/g,''),10)||0;
    const res = await addPropertyExpense(activeProperty.id, expenseTitle, expenseCategory, parsed, expenseDate);
    setSavingExpense(false); if(res.success && res.data){ setExpenses([res.data, ...expenses]); setShowAddExpenseModal(false); }
  };

  const handleSaveTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingTenant(true); const parsed = parseInt(tenantRentPrice.replace(/\D/g,''),10)||0;
    const res = await updateTenantData(editingTenant.id, { name: tenantName, room_number: tenantRoom, rent_price: parsed });
    setSavingTenant(false); if(res.success){ setTenants(prev=>prev.map(t=>t.id===editingTenant.id?{...t, name:tenantName, room_number:tenantRoom, rent_price:parsed}:t)); setEditingTenant(null); }
  };

  const handleExportOwner = () => {
    const rows = tenants.map(t => [`"${t.name||""}"`, `"${t.phone||""}"`, `"${t.room_number||""}"`, `"${t.entry_date||""}"`, `"${t.status||""}"`, `"${t.is_head ? t.rent_price : 0}"`, `"${t.is_head ? t.payment_status : '-'}"`]);
    const csv = [["Nama", "WA", "Kamar", "Tgl Masuk", "Status RT", "Harga Sewa", "Status Bayar"].join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Laporan_Penyewa_Kos.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleExportAudit = () => {
    const rows = auditLogs.map(l => [`"${new Date(l.created_at).toLocaleString()}"`, `"${l.action_type}"`, `"${l.performed_by}"`, `"${l.details}"`]);
    const csv = [["Waktu", "Aksi", "Pelaksana", "Detail"].join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Laporan_Audit_Kos.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleSendReminderWA = (t: any) => {
    const rawPhone = (t.phone || '').replace(/\D/g, ''); const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const message = `Halo Kak *${t.name}*,\nMengingatkan tagihan sewa *${activeProperty.name}* (${t.room_number}) sebesar *Rp ${Number(t.rent_price || 0).toLocaleString('id-ID')}*. Terima kasih.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const isOwner = isPhoneMatch(loginPhone, activeProperty?.owner_phone);
  const activeLoginName = isOwner ? (activeProperty?.owner_name || 'Owner') : (activeProperty?.manager_name || 'Pengelola');
  const totalRooms = activeProperty?.total_rooms || 10;
  const occupiedRoomSet = new Set<string>();
  tenants.forEach(t => { if(t.status==='ACTIVE'||t.status==='VERIFIED'||t.status==='PENDING') { const pn=parseRoomNumber(t.room_number); if(pn!==null) occupiedRoomSet.add(`r-${pn}`); else if(t.room_number) occupiedRoomSet.add(t.room_number); } });
  
  const countActive = occupiedRoomSet.size; 
  const totalRent = tenants.filter(t=>t.is_head && t.payment_status==='PAID').reduce((s,t)=>s+(Number(t.rent_price)||0),0); 
  const totalExp = expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);

  return (
    <>
      {!isLoggedIn ? (
        <main className="min-h-screen bg-slate-50 p-4 font-sans flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-sm border max-w-sm w-full space-y-6">
            <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center text-3xl mx-auto border">🏢</div>
            <h2 className="text-xl font-black text-center">Masuk Dasbor Pemilik</h2>
            {loginError && <div className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border-red-200 font-bold">{loginError}</div>}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input type="tel" required placeholder="No WA Terdaftar" value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} className="w-full p-3.5 border rounded-xl font-mono text-sm font-bold bg-slate-50" />
              <input type="password" required maxLength={4} placeholder="PIN" value={loginPin} onChange={e=>setLoginPin(e.target.value.replace(/\D/g,''))} className="w-full p-3.5 border rounded-xl text-center text-xl tracking-[0.5em] font-black bg-slate-50" />
              <button type="submit" disabled={loginLoading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl">Buka Dasbor</button>
            </form>
            <div className="pt-4 border-t text-center"><button type="button" onClick={()=>{setEditingProperty(null); setPropName(''); setShowAddPropModal(true);}} className="text-xs font-bold text-slate-600 hover:text-emerald-700">➕ Daftarkan Kos Baru</button></div>
          </div>
        </main>
      ) : (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-20">
          <div className="max-w-5xl mx-auto space-y-6">
            
            <header className="bg-white p-5 rounded-3xl shadow-sm border flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h1 className="text-xl font-black">Dasbor Kos</h1>
                <div className="flex items-center gap-2 mt-2">
                  <select value={activeProperty?.id||''} onChange={e=>{const s=myProperties.find(p=>p.id===e.target.value); if(s)handleSelectProperty(s);}} className="p-2 border rounded-lg text-sm font-bold bg-slate-50">
                    {myProperties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded uppercase ${isOwner?'bg-amber-100 text-amber-900':'bg-blue-100 text-blue-900'}`}>{isOwner?'👑 OWNER':'🔑 PENGELOLA'}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-bold">Login Aktif: {activeLoginName} ({loginPhone})</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <>
                    <button onClick={()=>{setEditingProperty(null); setPropName(''); setShowAddPropModal(true);}} className="px-3 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg">➕ Tambah Kos</button>
                    <button onClick={()=>{setEditingProperty(activeProperty); setPropName(activeProperty.name); setPropTotalRooms(activeProperty.total_rooms||10); setPropAddress(activeProperty.address||''); setPropOwnerPhone(activeProperty.owner_phone||''); setPropManagerPhone(activeProperty.manager_phone||''); setPropBankName(activeProperty.bank_name||''); setPropBankAcc(activeProperty.bank_account_number||''); setPropPin(activeProperty.pin_code||''); setShowAddPropModal(true);}} className="px-3 py-2 bg-white border text-slate-800 text-xs font-bold rounded-lg">✏️ Edit Kos</button>
                    <button onClick={()=>{setEditingRulesProp(activeProperty); setRulesText(activeProperty.house_rules||'');}} className="px-3 py-2 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg">📜 Tata Tertib</button>
                  </>
                )}
                {/* FIX: KLIK KELUAR KE HOME */}
                <button onClick={()=>{window.location.href='/';}} className="px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg">🔒 Keluar</button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl"><p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Pemasukan Sewa</p><h3 className="text-2xl font-black text-emerald-950">Rp {totalRent.toLocaleString('id-ID')}</h3></div>
              <div className="bg-red-50 border border-red-200 p-6 rounded-3xl"><p className="text-[10px] font-black text-red-800 uppercase mb-1">Pengeluaran Kas</p><h3 className="text-2xl font-black text-red-950">Rp {totalExp.toLocaleString('id-ID')}</h3></div>
              {isOwner ? (
                <div className="bg-white border border-amber-300 p-6 rounded-3xl shadow-sm"><p className="text-[10px] font-black text-amber-600 uppercase mb-1">Laba Bersih Kos</p><h3 className="text-2xl font-black">Rp {(totalRent-totalExp).toLocaleString('id-ID')}</h3><p className="text-[10px] text-slate-500 mt-1">Okupansi: {countActive}/{totalRooms}</p></div>
              ) : (<div className="bg-slate-100 border p-6 rounded-3xl flex items-center justify-center"><p className="text-xs font-black text-slate-500">🔒 Khusus Owner</p></div>)}
            </div>

            <div className="flex gap-2 overflow-x-auto border-b pb-1">
              <button onClick={()=>setActiveTab('penyewa')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='penyewa'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>👥 Daftar Penyewa</button>
              <button onClick={()=>setActiveTab('matrix')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='matrix'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>🏠 Matrix Kamar</button>
              <button onClick={()=>setActiveTab('pengeluaran')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='pengeluaran'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>📉 Pengeluaran</button>
              {isOwner && <button onClick={()=>setActiveTab('audit')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='audit'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>📋 Jejak Audit</button>}
            </div>

            {/* TAB PENYEWA */}
            {activeTab === 'penyewa' && (
               <div className="bg-white p-5 rounded-b-3xl rounded-tr-3xl border -mt-1 space-y-4">
                 <div className="flex justify-between items-center border-b pb-3">
                   <h3 className="font-black text-lg">Daftar Penghuni</h3>
                   <div className="flex gap-2">
                     {isOwner&&<button onClick={handleExportOwner} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hidden md:block">📥 Export CSV</button>}
                   </div>
                 </div>
                 
                 {/* Card Mobile */}
                 <div className="grid grid-cols-1 md:hidden gap-4">
                   {tenants.map(t => (
                     <div key={t.id} className="bg-white p-5 border rounded-2xl shadow-sm space-y-3">
                       <div className="flex justify-between">
                         <div>
                           <h4 className="font-black text-base">{t.name}</h4>
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded ${t.is_head?'bg-amber-100 text-amber-900':'bg-slate-100 text-slate-600'}`}>{t.is_head?'Penanggung Jawab':'Anggota'}</span>
                         </div>
                         {t.is_head && <button onClick={()=>handleTogglePayment(t.id, t.payment_status)} className={`text-[10px] font-black px-2 py-1 rounded border h-fit ${t.payment_status==='PAID'?'bg-emerald-50 text-emerald-800':'bg-red-50 text-red-800'}`}>{t.payment_status==='PAID'?'✓ LUNAS':'✗ BELUM BAYAR'}</button>}
                       </div>
                       <div className="flex justify-between items-center pt-3 border-t">
                         <span className="font-mono font-black text-sm">{t.is_head ? `Rp ${Number(t.rent_price).toLocaleString()}` : '-'}</span>
                         <div className="flex gap-2">
                           {t.is_head && t.payment_status !== 'PAID' && <button onClick={()=>handleSendReminderWA(t)} className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg">Tagih</button>}
                           <button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg">Edit</button>
                           <button onClick={()=>handleHardDeleteTenant(t.id, t.name)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Hapus</button>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>

                 {/* Table Desktop */}
                 <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black"><tr><th className="p-4">Identitas Penyewa</th><th className="p-4">Kamar</th><th className="p-4">Status Tagihan</th><th className="p-4">Harga Sewa</th><th className="p-4">Status RT</th><th className="p-4 text-right">Aksi</th></tr></thead>
                    <tbody className="divide-y">
                      {tenants.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-4"><div className="font-black text-base">{t.name}</div><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.is_head?'bg-amber-100 text-amber-900':'bg-slate-100 text-slate-600'}`}>{t.is_head?'Penanggung Jawab':'Anggota'}</span></td>
                          <td className="p-4 font-bold">{t.room_number}</td>
                          <td className="p-4">{t.is_head ? <button onClick={()=>handleTogglePayment(t.id, t.payment_status)} className={`px-2 py-1 rounded text-[10px] font-black border ${t.payment_status==='PAID'?'bg-emerald-50 text-emerald-800':'bg-red-50 text-red-800'}`}>{t.payment_status==='PAID'?'LUNAS':'BELUM'}</button> : '-'}</td>
                          <td className="p-4 font-mono font-bold">{t.is_head ? `Rp ${Number(t.rent_price).toLocaleString()}` : '-'}</td>
                          <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-black ${t.status==='VERIFIED'||t.status==='ACTIVE'?'bg-emerald-100':'bg-amber-100'}`}>{t.status==='VERIFIED'||t.status==='ACTIVE'?'✅ Sah':'⏳ Menunggu'}</span></td>
                          <td className="p-4 text-right space-x-2">
                            {t.is_head && t.payment_status !== 'PAID' && <button onClick={()=>handleSendReminderWA(t)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">Tagih</button>}
                            <button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="px-3 py-1.5 border text-xs font-bold rounded-lg">Edit</button>
                            <button onClick={()=>handleHardDeleteTenant(t.id, t.name)} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody></table>
                 </div>
               </div>
            )}

            {/* TAB MATRIX DENGAN IKON */}
            {activeTab === 'matrix' && (
              <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border space-y-4 -mt-1">
                <h3 className="font-black text-lg border-b pb-2">Matrix Okupansi Kamar</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: totalRooms }).map((_, i) => {
                    const target = i+1; const lbl = `Kamar ${String(target).padStart(2,'0')}`;
                    const occ = tenants.find(t => parseRoomNumber(t.room_number) === target);
                    return (
                      <div key={i} className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 ${occ ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-dashed border-slate-300'}`}>
                        <span className="text-2xl">{occ ? '✅' : '➖'}</span>
                        <span className="font-black text-sm">{lbl}</span>
                        <span className="text-xs text-slate-500 font-bold">{occ ? occ.name : 'Kosong'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB PENGELUARAN */}
            {activeTab === 'pengeluaran' && (
               <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border space-y-4 -mt-1">
                 <div className="flex justify-between items-center border-b pb-3">
                   <h3 className="font-black text-lg">Buku Kas Keluar</h3>
                   <button onClick={()=>setShowAddExpenseModal(true)} className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-xl">➕ Catat</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {expenses.map(e => (
                     <div key={e.id} className="p-4 border rounded-xl flex justify-between items-center bg-slate-50">
                       <div><p className="text-[10px] font-black text-slate-400 uppercase">{e.expense_date} • {e.category}</p><h4 className="font-black text-base">{e.title}</h4></div>
                       <div className="text-right flex flex-col items-end"><p className="font-mono font-black text-red-600">-Rp {Number(e.amount).toLocaleString()}</p><button onClick={()=>handleDeleteExpense(e.id, e.title)} className="text-[10px] text-red-500 font-bold mt-2 uppercase">Hapus</button></div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {/* TAB AUDIT OWNER */}
            {activeTab === 'audit' && isOwner && (
               <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border space-y-4 -mt-1">
                 <div className="flex justify-between items-center border-b pb-3">
                   <h3 className="font-black text-lg">Jejak Audit Sistem</h3>
                   <button onClick={handleExportAudit} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">📥 Export Audit</button>
                 </div>
                 <div className="space-y-3 pt-2">
                   {auditLogs.map(l => (
                     <div key={l.id} className="p-4 border rounded-xl text-sm bg-slate-50 flex flex-col md:flex-row gap-2 shadow-sm">
                       <span className="text-[10px] text-slate-500 font-mono font-bold md:w-32">{new Date(l.created_at).toLocaleString('id-ID')}</span>
                       <div className="flex-1"><p className="font-black text-sm">{l.action_type}</p><p className="text-xs text-slate-600">{l.details}</p></div>
                     </div>
                   ))}
                   {auditLogs.length === 0 && <p className="text-center text-sm text-slate-500 font-bold py-4">Belum ada riwayat aktivitas yang terekam.</p>}
                 </div>
               </div>
            )}

          </div>
        </main>
      )}

      {/* 1. Modal Form Properti */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border">
            <div className="p-5 bg-slate-900 text-white flex justify-between sticky top-0 z-10"><h3 className="font-black">{editingProperty ? 'Edit Properti' : 'Pendaftaran Kos Baru'}</h3><button onClick={()=>{setShowAddPropModal(false);setEditingProperty(null);}} className="font-bold text-xl">✕</button></div>
            <form onSubmit={handlePropFormSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <input type="text" required placeholder="Nama Kos / Properti" value={propName} onChange={e=>setPropName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white" />
              <input type="number" required placeholder="Total Kamar" value={propTotalRooms} onChange={e=>setPropTotalRooms(parseInt(e.target.value,10)||1)} className="w-full p-3 border rounded-xl font-bold bg-white" />
              <input type="text" placeholder="Alamat Kos Lengkap" value={propAddress} onChange={e=>setPropAddress(e.target.value)} className="w-full p-3 border rounded-xl bg-white" />
              <div className="p-4 border rounded-xl space-y-2"><p className="text-xs font-bold">Akses No WA:</p><input type="tel" placeholder="WA Owner" value={propOwnerPhone} onChange={e=>setPropOwnerPhone(e.target.value)} className="w-full p-2 border rounded font-mono" /><input type="tel" placeholder="WA Pengelola" value={propManagerPhone} onChange={e=>setPropManagerPhone(e.target.value)} className="w-full p-2 border rounded font-mono" /></div>
              <input type="text" maxLength={4} required placeholder="Buat PIN 4 Digit" value={propPin} onChange={e=>setPropPin(e.target.value.replace(/\D/g,''))} className="w-full p-4 border border-slate-400 rounded-2xl font-mono text-center tracking-[0.8em] font-black text-2xl bg-white" />
              <button type="submit" disabled={submittingProp} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl">Simpan Data</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Edit Penyewa */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><h3 className="font-black text-base">Edit Data Sewa</h3><button onClick={()=>setEditingTenant(null)} className="text-xl">✕</button></div>
            <form onSubmit={handleSaveTenantSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <div><label className="font-bold text-xs">Nama Penyewa</label><input type="text" value={tenantName} onChange={e=>setTenantName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white" /></div>
              <div><label className="font-bold text-xs">No Kamar / Unit</label><input type="text" value={tenantRoom} onChange={e=>setTenantRoom(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white" /></div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <label className="font-black text-xs text-emerald-900 block mb-2 uppercase tracking-wider">Harga Sewa Per Bulan (Rp)</label>
                <input type="text" required value={tenantRentPrice} onChange={e=>setTenantRentPrice(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-emerald-400 rounded-xl font-mono font-black text-xl bg-white text-emerald-900" />
              </div>
              <button type="submit" disabled={savingTenant} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl">Simpan Perubahan</button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Tambah Pengeluaran */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border">
            <div className="p-5 bg-red-600 text-white flex justify-between items-center"><h3 className="font-black text-base">Catat Pengeluaran</h3><button onClick={()=>setShowAddExpenseModal(false)} className="text-xl">✕</button></div>
            <form onSubmit={handleAddExpenseSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <input type="text" required placeholder="Cth: Bayar Listrik" value={expenseTitle} onChange={e=>setExpenseTitle(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white" />
              <div className="flex gap-3">
                <select value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)} className="flex-1 p-3 border rounded-xl bg-white"><option>Listrik</option><option>Air</option><option>Perbaikan</option><option>Lainnya</option></select>
                <input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} className="flex-1 p-3 border rounded-xl bg-white" />
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <label className="font-black text-xs text-red-900 block mb-2 uppercase">Total Nominal (Rp)</label>
                <input type="text" required placeholder="0" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-red-400 rounded-xl font-mono font-black text-2xl bg-white text-red-700" />
              </div>
              <button type="submit" disabled={savingExpense} className="w-full py-4 bg-red-600 text-white font-black rounded-xl">Simpan ke Buku Kas</button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Tata Tertib */}
      {editingRulesProp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border">
            <div className="p-4 bg-amber-100 text-amber-900 flex justify-between"><h3 className="font-bold">📜 Edit Tata Tertib</h3><button onClick={() => setEditingRulesProp(null)} className="text-xl font-bold">✕</button></div>
            <div className="p-4 bg-slate-50"><textarea rows={7} value={rulesText} onChange={(e) => setRulesText(e.target.value)} className="w-full p-3 border rounded-2xl font-mono text-sm outline-none"></textarea></div>
            <div className="p-4 bg-slate-100 flex justify-end"><button onClick={handleSaveRules} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl">Simpan Aturan</button></div>
          </div>
        </div>
      )}

    </>
  );
}