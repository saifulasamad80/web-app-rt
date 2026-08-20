'use client';

import React, { useState, useEffect } from 'react';
import { loginOwnerDashboard, getOwnerPropertyDetails, createProperty, updateProperty, updateTenantData, deleteTenant, updateHouseRules, updateTenantPaymentStatus, addPropertyExpense, deletePropertyExpense, getOwnerAuditLogs } from '../../src/actions/checkin-tenant';
import Link from 'next/link';

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

  const [showAddPropModal, setShowAddPropModal] = useState(false); const [editingProperty, setEditingProperty] = useState<any>(null);
  
  const [propName, setPropName] = useState(''); const [propType, setPropType] = useState<'kos'|'kontrakan'>('kos'); const [propTotalRooms, setPropTotalRooms] = useState(10); const [propOwnerPhone, setPropOwnerPhone] = useState(''); const [propManagerPhone, setPropManagerPhone] = useState(''); const [propOwnerName, setPropOwnerName] = useState(''); const [propManagerName, setPropManagerName] = useState(''); const [propBankName, setPropBankName] = useState('BCA'); const [propBankAcc, setPropBankAcc] = useState(''); const [propBankHolder, setPropBankHolder] = useState(''); const [propAddress, setPropAddress] = useState(''); const [propPin, setPropPin] = useState(''); const [submittingProp, setSubmittingProp] = useState(false);
  
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false); const [expenseTitle, setExpenseTitle] = useState(''); const [expenseCategory, setExpenseCategory] = useState('Listrik'); const [expenseAmount, setExpenseAmount] = useState(''); const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10)); const [savingExpense, setSavingExpense] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null); const [tenantName, setTenantName] = useState(''); const [tenantRoom, setTenantRoom] = useState(''); const [tenantRentPrice, setTenantRentPrice] = useState('1500000'); const [savingTenant, setSavingTenant] = useState(false);
  const [editingRulesProp, setEditingRulesProp] = useState<any>(null); const [rulesText, setRulesText] = useState(''); const [savingRules, setSavingRules] = useState(false);

  const [tenantToDelete, setTenantToDelete] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{ id: string, text: string, type: 'info'|'success'|'payment', onUndo?: () => void } | null>(null);
  const [pendingPayments, setPendingPayments] = useState<{[key: string]: NodeJS.Timeout}>({});

  const isOwner = isPhoneMatch(loginPhone, activeProperty?.owner_phone);
  const activeLoginName = isOwner ? (activeProperty?.owner_name || 'Owner Kos') : (activeProperty?.manager_name || 'Pengelola Kos');
  const currentActor = `${activeLoginName} (${isOwner ? 'Pemilik' : 'Pengelola'})`;

  const refreshAuditLogs = async () => {
    const al = await getOwnerAuditLogs();
    if (al && al.logs) {
      setAuditLogs(al.logs);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setLoginError('');
    const res = await loginOwnerDashboard(loginPhone, loginPin); setLoginLoading(false);
    if(res.success && res.properties && res.properties.length > 0) { 
      setMyProperties(res.properties); setIsLoggedIn(true); setActiveProperty(res.initialDetails?.property); setTenants(res.initialDetails?.tenants||[]); setExpenses(res.initialDetails?.expenses||[]); 
      const al = await getOwnerAuditLogs(); setAuditLogs(al.logs||[]); 
    } else { setLoginError('Nomor belum terdaftar atau PIN akses salah.'); }
  };

  const handleSelectProperty = async (prop: any) => { setActiveProperty(prop); const d = await getOwnerPropertyDetails(prop.id); if (d.success) { setTenants(d.tenants||[]); setExpenses(d.expenses||[]); } };

  const executeDeleteTenant = async () => {
    if(deleteConfirmText !== 'HAPUS') return;
    setTenants(prev => prev.filter(t => t.id !== tenantToDelete.id));
    await deleteTenant(tenantToDelete.id, currentActor);
    setTenantToDelete(null); setDeleteConfirmText('');
    setToastMessage({ id: 'del', text: 'Data penyewa berhasil dihapus.', type: 'success' });
    await refreshAuditLogs();
    setTimeout(() => setToastMessage(null), 3000);
  };

  const executeDeleteExpense = async () => {
    setExpenses(expenses.filter((e) => e.id !== expenseToDelete.id)); 
    await deletePropertyExpense(expenseToDelete.id, expenseToDelete.title, expenseToDelete.amount, currentActor);
    setExpenseToDelete(null);
    setToastMessage({ id: 'del_exp', text: 'Catatan pengeluaran dihapus.', type: 'success' });
    await refreshAuditLogs();
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTogglePaymentOptimistic = (t: any) => {
    const newStatus = t.payment_status === 'PAID' ? 'UNPAID' : 'PAID';
    const oldStatus = t.payment_status;
    
    setTenants(prev => prev.map(item => item.id === t.id ? { ...item, payment_status: newStatus } : item));
    if (pendingPayments[t.id]) clearTimeout(pendingPayments[t.id]);

    const timeoutId = setTimeout(async () => {
       await updateTenantPaymentStatus(t.id, newStatus, currentActor);
       await refreshAuditLogs();
       setToastMessage(null);
    }, 5000);
    
    setPendingPayments(prev => ({ ...prev, [t.id]: timeoutId }));

    setToastMessage({
       id: t.id,
       text: `Status tagihan ${t.name} diubah menjadi ${newStatus === 'PAID' ? 'LUNAS' : 'BELUM BAYAR'}`,
       type: 'payment',
       onUndo: () => {
           clearTimeout(timeoutId);
           setTenants(prev => prev.map(item => item.id === t.id ? { ...item, payment_status: oldStatus } : item));
           setToastMessage({ id: 'info', text: 'Perubahan dibatalkan.', type: 'info' });
           setTimeout(() => setToastMessage(null), 3000);
       }
    });
  };

  const handlePropFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmittingProp(true);
    if (editingProperty) {
      await updateProperty(editingProperty.id, { name: propName, type: propType, total_rooms: propTotalRooms, owner_phone: propOwnerPhone, manager_phone: propManagerPhone, owner_name: propOwnerName, manager_name: propManagerName, address: propAddress, pin_code: propPin, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder }, currentActor);
      setShowAddPropModal(false); alert('Disimpan.'); window.location.reload();
    } else {
      await createProperty(propName, propType, propAddress, '', propPin, propOwnerName||loginPhone, propOwnerPhone||loginPhone, propManagerName, propManagerPhone, propTotalRooms, propBankName, propBankAcc, propBankHolder);
      setShowAddPropModal(false); alert('Berhasil daftar!'); window.location.reload();
    }
  };

  const handleSaveRules = async () => {
    if (!editingRulesProp) return; setSavingRules(true);
    const res = await updateHouseRules(editingRulesProp.id, rulesText); setSavingRules(false);
    if (res.success) { alert('Tata tertib diperbarui.'); setEditingRulesProp(null); if (activeProperty) setActiveProperty({ ...activeProperty, house_rules: rulesText }); await refreshAuditLogs(); }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingExpense(true); const parsed = parseInt(expenseAmount.replace(/\D/g,''),10)||0;
    const res = await addPropertyExpense(activeProperty.id, expenseTitle, expenseCategory, parsed, expenseDate, '', currentActor);
    setSavingExpense(false); 
    if(res.success && res.data){ 
        setExpenses([res.data, ...expenses]); 
        setShowAddExpenseModal(false); 
        await refreshAuditLogs();
    }
  };

  const handleSaveTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingTenant(true); const parsed = parseInt(tenantRentPrice.replace(/\D/g,''),10)||0;
    const res = await updateTenantData(editingTenant.id, { name: tenantName, room_number: tenantRoom, rent_price: parsed }, currentActor);
    setSavingTenant(false); 
    if(res.success){ 
        setTenants(prev=>prev.map(t=>t.id===editingTenant.id?{...t, name:tenantName, room_number:tenantRoom, rent_price:parsed}:t)); 
        setEditingTenant(null); 
        await refreshAuditLogs();
    }
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

  const fallbackCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage({ id: 'wa', text: 'Pesan disalin ke clipboard! Paste manual jika WA tidak terbuka.', type: 'success' });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSendReminderWA = (t: any) => {
    const rawPhone = (t.phone || '').replace(/\D/g, ''); const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const message = `Halo Kak *${t.name}*,\nMengingatkan tagihan sewa *${activeProperty?.name}* (${t.room_number}) sebesar *Rp ${Number(t.rent_price || 0).toLocaleString('id-ID')}*. Terima kasih.`;
    fallbackCopy(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShareWA = (prop: any) => {
    if (!prop) return;
    const checkinUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/checkin/' + prop.slug;
    const message = `Halo calon penghuni *${prop.name || prop.property_name}*,\n\nMohon lengkapi data lapor diri RT Anda secara digital melalui tautan resmi ini:\n\n👉 ${checkinUrl}\n\nTerima kasih.`;
    fallbackCopy(message);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const totalRooms = activeProperty?.total_rooms || 10;
  const occupiedRoomSet = new Set<string>();
  tenants.forEach(t => { if(t.status==='ACTIVE'||t.status==='VERIFIED'||t.status==='PENDING') { const pn=parseRoomNumber(t.room_number); if(pn!==null) occupiedRoomSet.add(`r-${pn}`); else if(t.room_number) occupiedRoomSet.add(t.room_number); } });
  
  const countActive = occupiedRoomSet.size; 
  const totalRent = tenants.filter(t=>t.is_head && t.payment_status==='PAID').reduce((s,t)=>s+(Number(t.rent_price)||0),0); 
  const totalExp = expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const occupancyPercentage = Math.round((countActive / totalRooms) * 100) || 0;
  const strokeDash = `${occupancyPercentage}, 100`;

  return (
    <>
      {!isLoggedIn ? (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex flex-col justify-center items-center relative overflow-hidden">
          <div className="max-w-md w-full space-y-6 relative z-10">
            <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div><h1 className="text-lg font-black text-slate-900">Portal Pemilik Kos</h1></div>
              <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">🚪 Beranda</Link>
            </header>

            <form onSubmit={handleLoginSubmit} className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-slate-100 text-center space-y-8 animate-fade-in">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">🏢</div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Akses Dasbor</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">Kelola properti dan pantau arus kas secara *real-time*.</p>
              </div>
              
              {loginError && <div className="p-3 text-red-700 bg-red-50 rounded-xl text-sm font-bold border border-red-200 animate-slide-up">{loginError}</div>}
              
              <div className="space-y-5 text-left">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">1. Nomor WA Terdaftar</label>
                  <input type="tel" required placeholder="08xxxxxxxx" value={loginPhone} onChange={e=>setLoginPhone(e.target.value.replace(/\D/g,''))} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-mono text-sm font-bold focus:border-amber-400 outline-none transition-colors" />
                </div>
                <div>
                  <label className="flex items-center justify-between text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">
                    <span>2. PIN Akses Properti</span>
                  </label>
                  <input type="password" required maxLength={4} placeholder="•••" value={loginPin} onChange={e=>setLoginPin(e.target.value.replace(/\D/g,''))} className="w-full p-4 border-2 border-slate-100 rounded-2xl text-center text-2xl tracking-[0.5em] font-black bg-slate-50 focus:border-amber-400 focus:bg-white outline-none transition-colors" />
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={loginLoading} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-base rounded-2xl shadow-lg shadow-amber-500/30 cursor-pointer transition-colors disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none">
                  {loginLoading ? 'Memverifikasi...' : 'Buka Dasbor Owner'}
                </button>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button type="button" onClick={()=>{setEditingProperty(null); setPropName(''); setPropType('kos'); setPropOwnerName(''); setPropOwnerPhone(''); setPropManagerName(''); setPropManagerPhone(''); setPropBankName('BCA'); setPropBankAcc(''); setPropBankHolder(''); setShowAddPropModal(true);}} className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors uppercase tracking-widest">➕ Daftarkan Kos Baru</button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-20 relative">
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
                    <button onClick={()=>{setEditingProperty(null); setPropName(''); setPropType('kos'); setPropOwnerName(''); setPropOwnerPhone(''); setPropManagerName(''); setPropManagerPhone(''); setPropBankName('BCA'); setPropBankAcc(''); setPropBankHolder(''); setShowAddPropModal(true);}} className="px-3 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg">➕ Tambah Kos</button>
                    <button onClick={()=>{setEditingProperty(activeProperty); setPropName(activeProperty.name); setPropType(activeProperty.type||'kos'); setPropTotalRooms(activeProperty.total_rooms||10); setPropAddress(activeProperty.address||''); setPropOwnerName(activeProperty.owner_name||''); setPropOwnerPhone(activeProperty.owner_phone||''); setPropManagerName(activeProperty.manager_name||''); setPropManagerPhone(activeProperty.manager_phone||''); setPropBankName(activeProperty.bank_name||'BCA'); setPropBankAcc(activeProperty.bank_account_number||''); setPropBankHolder(activeProperty.bank_account_holder||''); setPropPin(activeProperty.pin_code||''); setShowAddPropModal(true);}} className="px-3 py-2 bg-white border text-slate-800 text-xs font-bold rounded-lg">✏️ Edit Kos</button>
                    <button onClick={()=>{setEditingRulesProp(activeProperty); setRulesText(activeProperty.house_rules||'');}} className="px-3 py-2 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg">📜 Tata Tertib</button>
                  </>
                )}
                <button onClick={()=>{window.location.href='/';}} className="px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg">🔒 Keluar</button>
              </div>
            </header>

            <div className={`grid grid-cols-2 gap-4 ${isOwner ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl col-span-2 md:col-span-1"><p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Pemasukan Sewa</p><h3 className="text-xl font-black text-emerald-950">Rp {totalRent.toLocaleString('id-ID')}</h3></div>
              <div className="bg-red-50 border border-red-200 p-5 rounded-3xl col-span-2 md:col-span-1"><p className="text-[10px] font-black text-red-800 uppercase mb-1">Pengeluaran Kas</p><h3 className="text-xl font-black text-red-950">Rp {totalExp.toLocaleString('id-ID')}</h3></div>
              {isOwner && (
                <div className="bg-white border border-amber-300 p-5 rounded-3xl shadow-sm col-span-2 md:col-span-1"><p className="text-[10px] font-black text-amber-600 uppercase mb-1">Laba Bersih Kos</p><h3 className="text-xl font-black">Rp {(totalRent-totalExp).toLocaleString('id-ID')}</h3></div>
              )}
              <div className="bg-white border p-5 rounded-3xl shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
                <div><p className="text-[10px] font-black text-slate-500 uppercase">Okupansi</p><h3 className="text-lg font-black">{countActive}/{totalRooms}</h3></div>
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 stroke-current text-slate-200 fill-none stroke-[3]"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
                  <svg viewBox="0 0 36 36" className="w-12 h-12 stroke-current text-emerald-500 fill-none stroke-[3] absolute top-0 left-0 transition-all duration-1000 ease-out" strokeDasharray={strokeDash}><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex gap-2 overflow-x-auto border-b pb-1 pr-6 hide-scrollbar relative z-10">
                <button onClick={()=>setActiveTab('penyewa')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='penyewa'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>👥 Daftar Penyewa</button>
                <button onClick={()=>setActiveTab('matrix')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='matrix'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>🏠 Matrix Kamar</button>
                <button onClick={()=>setActiveTab('pengeluaran')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='pengeluaran'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>📉 Pengeluaran</button>
                {isOwner && <button onClick={()=>setActiveTab('audit')} className={`px-5 py-3 font-bold text-sm rounded-t-2xl whitespace-nowrap ${activeTab==='audit'?'bg-white border-t border-l border-r text-emerald-800':'bg-transparent text-slate-500'}`}>📋 Jejak Audit</button>}
              </div>
              <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none md:hidden z-20"></div>
            </div>

            {activeTab === 'penyewa' && (
               <div className="bg-white p-5 rounded-b-3xl rounded-tr-3xl border -mt-1 space-y-4">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 gap-3">
                   <h3 className="font-black text-lg">Daftar Penghuni</h3>
                   <div className="flex gap-2 w-full md:w-auto">
                     <button onClick={()=>handleShareWA(activeProperty)} className="flex-1 md:flex-none px-4 py-2 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-lg cursor-pointer">💬 Link Check-In WA</button>
                     {isOwner && <button onClick={handleExportOwner} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer">📥 Export CSV</button>}
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:hidden gap-4">
                   {tenants.map(t => (
                     <div key={t.id} className="bg-white p-5 border rounded-2xl shadow-sm space-y-3">
                       <div className="flex justify-between">
                         <div>
                           <h4 className="font-black text-base">{t.name}</h4>
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded ${t.is_head?'bg-amber-100 text-amber-900':'bg-slate-100 text-slate-600'}`}>{t.is_head?'Penanggung Jawab':'Anggota'}</span>
                         </div>
                         {t.is_head && <button onClick={()=>handleTogglePaymentOptimistic(t)} className={`text-[10px] font-black px-2 py-1 rounded border h-fit transition-colors ${t.payment_status==='PAID'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-red-50 text-red-800 border-red-200'}`}>{t.payment_status==='PAID'?'✓ LUNAS':'✗ BELUM BAYAR'}</button>}
                       </div>
                       <div className="flex justify-between items-center pt-3 border-t">
                         <span className="font-mono font-black text-sm">{t.is_head ? `Rp ${Number(t.rent_price).toLocaleString()}` : '-'}</span>
                         <div className="flex gap-2">
                           {t.is_head && t.payment_status !== 'PAID' && <button onClick={()=>handleSendReminderWA(t)} className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700">Tagih</button>}
                           <button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200">Edit</button>
                           <button onClick={()=>{setTenantToDelete(t); setDeleteConfirmText('');}} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100">Hapus</button>
                         </div>
                       </div>
                     </div>
                   ))}
                   {tenants.length === 0 && <p className="text-center text-slate-400 font-bold py-6">Belum ada penyewa.</p>}
                 </div>

                 <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black"><tr><th scope="col" className="p-4">Identitas Penyewa</th><th scope="col" className="p-4">Kamar</th><th scope="col" className="p-4">Status Tagihan</th><th scope="col" className="p-4">Harga Sewa</th><th scope="col" className="p-4">Status RT</th><th scope="col" className="p-4 text-right">Aksi</th></tr></thead>
                    <tbody className="divide-y">
                      {tenants.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-4"><div className="font-black text-base">{t.name}</div><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.is_head?'bg-amber-100 text-amber-900':'bg-slate-100 text-slate-600'}`}>{t.is_head?'Penanggung Jawab':'Anggota'}</span></td>
                          <td className="p-4 font-bold">{t.room_number}</td>
                          <td className="p-4">{t.is_head ? <button onClick={()=>handleTogglePaymentOptimistic(t)} className={`px-2 py-1 rounded text-[10px] font-black border transition-colors ${t.payment_status==='PAID'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-red-50 text-red-800 border-red-200'}`}>{t.payment_status==='PAID'?'LUNAS':'BELUM'}</button> : '-'}</td>
                          <td className="p-4 font-mono font-bold">{t.is_head ? `Rp ${Number(t.rent_price).toLocaleString()}` : '-'}</td>
                          <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-black ${t.status==='VERIFIED'||t.status==='ACTIVE'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{t.status==='VERIFIED'||t.status==='ACTIVE'?'✅ Sah':'⏳ Menunggu'}</span></td>
                          <td className="p-4 text-right space-x-2">
                            {t.is_head && t.payment_status !== 'PAID' && <button onClick={()=>handleSendReminderWA(t)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">Tagih</button>}
                            <button onClick={()=>{setEditingTenant(t);setTenantName(t.name);setTenantRoom(t.room_number||'');setTenantRentPrice(String(t.rent_price||0));}} className="px-3 py-1.5 border text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">Edit</button>
                            <button onClick={()=>{setTenantToDelete(t); setDeleteConfirmText('');}} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody></table>
                 </div>
               </div>
            )}

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

            {activeTab === 'pengeluaran' && (
               <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border space-y-4 -mt-1">
                 <div className="flex justify-between items-center border-b pb-3">
                   <h3 className="font-black text-lg">Buku Kas Keluar</h3>
                   <button onClick={()=>setShowAddExpenseModal(true)} className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 transition-colors">➕ Catat</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {expenses.map(e => (
                     <div key={e.id} className="p-4 border rounded-xl flex justify-between items-center bg-slate-50">
                       <div><p className="text-[10px] font-black text-slate-400 uppercase">{e.expense_date} • {e.category}</p><h4 className="font-black text-base">{e.title}</h4></div>
                       <div className="text-right flex flex-col items-end"><p className="font-mono font-black text-red-600">-Rp {Number(e.amount).toLocaleString()}</p><button onClick={()=>setExpenseToDelete(e)} className="text-[10px] text-red-500 font-bold mt-2 uppercase hover:text-red-700">Hapus</button></div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {activeTab === 'audit' && isOwner && (
               <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border space-y-4 -mt-1">
                 <div className="flex justify-between items-center border-b pb-3">
                   <h3 className="font-black text-lg">Jejak Audit Sistem</h3>
                   <button onClick={handleExportAudit} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors">📥 Export Audit</button>
                 </div>
                 <div className="space-y-3 pt-2">
                   {auditLogs.map(l => (
                     <div key={l.id} className="p-4 border rounded-xl text-sm bg-slate-50 flex flex-col md:flex-row gap-3 shadow-sm items-start">
                       <span className="text-[10px] text-slate-500 font-mono font-bold md:w-32 pt-1">{new Date(l.created_at).toLocaleString('id-ID')}</span>
                       <div className="flex-1">
                         <p className="font-black text-sm">{l.action_type}</p>
                         <div className="my-1.5"><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200">👤 Oleh: {l.performed_by}</span></div>
                         <p className="text-xs text-slate-600 leading-relaxed">{l.details}</p>
                       </div>
                     </div>
                   ))}
                   {auditLogs.length === 0 && <p className="text-center text-sm text-slate-500 font-bold py-4">Belum ada riwayat aktivitas yang terekam.</p>}
                 </div>
               </div>
            )}

          </div>
        </main>
      )}

      {/* MODALS */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-slate-50 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border relative">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10 shadow-sm">
              <h3 className="font-black text-sm">{editingProperty ? 'Edit Properti' : 'Pendaftaran Kos/Kontrakan'}</h3>
              <button onClick={()=>{setShowAddPropModal(false);setEditingProperty(null);}} className="font-bold text-xl leading-none hover:text-red-400">✕</button>
            </div>
            
            <form onSubmit={handlePropFormSubmit} className="p-5 space-y-4 text-sm">
              <input type="text" required placeholder="Nama Kos / Kontrakan" value={propName} onChange={e=>setPropName(e.target.value)} className="w-full p-3 border-2 border-slate-800 rounded-xl font-bold bg-white outline-none" />
              
              {/* PENAMBAHAN: Dropdown Tipe Properti */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <label className="text-xs font-black text-amber-900 block mb-1">Tipe Properti</label>
                <select value={propType} onChange={e=>setPropType(e.target.value as 'kos'|'kontrakan')} className="w-full p-2 border border-amber-300 rounded-lg bg-white font-bold text-sm outline-none">
                  <option value="kos">Kos-Kosan (Kamar)</option>
                  <option value="kontrakan">Kontrakan (Rumah/Petak)</option>
                </select>
              </div>

              <input type="number" required placeholder={propType === 'kos' ? "Total Kamar" : "Total Rumah/Pintu"} value={propTotalRooms} onChange={e=>setPropTotalRooms(parseInt(e.target.value,10)||1)} className="w-full p-3 border-2 border-slate-800 rounded-xl font-bold bg-white outline-none" />
              <input type="text" placeholder="Alamat Properti Lengkap" value={propAddress} onChange={e=>setPropAddress(e.target.value)} className="w-full p-3 border-2 border-slate-800 rounded-xl bg-white outline-none" />
              
              <div className="p-4 border-2 border-slate-800 rounded-xl space-y-3 bg-white">
                <p className="text-xs font-black text-slate-800">Akses No WA:</p>
                <input type="text" placeholder="Nama Owner (Cth: Sari)" value={propOwnerName} onChange={e=>setPropOwnerName(e.target.value)} className="w-full p-2 border-2 border-slate-200 focus:border-slate-800 rounded-lg outline-none" />
                <input type="tel" placeholder="WA Owner (Cth: 0859...)" value={propOwnerPhone} onChange={e=>setPropOwnerPhone(e.target.value)} className="w-full p-2 border-2 border-slate-200 focus:border-slate-800 rounded-lg font-mono outline-none" />
                <hr/>
                <input type="text" placeholder="Nama Pengelola (Cth: Asep)" value={propManagerName} onChange={e=>setPropManagerName(e.target.value)} className="w-full p-2 border-2 border-slate-200 focus:border-slate-800 rounded-lg outline-none" />
                <input type="tel" placeholder="WA Pengelola" value={propManagerPhone} onChange={e=>setPropManagerPhone(e.target.value)} className="w-full p-2 border-2 border-slate-200 focus:border-slate-800 rounded-lg font-mono outline-none" />
              </div>

              <div className="p-4 border-2 border-blue-300 bg-blue-50 rounded-xl space-y-3">
                <p className="text-xs font-black text-blue-900 uppercase">Rekening Pembayaran Kos:</p>
                <div className="flex gap-2">
                  <select value={propBankName} onChange={e=>setPropBankName(e.target.value)} className="w-1/3 p-2 border-2 border-blue-200 rounded-lg font-bold outline-none bg-white">
                    <option>BCA</option><option>Mandiri</option><option>BNI</option><option>BRI</option><option>BSI</option><option>Jago</option><option>SeaBank</option><option>DANA</option><option>Gopay</option><option>OVO</option><option>Lainnya</option>
                  </select>
                  <input type="text" placeholder="No. Rekening" value={propBankAcc} onChange={e=>setPropBankAcc(e.target.value.replace(/\D/g,''))} className="w-2/3 p-2 border-2 border-blue-200 rounded-lg font-mono outline-none bg-white" />
                </div>
                <input type="text" placeholder="Atas Nama (A/N)" value={propBankHolder} onChange={e=>setPropBankHolder(e.target.value)} className="w-full p-2 border-2 border-blue-200 rounded-lg outline-none bg-white" />
              </div>

              <div className="pt-2">
                <input type="text" maxLength={4} required placeholder="PIN Akses (4 Digit)" value={propPin} onChange={e=>setPropPin(e.target.value.replace(/\D/g,''))} className="w-full p-4 border-2 border-slate-400 rounded-full font-mono text-center tracking-[0.8em] font-black text-2xl bg-white focus:border-slate-900 outline-none" />
              </div>
              
              <div className="pt-4 pb-2">
                <button type="submit" disabled={submittingProp} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-colors">Simpan Data Properti</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTenant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><h3 className="font-black text-base">Edit Data Sewa</h3><button onClick={()=>setEditingTenant(null)} className="text-xl hover:text-red-400">✕</button></div>
            <form onSubmit={handleSaveTenantSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <div><label className="font-bold text-xs">Nama Penyewa</label><input type="text" value={tenantName} onChange={e=>setTenantName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white" /></div>
              <div><label className="font-bold text-xs">No Kamar / Unit</label><input type="text" value={tenantRoom} onChange={e=>setTenantRoom(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white" /></div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <label className="font-black text-xs text-emerald-900 block mb-2 uppercase tracking-wider">Harga Sewa Per Bulan (Rp)</label>
                <input type="text" required value={tenantRentPrice} onChange={e=>setTenantRentPrice(e.target.value.replace(/\D/g,''))} className="w-full p-3 border border-emerald-400 rounded-xl font-mono font-black text-xl bg-white text-emerald-900" />
              </div>
              <button type="submit" disabled={savingTenant} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-colors">Simpan Perubahan</button>
            </form>
          </div>
        </div>
      )}

      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border">
            <div className="p-5 bg-red-600 text-white flex justify-between items-center"><h3 className="font-black text-base">Catat Pengeluaran</h3><button onClick={()=>setShowAddExpenseModal(false)} className="text-xl hover:text-red-200">✕</button></div>
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
              <button type="submit" disabled={savingExpense} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-colors">Simpan ke Buku Kas</button>
            </form>
          </div>
        </div>
      )}

      {editingRulesProp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border overflow-hidden shadow-2xl">
            <div className="p-5 bg-amber-100 text-amber-900 flex justify-between"><h3 className="font-black">📜 Edit Tata Tertib</h3><button onClick={() => setEditingRulesProp(null)} className="text-xl font-bold hover:text-red-500">✕</button></div>
            <div className="p-6 bg-slate-50"><textarea rows={7} value={rulesText} onChange={(e) => setRulesText(e.target.value)} className="w-full p-4 border rounded-2xl font-mono text-sm outline-none bg-white focus:border-amber-400"></textarea></div>
            <div className="p-4 bg-white border-t flex justify-end"><button onClick={handleSaveRules} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors">Simpan Aturan</button></div>
          </div>
        </div>
      )}

      {tenantToDelete && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
           <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border-2 border-red-500 shadow-2xl">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto">⚠️</div>
             <div className="text-center">
               <h3 className="text-xl font-black text-slate-900">Hapus Data Penyewa?</h3>
               <p className="text-sm text-slate-600 mt-2">Data <b>{tenantToDelete.name}</b> (Kamar {tenantToDelete.room_number}) akan dihapus permanen beserta histori tagihannya.</p>
             </div>
             <div className="bg-red-50 p-4 rounded-xl border border-red-200 mt-4">
               <label className="text-[10px] font-black text-red-800 uppercase tracking-widest block mb-2 text-center">Ketik "HAPUS" untuk konfirmasi</label>
               <input type="text" placeholder="HAPUS" value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} className="w-full p-3 border border-red-300 rounded-lg text-center font-bold font-mono uppercase focus:outline-none focus:border-red-600" />
             </div>
             <div className="flex gap-2 pt-2">
               <button onClick={()=>{setTenantToDelete(null); setDeleteConfirmText('');}} className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Batal</button>
               <button onClick={executeDeleteTenant} disabled={deleteConfirmText !== 'HAPUS'} className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl disabled:bg-slate-300 transition-colors">Hapus Data</button>
             </div>
           </div>
         </div>
      )}

      {expenseToDelete && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
           <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
             <div className="text-center">
               <h3 className="text-lg font-black text-slate-900">Hapus Pengeluaran?</h3>
               <p className="text-sm text-slate-600 mt-2">Catatan kas <b>{expenseToDelete.title}</b> (Rp {expenseToDelete.amount.toLocaleString()}) akan dihapus dari buku.</p>
             </div>
             <div className="flex gap-2 pt-4">
               <button onClick={()=>setExpenseToDelete(null)} className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Batal</button>
               <button onClick={executeDeleteExpense} className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-colors">Ya, Hapus</button>
             </div>
           </div>
         </div>
      )}

      {toastMessage && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-slide-up border ${toastMessage.type === 'payment' ? 'bg-slate-900 text-white border-slate-700' : toastMessage.type === 'success' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-white text-slate-800 border-slate-200'}`}>
          <span className="text-sm font-bold">{toastMessage.text}</span>
          {toastMessage.onUndo && (
             <button onClick={toastMessage.onUndo} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black uppercase tracking-wider transition-colors">Urungkan</button>
          )}
        </div>
      )}
    </>
  );
}