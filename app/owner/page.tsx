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
  const [myProperties, setMyProperties] = useState<any[]>([]); const [activeProperty, setActiveProperty] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]); const [expenses, setExpenses] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals state
  const [showAddPropModal, setShowAddPropModal] = useState(false); const [editingProperty, setEditingProperty] = useState<any>(null);
  const [propName, setPropName] = useState(''); const [propType, setPropType] = useState<'kos'|'kontrakan'>('kos'); const [propTotalRooms, setPropTotalRooms] = useState(10); const [propOwnerName, setPropOwnerName] = useState(''); const [propOwnerPhone, setPropOwnerPhone] = useState(''); const [propManagerName, setPropManagerName] = useState(''); const [propManagerPhone, setPropManagerPhone] = useState(''); const [propBankName, setPropBankName] = useState('BCA'); const [propBankAcc, setPropBankAcc] = useState(''); const [propBankHolder, setPropBankHolder] = useState(''); const [propAddress, setPropAddress] = useState(''); const [propPin, setPropPin] = useState(''); const [submittingProp, setSubmittingProp] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false); const [expenseTitle, setExpenseTitle] = useState(''); const [expenseCategory, setExpenseCategory] = useState('Listrik'); const [expenseAmount, setExpenseAmount] = useState(''); const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10)); const [savingExpense, setSavingExpense] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null); const [tenantName, setTenantName] = useState(''); const [tenantRoom, setTenantRoom] = useState(''); const [tenantRentPrice, setTenantRentPrice] = useState('1500000'); const [savingTenant, setSavingTenant] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setLoginError('');
    const res = await loginOwnerDashboard(loginPhone, loginPin);
    setLoginLoading(false);
    if(res.success && res.properties) { setMyProperties(res.properties); setIsLoggedIn(true); setActiveProperty(res.initialDetails?.property); setTenants(res.initialDetails?.tenants||[]); setExpenses(res.initialDetails?.expenses||[]); const al = await getOwnerAuditLogs(); setAuditLogs(al.logs||[]); }
    else setLoginError(res.error || 'Login gagal. Pastikan nomor dan PIN benar.');
  };

  const handleSelectProperty = async (prop: any) => { setActiveProperty(prop); const d = await getOwnerPropertyDetails(prop.id); if (d.success) { setTenants(d.tenants||[]); setExpenses(d.expenses||[]); } };

  const handleHardDeleteTenant = async (id: string, name: string) => {
    const confirmation = prompt(`PERINGATAN: Tindakan ini permanen.\n\nKetik "HAPUS" (tanpa tanda kutip) untuk menghapus data ${name}:`);
    if (confirmation === 'HAPUS') { setTenants(prev => prev.filter(t => t.id !== id)); await deleteTenant(id); alert('Data berhasil dihapus.'); }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Hapus catatan pengeluaran "${title}"?`)) { setExpenses(expenses.filter((e) => e.id !== id)); await deletePropertyExpense(id); }
  };

  const handlePropFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmittingProp(true);
    if (editingProperty) {
      await updateProperty(editingProperty.id, { name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin });
      setShowAddPropModal(false); alert('Disimpan.'); window.location.reload();
    } else {
      await createProperty(propName, propType, propAddress, '', propPin, propOwnerName||loginPhone, propOwnerPhone||loginPhone, propManagerName, propManagerPhone, propTotalRooms, propBankName, propBankAcc, propBankHolder);
      setShowAddPropModal(false); alert('Properti Dibuat. Silakan Login.'); window.location.reload();
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

  const handleExportOwner = () => {
    const rows = tenants.map(t => [`"${t.name||""}"`, `"${t.phone||""}"`, `"${t.room_number||""}"`, `"${t.entry_date||""}"`, `"${t.status||""}"`, `"${t.rent_price||0}"`, `"${t.payment_status||""}"`]);
    const csv = [["Nama", "WA", "Kamar", "Tgl Masuk", "Status RT", "Harga", "Bayar"].join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `DataKos.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const isOwner = isPhoneMatch(loginPhone, activeProperty?.owner_phone);
  const totalRooms = activeProperty?.total_rooms || 10;
  const occupiedRoomSet = new Set<string>();
  tenants.forEach(t => { if(t.status==='ACTIVE'||t.status==='VERIFIED'||t.status==='PENDING') { const pn=parseRoomNumber(t.room_number); if(pn!==null) occupiedRoomSet.add(`r-${pn}`); else if(t.room_number) occupiedRoomSet.add(t.room_number); } });
  const countActive = occupiedRoomSet.size; const totalRent = tenants.filter(t=>t.payment_status==='PAID').reduce((s,t)=>s+(Number(t.rent_price)||0),0); const totalExp = expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);

  return (
    <>
      {!isLoggedIn ? (
        <main className="min-h-screen bg-slate-50 p-4 font-sans flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full space-y-5">
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">🏢</div>
            <h2 className="text-xl font-black text-center text-slate-900">Masuk Dasbor Pemilik</h2>
            {loginError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded text-center font-bold">{loginError}</p>}
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <input type="tel" required placeholder="No WhatsApp Terdaftar" value={loginPhone} onChange={e=>setLoginPhone(e.target.value)} className="w-full p-3.5 border rounded-xl font-mono text-sm focus:border-slate-800 outline-none font-bold" />
              <input type="password" required maxLength={4} placeholder="PIN" value={loginPin} onChange={e=>setLoginPin(e.target.value)} className="w-full p-3.5 border rounded-xl text-center text-xl tracking-[0.5em] font-black focus:border-slate-800 outline-none" />
              <button type="submit" disabled={loginLoading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl cursor-pointer hover:bg-slate-800 mt-2">{loginLoading?'Memproses...':'Buka Dasbor'}</button>
            </form>
            
            {/* INI TOMBOL DAFTAR YANG KEMARIN GW HAPUS, SEKARANG UDAH BALIK! */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <button type="button" onClick={()=>{setEditingProperty(null); setPropName(''); setPropAddress(''); setPropOwnerPhone(''); setPropManagerPhone(''); setPropPin(''); setShowAddPropModal(true);}} className="text-[0.8rem] font-bold text-slate-500 hover:text-slate-900 cursor-pointer">
                ➕ Daftarkan Properti Kos Baru
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-20">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* HEADER CONTROLS */}
            <header className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900">Dasbor Kos</h1>
                <div className="flex items-center gap-2 mt-2">
                  <select value={activeProperty?.id||''} onChange={e=>{const s=myProperties.find(p=>p.id===e.target.value); if(s)handleSelectProperty(s);}} className="p-2 border rounded-lg text-sm font-bold bg-slate-50 outline-none cursor-pointer">
                    {myProperties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${isOwner?'bg-emerald-100 text-emerald-800':'bg-blue-100 text-blue-800'}`}>{isOwner?'👑 Owner':'🔑 Pengelola'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <>
                    <button onClick={()=>{setEditingProperty(null); setPropName(''); setShowAddPropModal(true);}} className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer">➕ Tambah Kos</button>
                    <button onClick={()=>{setEditingProperty(activeProperty); setPropName(activeProperty.name); setShowAddPropModal(true);}} className="px-3 py-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg cursor-pointer">✏️ Edit Kos</button>
                  </>
                )}
                <button onClick={()=>window.location.reload()} className="px-3 py-2 bg-red-100 text-red-800 text-xs font-bold rounded-lg cursor-pointer">🔒 Keluar</button>
              </div>
            </header>

            {/* HERO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl"><p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Pemasukan Lunas</p><h3 className="text-xl font-black text-emerald-950">Rp {totalRent.toLocaleString('id-ID')}</h3></div>
              <div className="bg-red-50 border border-red-200 p-5 rounded-3xl"><p className="text-[10px] font-black text-red-800 uppercase mb-1">Pengeluaran</p><h3 className="text-xl font-black text-red-950">Rp {totalExp.toLocaleString('id-ID')}</h3></div>
              <div className="bg-white border p-5 rounded-3xl shadow-sm"><p className="text-[10px] font-black text-slate-500 uppercase mb-1">{isOwner?'Laba Bersih':'Okupansi'}</p><h3 className="text-xl font-black text-slate-900">{isOwner ? `Rp ${(totalRent-totalExp).toLocaleString('id-ID')}` : `${countActive}/${totalRooms} Terisi`}</h3></div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 overflow-x-auto border-b pb-2">
              <button onClick={()=>setActiveTab('penyewa')} className={`px-4 py-2 font-bold text-sm rounded-xl whitespace-nowrap cursor-pointer ${activeTab==='penyewa'?'bg-slate-900 text-white':'bg-slate-200 text-slate-700'}`}>👥 Penyewa</button>
              <button onClick={()=>setActiveTab('matrix')} className={`px-4 py-2 font-bold text-sm rounded-xl whitespace-nowrap cursor-pointer ${activeTab==='matrix'?'bg-slate-900 text-white':'bg-slate-200 text-slate-700'}`}>🏠 Matrix Kamar</button>
              <button onClick={()=>setActiveTab('pengeluaran')} className={`px-4 py-2 font-bold text-sm rounded-xl whitespace-nowrap cursor-pointer ${activeTab==='pengeluaran'?'bg-slate-900 text-white':'bg-slate-200 text-slate-700'}`}>📉 Pengeluaran</button>
              {isOwner && <button onClick={()=>setActiveTab('audit')} className={`px-4 py-2 font-bold text-sm rounded-xl whitespace-nowrap cursor-pointer ${activeTab==='audit'?'bg-slate-900 text-white':'bg-slate-200 text-slate-700'}`}>📋 Audit Owner</button>}
            </div>

            {/* TAB PENYEWA */}
            {activeTab === 'penyewa' && (
               <div className="space-y-4 animate-fade-in">
                 <div className="flex justify-between items-center"><h3 className="font-black text-lg">Daftar Penyewa</h3>{isOwner&&<button onClick={handleExportOwner} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer hidden md:block">📥 Export CSV</button>}</div>
                 
                 {/* CARDS (Mobile) */}
                 <div className="grid grid-cols-1 md:hidden gap-4">
                   {tenants.map(t => (
                     <div key={t.id} className="bg-white p-5 border rounded-2xl shadow-sm space-y-3">
                       <div className="flex justify-between items-start">
                         <div><h4 className="font-black text-base text-slate-900">{t.name}</h4><p className="text-xs text-slate-500 font-mono mt-0.5">{t.room_number || 'Kamar -'} • Masuk: {t.entry_date}</p></div>
                         <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${t.payment_status==='PAID'?'bg-emerald-100 text-emerald-800':'bg-red-100 text-red-800'}`}>{t.payment_status==='PAID'?'LUNAS':'BELUM'}</span>
                       </div>
                       <div className="flex justify-between items-center pt-3 border-t">
                         <span className="font-mono font-black text-sm text-slate-900">Rp {Number(t.rent_price||0).toLocaleString('id-ID')}</span>
                         <div className="space-x-2">
                           <button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer">Edit</button>
                           <button onClick={()=>handleHardDeleteTenant(t.id, t.name)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer">Hapus</button>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>

                 {/* TABLE (Desktop) */}
                 <div className="hidden md:block bg-white p-6 border rounded-3xl shadow-sm">
                    <table className="w-full text-left text-sm"><thead className="border-b text-slate-500 uppercase text-xs"><tr><th className="py-3">Penyewa</th><th>Kamar</th><th>Tagihan</th><th>Harga Sewa</th><th>Aksi</th></tr></thead>
                    <tbody className="divide-y">
                      {tenants.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-3 font-bold text-slate-900">{t.name} <span className="block text-[10px] font-normal text-slate-500">{t.entry_date}</span></td>
                          <td className="font-bold text-slate-700">{t.room_number}</td>
                          <td><button onClick={()=>updateTenantPaymentStatus(t.id, t.payment_status==='PAID'?'UNPAID':'PAID').then(()=>window.location.reload())} className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer ${t.payment_status==='PAID'?'bg-emerald-100 text-emerald-800':'bg-red-100 text-red-800'}`}>{t.payment_status}</button></td>
                          <td className="font-mono text-slate-900 font-bold">Rp {Number(t.rent_price||0).toLocaleString()}</td>
                          <td className="space-x-2"><button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">Edit</button><button onClick={()=>handleHardDeleteTenant(t.id, t.name)} className="text-xs font-bold text-red-600 hover:underline cursor-pointer">Hapus</button></td>
                        </tr>
                      ))}
                    </tbody></table>
                 </div>
               </div>
            )}

            {/* TAB MATRIX DENGAN IKON */}
            {activeTab === 'matrix' && (
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 animate-fade-in">
                <h3 className="font-black text-lg border-b pb-2">Matrix Kamar</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: totalRooms }).map((_, i) => {
                    const target = i+1; const lbl = `Kamar ${String(target).padStart(2,'0')}`;
                    const occ = tenants.find(t => parseRoomNumber(t.room_number) === target);
                    return (
                      <div key={i} className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-colors ${occ ? 'bg-slate-50 border-emerald-200' : 'bg-white border-dashed border-slate-300'}`}>
                        <span className="text-2xl">{occ ? '✅' : '➖'}</span>
                        <span className="font-bold text-sm text-slate-900">{lbl}</span>
                        <span className="text-xs text-slate-500 font-medium">{occ ? occ.name : 'Kosong'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB PENGELUARAN */}
            {activeTab === 'pengeluaran' && (
               <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 animate-fade-in">
                 <div className="flex justify-between items-center"><h3 className="font-black text-lg">Buku Kas Keluar</h3><button onClick={()=>setShowAddExpenseModal(true)} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg cursor-pointer">➕ Catat</button></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {expenses.map(e => (
                     <div key={e.id} className="p-4 border rounded-xl flex justify-between items-center bg-slate-50">
                       <div><p className="text-xs font-bold text-slate-500">{e.expense_date} • {e.category}</p><h4 className="font-black text-slate-900 text-sm mt-0.5">{e.title}</h4></div>
                       <div className="text-right"><p className="font-mono font-black text-red-600">-Rp {Number(e.amount).toLocaleString()}</p><button onClick={()=>handleDeleteExpense(e.id, e.title)} className="text-[10px] text-slate-400 hover:text-red-600 font-bold mt-1 cursor-pointer">Hapus</button></div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {/* TAB AUDIT OWNER */}
            {activeTab === 'audit' && isOwner && (
               <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 animate-fade-in">
                 <h3 className="font-black text-lg border-b pb-2">Jejak Audit Sistem</h3>
                 <div className="space-y-2">
                   {auditLogs.map(l => (
                     <div key={l.id} className="p-3 border rounded-lg text-sm bg-slate-50 flex gap-4"><span className="text-xs text-slate-400 font-mono w-24 flex-shrink-0">{new Date(l.created_at).toLocaleDateString()}</span><div className="flex-1"><p className="font-bold text-slate-800">{l.action_type}</p><p className="text-xs text-slate-600">{l.details}</p></div></div>
                   ))}
                 </div>
               </div>
            )}

          </div>
        </main>
      )}

      {/* MODALS RENDERED HERE TO BE ACCESSIBLE FROM BOTH STATES */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 bg-slate-900 text-white flex justify-between"><h3 className="font-black">{editingProperty ? 'Edit Properti' : 'Daftar Kos Baru'}</h3><button onClick={()=>{setShowAddPropModal(false);setEditingProperty(null);}} className="font-bold cursor-pointer hover:text-red-400">✕</button></div>
            <form onSubmit={handlePropFormSubmit} className="p-5 space-y-4 text-sm">
              <input type="text" required placeholder="Nama Kos / Properti" value={propName} onChange={e=>setPropName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-slate-50" />
              <input type="number" required placeholder="Total Kamar" value={propTotalRooms} onChange={e=>setPropTotalRooms(parseInt(e.target.value,10)||1)} className="w-full p-3 border rounded-xl font-bold bg-slate-50" />
              <input type="text" placeholder="Alamat Kos Lengkap" value={propAddress} onChange={e=>setPropAddress(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />
              <div className="p-4 border rounded-xl space-y-2"><p className="text-xs font-bold text-slate-500">Akses Nomor WA:</p><input type="tel" placeholder="WA Owner (Pemilik)" value={propOwnerPhone} onChange={e=>setPropOwnerPhone(e.target.value)} className="w-full p-2 border rounded font-mono" /><input type="tel" placeholder="WA Pengelola (Penjaga)" value={propManagerPhone} onChange={e=>setPropManagerPhone(e.target.value)} className="w-full p-2 border rounded font-mono" /></div>
              <div className="p-4 border rounded-xl space-y-2"><p className="text-xs font-bold text-slate-500">Rekening Pembayaran Kos:</p><input type="text" placeholder="Nama Bank" value={propBankName} onChange={e=>setPropBankName(e.target.value)} className="w-full p-2 border rounded" /><input type="text" placeholder="No Rekening" value={propBankAcc} onChange={e=>setPropBankAcc(e.target.value)} className="w-full p-2 border rounded font-mono" /><input type="text" placeholder="Atas Nama" value={propBankHolder} onChange={e=>setPropBankHolder(e.target.value)} className="w-full p-2 border rounded" /></div>
              <input type="text" maxLength={4} required placeholder="Buat PIN 4 Digit Akses" value={propPin} onChange={e=>setPropPin(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-slate-400 rounded-xl font-mono text-center tracking-widest font-black text-lg" />
              <button type="submit" disabled={submittingProp} className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl cursor-pointer">Simpan Data Properti</button>
            </form>
          </div>
        </div>
      )}

      {editingTenant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between"><h3 className="font-black text-sm">Edit Data Sewa</h3><button onClick={()=>setEditingTenant(null)}>✕</button></div>
            <form onSubmit={handleSaveTenantSubmit} className="p-5 space-y-4 text-sm">
              <div><label className="font-bold text-xs">Nama</label><input type="text" value={tenantName} onChange={e=>setTenantName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-slate-50" /></div>
              <div><label className="font-bold text-xs">No Kamar</label><input type="text" value={tenantRoom} onChange={e=>setTenantRoom(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-slate-50" /></div>
              <div><label className="font-bold text-xs">Harga Sewa (Rp)</label><input type="text" required value={tenantRentPrice} onChange={e=>setTenantRentPrice(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-emerald-400 rounded-xl font-mono font-black text-lg bg-emerald-50" /></div>
              <button type="submit" disabled={savingTenant} className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl cursor-pointer">Simpan Perubahan</button>
            </form>
          </div>
        </div>
      )}

      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
            <div className="p-5 bg-red-600 text-white flex justify-between"><h3 className="font-black text-sm">Catat Pengeluaran</h3><button onClick={()=>setShowAddExpenseModal(false)}>✕</button></div>
            <form onSubmit={handleAddExpenseSubmit} className="p-5 space-y-4 text-sm">
              <input type="text" required placeholder="Cth: Bayar Listrik" value={expenseTitle} onChange={e=>setExpenseTitle(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-slate-50" />
              <div className="flex gap-2"><select value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)} className="flex-1 p-3 border rounded-xl bg-slate-50"><option>Listrik</option><option>Air</option><option>WiFi</option><option>Sampah</option><option>Lainnya</option></select><input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} className="flex-1 p-3 border rounded-xl bg-slate-50" /></div>
              <input type="text" required placeholder="Nominal Rp" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-red-400 rounded-xl font-mono font-black text-lg bg-red-50 text-red-900" />
              <button type="submit" disabled={savingExpense} className="w-full py-3.5 bg-red-600 text-white font-black rounded-xl cursor-pointer">Simpan Pengeluaran</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}