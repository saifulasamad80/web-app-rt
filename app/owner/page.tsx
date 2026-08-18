'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loginOwnerDashboard, getOwnerPropertyDetails, createProperty, updateProperty, updateTenantData, deleteTenant, updateHouseRules, updateTenantPaymentStatus, addPropertyExpense, deletePropertyExpense, getOwnerAuditLogs } from '../../src/actions/checkin-tenant';

function cleanDigits(p?: string) { return p ? p.replace(/\D/g, '') : ''; }
function isPhoneMatch(a?: string, b?: string) { const x=cleanDigits(a); const y=cleanDigits(b); if(!x||!y) return false; return (x.length>=8?x.slice(-9):x) === (y.length>=8?y.slice(-9):y); }
function parseRoomNumber(r?: string) { if(!r) return null; const m=r.match(/(?:kamar|unit|no\.?)\s*(\d+)/i)||r.match(/^(\d+)/); return m ? parseInt(m[1],10) : null; }

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'penyewa'|'matrix'|'pengeluaran'|'audit'>('penyewa');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState(''); const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false); const [loginError, setLoginError] = useState('');
  
  const [myProperties, setMyProperties] = useState<any[]>([]); 
  const [activeProperty, setActiveProperty] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]); 
  const [expenses, setExpenses] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals state
  const [showAddPropModal, setShowAddPropModal] = useState(false); 
  const [editingProperty, setEditingProperty] = useState<any>(null);
  
  const [propName, setPropName] = useState(''); const [propType, setPropType] = useState<'kos'|'kontrakan'>('kos'); const [propTotalRooms, setPropTotalRooms] = useState(10); const [propOwnerName, setPropOwnerName] = useState(''); const [propOwnerPhone, setPropOwnerPhone] = useState(''); const [propManagerName, setPropManagerName] = useState(''); const [propManagerPhone, setPropManagerPhone] = useState(''); const [propBankName, setPropBankName] = useState('BCA'); const [propBankAcc, setPropBankAcc] = useState(''); const [propBankHolder, setPropBankHolder] = useState(''); const [propAddress, setPropAddress] = useState(''); const [propPin, setPropPin] = useState(''); const [submittingProp, setSubmittingProp] = useState(false);
  
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false); const [expenseTitle, setExpenseTitle] = useState(''); const [expenseCategory, setExpenseCategory] = useState('Listrik'); const [expenseAmount, setExpenseAmount] = useState(''); const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10)); const [savingExpense, setSavingExpense] = useState(false);
  
  const [editingTenant, setEditingTenant] = useState<any>(null); const [tenantName, setTenantName] = useState(''); const [tenantRoom, setTenantRoom] = useState(''); const [tenantRentPrice, setTenantRentPrice] = useState('1500000'); const [savingTenant, setSavingTenant] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setLoginError('');
    const res = await loginOwnerDashboard(loginPhone, loginPin);
    setLoginLoading(false);
    if(res.success && res.properties && res.properties.length > 0) { 
      setMyProperties(res.properties); setIsLoggedIn(true); setActiveProperty(res.initialDetails?.property); setTenants(res.initialDetails?.tenants||[]); setExpenses(res.initialDetails?.expenses||[]); 
      const al = await getOwnerAuditLogs(); setAuditLogs(al.logs||[]); 
    }
    else {
      setLoginError(res.error || 'Login gagal. Jika Anda pengguna baru, silakan daftarkan properti kos Anda terlebih dahulu di bawah.');
    }
  };

  const handleSelectProperty = async (prop: any) => { setActiveProperty(prop); const d = await getOwnerPropertyDetails(prop.id); if (d.success) { setTenants(d.tenants||[]); setExpenses(d.expenses||[]); } };

  // UX Feedback: Hard prompt delete
  const handleHardDeleteTenant = async (id: string, name: string) => {
    const confirmation = prompt(`PERINGATAN: Tindakan ini menghapus seluruh catatan sewa orang ini.\n\nKetik "HAPUS" (huruf besar) untuk menghapus data ${name}:`);
    if (confirmation === 'HAPUS') { setTenants(prev => prev.filter(t => t.id !== id)); await deleteTenant(id); alert('Data penyewa berhasil dihapus dari sistem.'); }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Hapus catatan pengeluaran "${title}" dari buku kas?`)) { setExpenses(expenses.filter((e) => e.id !== id)); await deletePropertyExpense(id); }
  };

  const handlePropFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmittingProp(true);
    if (editingProperty) {
      await updateProperty(editingProperty.id, { name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin });
      setShowAddPropModal(false); alert('Data properti berhasil diperbarui.'); window.location.reload();
    } else {
      await createProperty(propName, propType, propAddress, '', propPin, propOwnerName||loginPhone, propOwnerPhone||loginPhone, propManagerName, propManagerPhone, propTotalRooms, propBankName, propBankAcc, propBankHolder);
      setShowAddPropModal(false); alert('Properti berhasil didaftarkan! Silakan Login menggunakan nomor WA dan PIN Anda.'); window.location.reload();
    }
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

  // FITUR EXCEL
  const handleExportOwner = () => {
    const rows = tenants.map(t => [`"${t.name||""}"`, `"${t.phone||""}"`, `"${t.room_number||""}"`, `"${t.entry_date||""}"`, `"${t.status||""}"`, `"${t.rent_price||0}"`, `"${t.payment_status||""}"`]);
    const csv = [["Nama", "WA", "Kamar", "Tgl Masuk", "Status RT", "Harga Sewa", "Status Bayar"].join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Laporan_Kos_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleShareWA = (prop: any) => {
    const checkinUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/checkin/' + prop.slug;
    const message = `Halo calon penghuni *${prop.name || prop.property_name}*,\n\nMohon lengkapi lapor diri digital melalui tautan ini:\n\n👉 ${checkinUrl}\n\nTerima kasih.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const isOwner = isPhoneMatch(loginPhone, activeProperty?.owner_phone);
  const activeLoginName = isOwner ? (activeProperty?.owner_name || 'Pemilik Sah') : (activeProperty?.manager_name || 'Pengelola');
  const totalRooms = activeProperty?.total_rooms || 10;
  const occupiedRoomSet = new Set<string>();
  tenants.forEach(t => { if(t.status==='ACTIVE'||t.status==='VERIFIED'||t.status==='PENDING') { const pn=parseRoomNumber(t.room_number); if(pn!==null) occupiedRoomSet.add(`r-${pn}`); else if(t.room_number) occupiedRoomSet.add(t.room_number); } });
  
  const countActive = occupiedRoomSet.size; 
  const totalRent = tenants.filter(t=>t.payment_status==='PAID').reduce((s,t)=>s+(Number(t.rent_price)||0),0); 
  const totalExp = expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);

  return (
    <>
      {!isLoggedIn ? (
        <main className="min-h-screen bg-slate-50 p-4 font-sans flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full space-y-6">
            <div className="w-20 h-20 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner border border-slate-100">🏢</div>
            <div>
              <h2 className="text-xl font-black text-center text-slate-900">Dasbor Manajemen Kos</h2>
              <p className="text-xs text-center text-slate-500 mt-1">Masuk khusus Pemilik & Pengelola.</p>
            </div>
            {loginError && <div className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 font-bold leading-relaxed">{loginError}</div>}
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Terdaftar</label>
                <input type="tel" required placeholder="08xxxxxxxx" value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} className="w-full p-3.5 border rounded-xl font-mono text-sm focus:border-emerald-500 outline-none font-bold bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Akses Unit</label>
                <input type="password" required maxLength={4} placeholder="• • • •" value={loginPin} onChange={e=>setLoginPin(e.target.value.replace(/\D/g,''))} className="w-full p-3.5 border rounded-xl text-center text-xl tracking-[0.5em] font-black focus:border-emerald-500 outline-none bg-slate-50" />
              </div>
              <button type="submit" disabled={loginLoading} className="w-full py-4 bg-emerald-700 text-white font-black rounded-xl cursor-pointer hover:bg-emerald-800 transition-colors shadow-md mt-2">{loginLoading?'Memproses...':'Buka Dasbor'}</button>
            </form>
            
            {/* TOMBOL PENDAFTARAN (MUTLAK HARUS ADA) */}
            <div className="pt-5 border-t border-slate-200 text-center">
              <button type="button" onClick={()=>{setEditingProperty(null); setPropName(''); setPropAddress(''); setPropOwnerPhone(''); setPropManagerPhone(''); setPropPin(''); setShowAddPropModal(true);}} className="text-[0.85rem] font-black text-slate-600 hover:text-emerald-700 cursor-pointer transition-colors p-2">
                ➕ Daftarkan Properti Kos Baru
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-20">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* HEADER CONTROLS */}
            <header className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900">Dasbor Kos</h1>
                <div className="flex items-center gap-3 mt-2">
                  <select value={activeProperty?.id||''} onChange={e=>{const s=myProperties.find(p=>p.id===e.target.value); if(s)handleSelectProperty(s);}} className="p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-emerald-500 cursor-pointer">
                    {myProperties.map(p=><option key={p.id} value={p.id}>🏠 {p.name || p.property_name}</option>)}
                  </select>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase ${isOwner?'bg-amber-100 text-amber-900 border border-amber-300':'bg-blue-100 text-blue-900 border border-blue-300'}`}>{isOwner?'👑 Owner':'🔑 Pengelola'}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-bold">Login Aktif: {activeLoginName} ({loginPhone})</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <>
                    <button onClick={()=>{setEditingProperty(null); setPropName(''); setShowAddPropModal(true);}} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm">➕ Tambah Kos</button>
                    <button onClick={()=>{setEditingProperty(activeProperty); setPropName(activeProperty.name||activeProperty.property_name); setPropTotalRooms(activeProperty.total_rooms||10); setPropAddress(activeProperty.address||''); setPropOwnerName(activeProperty.owner_name||''); setPropOwnerPhone(activeProperty.owner_phone||''); setPropManagerName(activeProperty.manager_name||''); setPropManagerPhone(activeProperty.manager_phone||''); setPropBankName(activeProperty.bank_name||''); setPropBankAcc(activeProperty.bank_account_number||''); setPropBankHolder(activeProperty.bank_account_holder||''); setPropPin(activeProperty.pin_code||''); setShowAddPropModal(true);}} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors">✏️ Edit Kos</button>
                  </>
                )}
                <button onClick={()=>window.location.reload()} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl cursor-pointer transition-colors">🔒 Keluar</button>
              </div>
            </header>

            {/* HERO CARDS - LABA BERSIH HANYA UNTUK OWNER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl shadow-sm"><p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Pemasukan Sewa Lunas</p><h3 className="text-2xl font-black text-emerald-950">Rp {totalRent.toLocaleString('id-ID')}</h3></div>
              <div className="bg-red-50 border border-red-200 p-6 rounded-3xl shadow-sm"><p className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-1">Total Pengeluaran Kas</p><h3 className="text-2xl font-black text-red-950">Rp {totalExp.toLocaleString('id-ID')}</h3></div>
              
              {isOwner ? (
                <div className="bg-white border border-amber-300 p-6 rounded-3xl shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">💰</div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Laba Bersih Kos</p>
                  <h3 className="text-2xl font-black text-slate-900">Rp {(totalRent-totalExp).toLocaleString('id-ID')}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">Okupansi: {countActive}/{totalRooms} Unit Terisi</p>
                </div>
              ) : (
                <div className="bg-slate-100 border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-center">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">🔒 Laba Khusus Owner</p>
                </div>
              )}
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-1 pt-2">
              <button onClick={()=>setActiveTab('penyewa')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap cursor-pointer transition-colors ${activeTab==='penyewa'?'bg-white border-t border-l border-r border-slate-200 text-emerald-800 shadow-sm relative top-[1px]':'bg-transparent text-slate-500 hover:bg-slate-100'}`}>👥 Daftar Penyewa</button>
              <button onClick={()=>setActiveTab('matrix')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap cursor-pointer transition-colors ${activeTab==='matrix'?'bg-white border-t border-l border-r border-slate-200 text-emerald-800 shadow-sm relative top-[1px]':'bg-transparent text-slate-500 hover:bg-slate-100'}`}>🏠 Matrix Kamar</button>
              <button onClick={()=>setActiveTab('pengeluaran')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap cursor-pointer transition-colors ${activeTab==='pengeluaran'?'bg-white border-t border-l border-r border-slate-200 text-emerald-800 shadow-sm relative top-[1px]':'bg-transparent text-slate-500 hover:bg-slate-100'}`}>📉 Pengeluaran</button>
              {isOwner && <button onClick={()=>setActiveTab('audit')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap cursor-pointer transition-colors ${activeTab==='audit'?'bg-white border-t border-l border-r border-slate-200 text-emerald-800 shadow-sm relative top-[1px]':'bg-transparent text-slate-500 hover:bg-slate-100'}`}>📋 Jejak Audit</button>}
            </div>

            {/* TAB 1: PENYEWA (UI/UX Feedback: Mobile Cards) */}
            {activeTab === 'penyewa' && (
               <div className="bg-white p-4 md:p-6 rounded-b-3xl rounded-tr-3xl shadow-sm border border-slate-200 animate-fade-in space-y-4 -mt-2">
                 <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                   <h3 className="font-black text-lg text-slate-900">Daftar Penghuni</h3>
                   <div className="flex gap-2">
                     <button onClick={()=>handleShareWA(activeProperty)} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg cursor-pointer transition-colors">💬 Link Check-in WA</button>
                     {isOwner&&<button onClick={handleExportOwner} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer hidden md:block shadow-sm">📥 Export CSV</button>}
                   </div>
                 </div>
                 
                 {/* CARD-BASED LAYOUT UNTUK MOBILE (< 768px) */}
                 <div className="grid grid-cols-1 md:hidden gap-4">
                   {tenants.map(t => (
                     <div key={t.id} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-3">
                       <div className="flex justify-between items-start">
                         <div>
                           <h4 className="font-black text-base text-slate-900">{t.name}</h4>
                           <div className="flex gap-2 mt-1 items-center">
                             <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">{t.room_number || 'Kamar -'}</span>
                             <span className="text-[10px] text-slate-400 font-bold">{t.entry_date}</span>
                           </div>
                         </div>
                         <button onClick={()=>updateTenantPaymentStatus(t.id, t.payment_status==='PAID'?'UNPAID':'PAID').then(()=>window.location.reload())} className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase border cursor-pointer ${t.payment_status==='PAID'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-red-50 text-red-800 border-red-200'}`}>
                           {t.payment_status==='PAID'?'✓ LUNAS':'✗ BELUM BAYAR'}
                         </button>
                       </div>
                       <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                         <div className="flex flex-col">
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tarif Sewa</span>
                           <span className="font-mono font-black text-sm text-slate-900">Rp {Number(t.rent_price||0).toLocaleString('id-ID')}</span>
                         </div>
                         <div className="flex gap-2">
                           <button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-200">Edit</button>
                           <button onClick={()=>handleHardDeleteTenant(t.id, t.name)} className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">Hapus</button>
                         </div>
                       </div>
                     </div>
                   ))}
                   {tenants.length === 0 && <div className="p-8 text-center text-slate-400 text-sm font-bold border-2 border-dashed rounded-2xl">Belum ada penyewa terdaftar.</div>}
                 </div>

                 {/* TABLE UNTUK DESKTOP (>= 768px) */}
                 <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider"><tr><th className="p-4 rounded-tl-xl">Identitas Penyewa</th><th className="p-4">Kamar</th><th className="p-4">Status Tagihan</th><th className="p-4">Harga Sewa</th><th className="p-4">Status Kependudukan</th><th className="p-4 text-right rounded-tr-xl">Aksi</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenants.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4"><div className="font-black text-slate-900 text-base">{t.name}</div><span className="block text-[10px] font-bold text-slate-500 mt-0.5">Tgl Masuk: {t.entry_date}</span></td>
                          <td className="p-4 font-bold text-slate-700">{t.room_number || '-'}</td>
                          <td className="p-4"><button onClick={()=>updateTenantPaymentStatus(t.id, t.payment_status==='PAID'?'UNPAID':'PAID').then(()=>window.location.reload())} className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider cursor-pointer border shadow-sm ${t.payment_status==='PAID'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-red-50 text-red-800 border-red-200'}`}>{t.payment_status==='PAID'?'✓ LUNAS':'✗ BELUM BAYAR'}</button></td>
                          <td className="p-4 font-mono text-slate-900 font-bold">Rp {Number(t.rent_price||0).toLocaleString('id-ID')}</td>
                          <td className="p-4"><span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${t.status==='VERIFIED'||t.status==='ACTIVE'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{t.status==='VERIFIED'||t.status==='ACTIVE'?'✅ Sah di RT':'⏳ Menunggu RT'}</span></td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer shadow-sm">Edit</button>
                            <button onClick={()=>handleHardDeleteTenant(t.id, t.name)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 cursor-pointer">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody></table>
                 </div>
               </div>
            )}

            {/* TAB 2: MATRIX DENGAN IKON (UI/UX Feedback: Aksesibilitas) */}
            {activeTab === 'matrix' && (
              <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border border-slate-200 shadow-sm space-y-4 animate-fade-in -mt-2">
                <h3 className="font-black text-lg text-slate-900 border-b border-slate-100 pb-2">Matrix Okupansi Kamar</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: totalRooms }).map((_, i) => {
                    const target = i+1; const lbl = `Kamar ${String(target).padStart(2,'0')}`;
                    const occ = tenants.find(t => parseRoomNumber(t.room_number) === target);
                    return (
                      <div key={i} className={`p-5 rounded-2xl border-2 flex flex-col items-center text-center gap-2 transition-all ${occ ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-dashed border-slate-300'}`}>
                        <span className="text-3xl mb-1">{occ ? '✅' : '➖'}</span>
                        <span className="font-black text-sm text-slate-900">{lbl}</span>
                        <span className="text-xs font-bold text-slate-500">{occ ? occ.name : 'Kosong'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: PENGELUARAN */}
            {activeTab === 'pengeluaran' && (
               <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border border-slate-200 shadow-sm space-y-4 animate-fade-in -mt-2">
                 <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                   <h3 className="font-black text-lg text-slate-900">Buku Kas Keluar</h3>
                   <button onClick={()=>setShowAddExpenseModal(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-colors">➕ Catat Pengeluaran</button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                   {expenses.map(e => (
                     <div key={e.id} className="p-5 border border-slate-200 rounded-2xl flex justify-between items-center bg-slate-50 shadow-sm">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{e.expense_date} • {e.category}</p>
                         <h4 className="font-black text-slate-900 text-base">{e.title}</h4>
                       </div>
                       <div className="text-right flex flex-col items-end">
                         <p className="font-mono font-black text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">-Rp {Number(e.amount).toLocaleString('id-ID')}</p>
                         <button onClick={()=>handleDeleteExpense(e.id, e.title)} className="text-[10px] text-red-500 hover:text-red-700 font-bold mt-2 cursor-pointer uppercase tracking-wider">Hapus Catatan</button>
                       </div>
                     </div>
                   ))}
                   {expenses.length === 0 && <div className="col-span-1 md:col-span-2 p-8 text-center text-slate-400 text-sm font-bold border-2 border-dashed rounded-2xl">Belum ada pengeluaran operasional dicatat.</div>}
                 </div>
               </div>
            )}

            {/* TAB 4: AUDIT OWNER */}
            {activeTab === 'audit' && isOwner && (
               <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border border-slate-200 shadow-sm space-y-4 animate-fade-in -mt-2">
                 <h3 className="font-black text-lg text-slate-900 border-b border-slate-100 pb-2">Jejak Audit Keamanan Sistem</h3>
                 <div className="space-y-3 pt-2">
                   {auditLogs.map(l => (
                     <div key={l.id} className="p-4 border border-slate-200 rounded-xl text-sm bg-slate-50 flex flex-col md:flex-row gap-2 md:gap-6 shadow-sm">
                       <span className="text-[10px] text-slate-500 font-mono font-bold w-full md:w-32 flex-shrink-0 pt-0.5">{new Date(l.created_at).toLocaleString('id-ID')}</span>
                       <div className="flex-1">
                         <p className="font-black text-slate-900 text-sm mb-0.5">{l.action_type}</p>
                         <p className="text-xs text-slate-600 leading-relaxed">{l.details}</p>
                       </div>
                     </div>
                   ))}
                   {auditLogs.length === 0 && <p className="text-center text-sm text-slate-500 font-bold py-6">Belum ada riwayat aktivitas yang terekam.</p>}
                 </div>
               </div>
            )}

          </div>
        </main>
      )}

      {/* MODAL POPUPS */}
      
      {/* 1. Modal Form Properti */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-slide-up">
            <div className="p-5 bg-slate-900 text-white flex justify-between sticky top-0 z-10"><h3 className="font-black text-lg">{editingProperty ? 'Edit Properti Kos' : 'Pendaftaran Kos Baru'}</h3><button onClick={()=>{setShowAddPropModal(false);setEditingProperty(null);}} className="font-bold cursor-pointer text-xl hover:text-red-400 transition-colors leading-none">✕</button></div>
            <form onSubmit={handlePropFormSubmit} className="p-6 space-y-5 text-sm bg-slate-50">
              
              <div className="space-y-4">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] border-b pb-1">Info Properti Dasar</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">Nama Kos *</label><input type="text" required placeholder="Cth: Kos Baing" value={propName} onChange={e=>setPropName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:border-emerald-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">Total Kamar *</label><input type="number" required placeholder="Cth: 10" value={propTotalRooms} onChange={e=>setPropTotalRooms(parseInt(e.target.value,10)||1)} className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:border-emerald-500" /></div>
                </div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label><input type="text" placeholder="Jalan, RT/RW, Kelurahan" value={propAddress} onChange={e=>setPropAddress(e.target.value)} className="w-full p-3 border rounded-xl bg-white outline-none focus:border-emerald-500" /></div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] border-b pb-1">Akses & Manajemen (No WA)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">WA Pemilik (Owner)</label><input type="tel" placeholder="08xxxxxxxx" value={propOwnerPhone} onChange={e=>setPropOwnerPhone(e.target.value.replace(/\D/g,''))} className="w-full p-2.5 border rounded-xl font-mono bg-white outline-none focus:border-emerald-500" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">WA Pengelola (Penjaga)</label><input type="tel" placeholder="08xxxxxxxx" value={propManagerPhone} onChange={e=>setPropManagerPhone(e.target.value.replace(/\D/g,''))} className="w-full p-2.5 border rounded-xl font-mono bg-white outline-none focus:border-emerald-500" /></div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px] border-b pb-1">Rekening Pembayaran Sewa</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1"><label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank</label><input type="text" placeholder="Cth: BCA" value={propBankName} onChange={e=>setPropBankName(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white font-bold outline-none focus:border-emerald-500" /></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label><input type="text" placeholder="Cth: 1234567890" value={propBankAcc} onChange={e=>setPropBankAcc(e.target.value.replace(/\D/g,''))} className="w-full p-2.5 border rounded-xl font-mono font-bold bg-white outline-none focus:border-emerald-500" /></div>
                </div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama (Pemilik Rekening)</label><input type="text" placeholder="Cth: Budi Santoso" value={propBankHolder} onChange={e=>setPropBankHolder(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:border-emerald-500" /></div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-black text-slate-900 mb-2 text-center uppercase tracking-widest">Buat PIN Akses Unit (4 Digit) *</label>
                <input type="text" maxLength={4} required placeholder="• • • •" value={propPin} onChange={e=>setPropPin(e.target.value.replace(/\D/g,''))} className="w-full p-4 border-2 border-emerald-400 rounded-2xl font-mono text-center tracking-[0.8em] font-black text-2xl bg-white outline-none focus:border-emerald-600 shadow-inner" />
                <p className="text-[10px] text-center text-slate-500 mt-2 font-bold">PIN ini digunakan bersama No. WA untuk masuk ke dasbor.</p>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={submittingProp} className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base rounded-2xl cursor-pointer shadow-lg transition-colors disabled:bg-slate-400">Simpan Data Properti</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Edit Penyewa */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 animate-slide-up">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><h3 className="font-black text-base">Edit Data Sewa</h3><button onClick={()=>setEditingTenant(null)} className="cursor-pointer text-xl hover:text-red-400">✕</button></div>
            <form onSubmit={handleSaveTenantSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <div><label className="font-bold text-xs text-slate-700 block mb-1">Nama Penyewa</label><input type="text" value={tenantName} onChange={e=>setTenantName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:border-blue-500" /></div>
              <div><label className="font-bold text-xs text-slate-700 block mb-1">No Kamar / Unit</label><input type="text" value={tenantRoom} onChange={e=>setTenantRoom(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:border-blue-500" /></div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <label className="font-black text-xs text-emerald-900 block mb-2 uppercase tracking-wider">Harga Sewa Per Bulan (Rp)</label>
                <input type="text" required value={tenantRentPrice} onChange={e=>setTenantRentPrice(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-emerald-400 rounded-xl font-mono font-black text-xl bg-white text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={savingTenant} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl cursor-pointer shadow-md transition-colors disabled:bg-slate-400">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Tambah Pengeluaran */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 animate-slide-up">
            <div className="p-5 bg-red-600 text-white flex justify-between items-center"><h3 className="font-black text-base">Catat Pengeluaran</h3><button onClick={()=>setShowAddExpenseModal(false)} className="cursor-pointer text-xl hover:text-red-200 leading-none">✕</button></div>
            <form onSubmit={handleAddExpenseSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Pengeluaran</label><input type="text" required placeholder="Cth: Bayar Listrik / Pipa Bocor" value={expenseTitle} onChange={e=>setExpenseTitle(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white outline-none focus:border-red-500" /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label><select value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)} className="w-full p-3 border rounded-xl bg-white outline-none focus:border-red-500"><option>Listrik</option><option>Air / PDAM</option><option>WiFi / Internet</option><option>Kebersihan / Sampah</option><option>Perbaikan / Tukang</option><option>Lainnya</option></select></div>
                <div className="flex-1"><label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label><input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} className="w-full p-3 border rounded-xl bg-white outline-none focus:border-red-500" /></div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <label className="font-black text-xs text-red-900 block mb-2 uppercase tracking-wider">Total Nominal (Rp)</label>
                <input type="text" required placeholder="0" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-red-400 rounded-xl font-mono font-black text-2xl bg-white text-red-700 outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={savingExpense} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl cursor-pointer shadow-md transition-colors disabled:bg-slate-400">Simpan ke Buku Kas</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}