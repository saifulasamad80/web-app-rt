'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRtDashboardBundle, loginRtAdminAction, updateTenantStatus, deleteTenant, recordRtDues, deleteRtDues, getDocumentSignedUrl, addRtOfficer, updateRtOfficer, deleteRtOfficer, resetOfficerPasswordBySuperAdmin, logAdminAction, updateProperty } from '../../src/actions/checkin-tenant';

export default function RtDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState(''); const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false); const [loginError, setLoginError] = useState('');

  const [activeMenu, setActiveMenu] = useState<'warga'|'properti'|'pengurus'|'kas'|'audit'>('warga');
  const [tenants, setTenants] = useState<any[]>([]); const [properties, setProperties] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]); const [dues, setDues] = useState<any[]>([]); const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  const [filterWarga, setFilterWarga] = useState<'all'|'pending'|'incomplete'>('all');
  const [viewDocUrl, setViewDocUrl] = useState<string|null>(null); const [docModalTitle, setDocModalTitle] = useState('');
  
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const [showDuesModal, setShowDuesModal] = useState(false); 
  const [selectedTenantKas, setSelectedTenantKas] = useState('');
  const [duesPayer, setDuesPayer] = useState(''); const [duesBlock, setDuesBlock] = useState(''); const [duesAmount, setDuesAmount] = useState('50000'); const [duesMonth, setDuesMonth] = useState('Januari'); const [duesYear, setDuesYear] = useState('2026');

  const [showOfficerModal, setShowOfficerModal] = useState(false); const [editOfficer, setEditOfficer] = useState<any>(null); const [offName, setOffName] = useState(''); const [offRole, setOffRole] = useState('Ketua RT'); const [offPhone, setOffPhone] = useState(''); const [offEmail, setOffEmail] = useState(''); const [offPass, setOffPass] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setLoginError('');
    const res = await loginRtAdminAction(loginEmail, loginPass); setLoginLoading(false);
    if(res.success && res.user) { 
      setIsLoggedIn(true); setActiveUser(res.user); 
      const b = await getRtDashboardBundle(); if(b.success){ setTenants(b.tenants||[]); setProperties(b.properties||[]); setOfficers(b.officers||[]); setDues(b.dues||[]); setAuditLogs(b.auditLogs||[]); }
    } else { setLoginError(res.error || 'Login gagal.'); }
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    await updateTenantStatus(id, newStatus);
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus==='active'?'VERIFIED':newStatus==='rejected'?'REJECTED':newStatus==='pending'?'PENDING':t.status } : t));
  };

  const handleDeleteTenant = async (id: string) => {
    if(confirm('Hapus warga dari sistem RT?')) { await deleteTenant(id, 'Pengurus RT'); setTenants(prev => prev.filter(t => t.id !== id)); }
  };

  const openDocument = async (path: string, title: string) => {
    if(!path) return; const res = await getDocumentSignedUrl(path);
    if(res.success && res.url) { setViewDocUrl(res.url); setDocModalTitle(title); } else { alert('Gagal memuat dokumen.'); }
  };

  const triggerExportWarga = () => { setShowExportConfirm(true); };

  const executeSecureExport = async () => {
    setShowExportConfirm(false);
    await logAdminAction('EKSPOR_DATA_WARGA', 'Mengunduh rekapitulasi data sensitif kependudukan seluruh warga.', activeUser?.email || 'Admin RT');
    const rows = tenants.map(t => [`"${t.name||""}"`, `"${t.phone||""}"`, `"${t.properties?.name||"-"}"`, `"${t.room_number||"-"}"`, `"${t.entry_date||""}"`, `"${t.marital_status||""}"`, `"${t.status||""}"`]);
    const csv = [["Nama", "WA", "Properti", "Kamar", "Tgl Masuk", "Status Sipil", "Status RT"].join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Laporan_Warga_RT.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    const b = await getRtDashboardBundle(); if(b.success) setAuditLogs(b.auditLogs||[]);
  };

  const handleExportKas = () => {
    const rows = dues.map(d => [`"${new Date(d.created_at).toLocaleString('id-ID')}"`, `"${d.payer_name}"`, `"${d.block_number}"`, `"${d.period}"`, `"${d.amount}"`]);
    const csv = [["Waktu Bayar", "Nama Penyetor", "Blok/Unit", "Periode", "Nominal"].join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Laporan_Kas_RT.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleAddKas = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const amt = parseInt(duesAmount.replace(/\D/g,''),10)||0;
    const res = await recordRtDues(duesPayer, duesBlock, amt, duesMonth, duesYear, activeUser?.email || 'Admin RT');
    if(res.success && res.data){ 
      setDues([res.data, ...dues]); 
      setShowDuesModal(false); 
      setSelectedTenantKas(''); 
      const b = await getRtDashboardBundle(); if(b.success) setAuditLogs(b.auditLogs||[]);
    } else {
      alert('Gagal menyimpan iuran kas.');
    }
  };

  const handleDeleteKas = async (d: any) => {
    if(confirm(`Hapus pencatatan Rp ${d.amount} dari ${d.payer_name}?`)){ 
      await deleteRtDues(d.id, d.payer_name, d.amount, activeUser?.email || 'Admin RT'); 
      setDues(dues.filter(x=>x.id!==d.id)); 
      const b = await getRtDashboardBundle(); if(b.success) setAuditLogs(b.auditLogs||[]);
    }
  };

  const handleOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(editOfficer){ 
      const res=await updateRtOfficer(editOfficer.id, offName, offRole, offPhone, offEmail); 
      if(res.success){ setOfficers(officers.map(o=>o.id===editOfficer.id?{...o, full_name:offName, role:offRole, phone_number:offPhone, email:offEmail}:o)); setShowOfficerModal(false); } 
      else { alert(res.error || 'Gagal mengubah data pengurus.'); }
    } else { 
      const res=await addRtOfficer(offName, offRole, offPhone, offEmail, offPass); 
      if(res.success && res.data){ setOfficers([...officers, res.data]); setShowOfficerModal(false); } 
      else { alert(`Gagal menambah pengurus!\nAlasan: Email mungkin sudah terdaftar di sistem.`); }
    }
  };

  const handleResetAdminPass = async (email: string) => {
    const np = prompt(`Masukkan password baru untuk ${email} (min 6 karakter):`);
    if(np && np.length>=6){ const res = await resetOfficerPasswordBySuperAdmin(email, np, activeUser?.email); if(res.success){ alert('Password berhasil direset.'); } else { alert(res.error||'Gagal reset.'); } }
  };

  const handleResetPropPin = async (propId: string, oldPin: string, propName: string) => {
    const newPin = prompt(`Mereset PIN akses keamanan properti "${propName}".\n\nMasukkan 4 Digit PIN Baru:`);
    if (newPin === null) return; 
    const cleaned = newPin.replace(/\D/g, '').substring(0, 4);
    if (cleaned.length !== 4) { alert('GAGAL: PIN yang dimasukkan harus persis 4 digit angka!'); return; }
    const res = await updateProperty(propId, { pin_code: cleaned }, activeUser?.email || 'Admin RT');
    if (res.success) {
      setProperties(properties.map(p => p.id === propId ? {...p, pin_code: cleaned} : p));
      alert('PIN berhasil diubah dan tersimpan!');
    } else { alert(res.error || 'Gagal mengubah PIN Properti.'); }
  };

  const filteredTenants = tenants.filter(t => {
    if(filterWarga==='pending') return t.status==='PENDING';
    if(filterWarga==='incomplete') return (t.marital_status==='Menikah' && !t.marriage_doc_url && !t.kk_doc_url);
    return true;
  });

  const totalKas = dues.reduce((sum, d) => sum + (Number(d.amount)||0), 0);
  const currentUserProfile = officers.find(o => o.email === activeUser?.email);
  const isSuperAdmin = currentUserProfile?.role === 'SUPER_ADMIN' || activeUser?.email === 'ajipsas@gmail.com';

  if(!isLoggedIn) return (
    /* PEROMBAKAN ESTETIKA: Form Login Pengurus RT (Tema Emerald) */
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex flex-col justify-center items-center relative overflow-hidden">
      <div className="max-w-md w-full space-y-6 relative z-10">
        <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div><h1 className="text-lg font-black text-slate-900">Portal Pengurus RT</h1></div>
          <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">🚪 Beranda</Link>
        </header>

        <form onSubmit={handleLoginSubmit} className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-slate-100 text-center space-y-8 animate-fade-in">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">🏛️</div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Akses Otoritas</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">Login khusus pengurus untuk manajemen kependudukan dan kas lingkungan.</p>
          </div>
          
          {loginError && <div className="p-3 text-red-700 bg-red-50 rounded-xl text-sm font-bold border border-red-200 animate-slide-up">{loginError}</div>}
          
          <div className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">1. Email Pengurus</label>
              <input type="email" required placeholder="Cth: ketua@rt.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-mono text-sm font-bold focus:border-emerald-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">
                <span>2. Kata Sandi Rahasia</span>
              </label>
              <input type="password" required placeholder="••••••••" value={loginPass} onChange={e=>setLoginPass(e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-mono text-sm font-bold bg-slate-50 focus:border-emerald-500 focus:bg-white outline-none transition-colors" />
            </div>
          </div>
          
          <div className="pt-2 pb-2">
            <button type="submit" disabled={loginLoading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-600/30 cursor-pointer transition-colors disabled:bg-slate-300 disabled:shadow-none">
              {loginLoading ? 'Memverifikasi...' : 'Buka Dasbor RT'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-100 font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 md:min-h-screen flex flex-col sticky top-0 z-40 max-h-screen overflow-y-auto hide-scrollbar border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3"><span className="text-3xl">🏛️</span><div><h1 className="text-white font-black text-lg leading-tight">Dasbor RT</h1><p className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Admin Area</p></div></div>
        </div>
        <nav className="flex-1 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {[
            { id:'warga', label:'Register Warga', icon:'👥' }, { id:'properti', label:'Data Properti', icon:'🏢' },
            { id:'kas', label:'Buku Kas RT', icon:'💰' }, { id:'pengurus', label:'Tim Pengurus', icon:'👮' },
            { id:'audit', label:'Jejak Audit', icon:'📋' }
          ].map(m => (
            <button key={m.id} onClick={()=>setActiveMenu(m.id as any)} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${activeMenu===m.id?'bg-blue-600 text-white shadow-lg':'hover:bg-slate-800 hover:text-white'}`}><span>{m.icon}</span> <span className="hidden md:inline">{m.label}</span></button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 hidden md:block"><p className="text-[10px] text-slate-500 uppercase font-black">Login Aktif</p><p className="text-xs text-white font-bold truncate">{activeUser?.email}</p></div>
          <button onClick={()=>{window.location.href='/';}} className="w-full py-3 bg-slate-800 hover:bg-red-900 hover:text-red-100 text-slate-400 font-bold text-xs rounded-xl transition-colors">🚪 Keluar Sistem</button>
        </div>
      </aside>

      <section className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {activeMenu === 'warga' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border">
              <div><h2 className="text-xl font-black text-slate-900">Register Kependudukan Warga</h2><p className="text-xs text-slate-500 font-medium mt-1">Total {tenants.length} warga terdata di sistem.</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={filterWarga} onChange={e=>setFilterWarga(e.target.value as any)} className="px-3 py-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-700 outline-none"><option value="all">Semua Warga</option><option value="pending">⏳ Menunggu Sah</option><option value="incomplete">⚠️ Dokumen Kurang</option></select>
                <button onClick={triggerExportWarga} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition-colors">📥 Export Excel</button>
              </div>
            </div>

            <div className="block md:hidden space-y-4">
              {filteredTenants.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border space-y-3 relative overflow-hidden">
                   <div className={`absolute top-0 left-0 w-1.5 h-full ${t.status==='PENDING'?'bg-amber-400':t.status==='VERIFIED'?'bg-emerald-500':'bg-slate-300'}`}></div>
                   <div className="flex justify-between items-start pl-2">
                     <div>
                       <h3 className="font-black text-slate-900 text-base">{t.name}</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{t.properties?.name || <span className="text-red-500 italic">Dihapus</span>} • {t.room_number || '-'}</p>
                     </div>
                     <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${t.status==='PENDING'?'bg-amber-50 text-amber-800 border-amber-200':t.status==='VERIFIED'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {t.status==='PENDING'?'⏳ MENUNGGU':t.status==='VERIFIED'?'✅ SAH':t.status}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 text-xs pl-2 bg-slate-50 p-3 rounded-xl border">
                      <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Telepon</span><span className="font-mono font-semibold">{t.phone}</span></div>
                      <div><span className="text-slate-400 block text-[9px] uppercase font-bold">Status Sipil</span><span className="font-semibold">{t.marital_status}</span></div>
                   </div>

                   <div className="pl-2 pt-2 border-t flex flex-wrap gap-2">
                      {t.ktp_path && <button onClick={()=>openDocument(t.ktp_path, `KTP: ${t.name}`)} className="text-[10px] px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">🔍 KTP</button>}
                      {(t.marriage_doc_url || t.kk_doc_url) && <button onClick={()=>openDocument(t.marriage_doc_url||t.kk_doc_url, `${t.marital_status==='Menikah'?'Buku Nikah/KK':'Kartu Keluarga'}: ${t.name}`)} className="text-[10px] px-3 py-1.5 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200">🔍 {t.marital_status==='Menikah'?'Nikah / KK':'Kartu Keluarga'}</button>}
                   </div>

                   <div className="pl-2 pt-2 flex gap-2">
                     {t.status === 'PENDING' && <button onClick={()=>handleUpdateStatus(t.id, 'active')} className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">Sahkan</button>}
                     {t.status === 'VERIFIED' && <button onClick={()=>handleUpdateStatus(t.id, 'pending')} className="flex-1 py-2 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black rounded-lg uppercase tracking-wider">Batalkan</button>}
                     <button onClick={()=>handleDeleteTenant(t.id)} className="flex-1 py-2 bg-slate-100 text-red-600 text-[10px] font-black rounded-lg border hover:bg-red-50 uppercase tracking-wider">Hapus</button>
                   </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block bg-white border rounded-3xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider border-b"><tr><th className="p-4">Warga</th><th className="p-4">Properti / Kamar</th><th className="p-4">Status Sipil</th><th className="p-4">Dokumen Tersimpan</th><th className="p-4">Status RT</th><th className="p-4 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y">
                {filteredTenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4"><p className="font-black text-slate-900 text-base">{t.name}</p><p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{t.phone} {t.is_head?'(PJ)':'(Anggota)'}</p></td>
                    <td className="p-4"><p className="font-bold text-slate-800">{t.properties?.name || <span className="text-red-500 italic">Dihapus</span>}</p><p className="text-[10px] text-slate-500 font-bold mt-0.5">Kamar: {t.room_number || '-'}</p></td>
                    <td className="p-4"><span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${t.marital_status==='Menikah'?'bg-purple-100 text-purple-800':'bg-slate-100 text-slate-600'}`}>{t.marital_status}</span></td>
                    <td className="p-4 flex gap-2 pt-5">
                      {t.ktp_path && <button onClick={()=>openDocument(t.ktp_path, `KTP: ${t.name}`)} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 hover:bg-blue-100">KTP</button>}
                      {(t.marriage_doc_url || t.kk_doc_url) ? <button onClick={()=>openDocument(t.marriage_doc_url||t.kk_doc_url, `${t.marital_status==='Menikah'?'Buku Nikah/KK':'Kartu Keluarga'}: ${t.name}`)} className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 font-bold rounded border border-purple-200 hover:bg-purple-100">{t.marital_status==='Menikah'?'Nikah / KK':'Kartu Keluarga'}</button> : t.marital_status==='Menikah' ? <span className="text-[10px] px-2 py-1 bg-red-50 text-red-600 font-bold border border-red-200 rounded">KOSONG</span> : null}
                    </td>
                    <td className="p-4"><span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${t.status==='PENDING'?'bg-amber-50 text-amber-800 border-amber-200':t.status==='VERIFIED'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-slate-50 text-slate-600 border-slate-200'}`}>{t.status==='PENDING'?'Menunggu':t.status==='VERIFIED'?'SAH':t.status}</span></td>
                    <td className="p-4 text-right space-x-2">
                      {t.status === 'PENDING' && <button onClick={()=>handleUpdateStatus(t.id, 'active')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">Sahkan</button>}
                      {t.status === 'VERIFIED' && <button onClick={()=>handleUpdateStatus(t.id, 'pending')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 text-xs font-bold rounded-lg transition-colors">Batalkan</button>}
                      <button onClick={()=>handleDeleteTenant(t.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg transition-colors">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
              {filteredTenants.length === 0 && <div className="p-10 text-center text-slate-400 font-bold text-sm">Tidak ada data warga ditemukan.</div>}
            </div>
          </div>
        )}

        {activeMenu === 'properti' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-sm border"><h2 className="text-xl font-black text-slate-900">Database Properti (Kos/Kontrakan)</h2><p className="text-xs text-slate-500 font-medium mt-1">Hanya dikelola oleh Pemilik Properti via Dasbor Owner.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {properties.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md uppercase tracking-wider mb-3 inline-block">{p.type}</span>
                    <h3 className="font-black text-lg text-slate-900 leading-tight">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.address}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Owner:</span><span className="font-black text-slate-700">{p.owner_name} ({p.owner_phone})</span></div>
                    {p.manager_name && <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Pengelola:</span><span className="font-black text-slate-700">{p.manager_name}</span></div>}
                    <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Kapasitas:</span><span className="font-black text-slate-700">{p.total_rooms} Kamar</span></div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-3xl">
                    <div>
                      {isSuperAdmin && <span className="text-[9px] text-slate-400 font-bold uppercase block">PIN AKSES SAAT INI</span>}
                    </div>
                    {isSuperAdmin && (
                      <button onClick={() => handleResetPropPin(p.id, p.pin_code, p.name)} className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-3 py-1.5 rounded-lg border border-amber-300">
                        Ubah PIN
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMenu === 'kas' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-emerald-600 p-6 md:p-8 rounded-3xl shadow-lg text-white">
              <div><h2 className="text-sm font-black text-emerald-100 uppercase tracking-widest mb-1">Saldo Kas Warga RT</h2><p className="text-4xl md:text-5xl font-black">Rp {totalKas.toLocaleString('id-ID')}</p></div>
              <div className="flex gap-2"><button onClick={()=>setShowDuesModal(true)} className="px-5 py-3 bg-white text-emerald-800 text-sm font-black rounded-xl hover:bg-emerald-50 transition-colors shadow-sm">➕ Catat Iuran</button><button onClick={handleExportKas} className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold rounded-xl transition-colors shadow-sm border border-emerald-700">📥 Export Kas</button></div>
            </div>
            <div className="bg-white border rounded-3xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider border-b"><tr><th className="p-4">Tanggal Input</th><th className="p-4">Penyetor</th><th className="p-4">Blok / Unit</th><th className="p-4">Bulan Tagihan</th><th className="p-4 text-right">Nominal (Rp)</th><th className="p-4 text-center">Aksi</th></tr></thead>
              <tbody className="divide-y">
                {dues.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500 font-bold">{new Date(d.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-4 font-black text-slate-900">{d.payer_name}</td>
                    <td className="p-4 font-bold text-slate-700">{d.block_number}</td>
                    <td className="p-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase">{d.period}</span></td>
                    <td className="p-4 font-mono font-black text-emerald-600 text-right">+ {Number(d.amount).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-center"><button onClick={()=>handleDeleteKas(d)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Hapus</button></td>
                  </tr>
                ))}
              </tbody></table>
              {dues.length === 0 && <div className="p-10 text-center text-slate-400 font-bold text-sm">Belum ada catatan iuran kas.</div>}
            </div>
          </div>
        )}

        {activeMenu === 'pengurus' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border">
              <div><h2 className="text-xl font-black text-slate-900">Manajemen Pengurus RT</h2><p className="text-xs text-slate-500 font-medium mt-1">Daftar pengguna yang memiliki akses dasbor ini.</p></div>
              <button onClick={()=>{setEditOfficer(null); setOffName(''); setOffPhone(''); setOffEmail(''); setOffRole('Ketua RT'); setShowOfficerModal(true);}} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">➕ Tambah Akun</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {officers.map(o => {
                const isAjipsas = o.email === 'ajipsas@gmail.com';
                const hakAksesLabel = isAjipsas ? 'SUPER ADMIN' : 'ADMIN';
                const jabatanLabel = isAjipsas ? 'Web Developer' : o.role || 'Pengurus';
                
                return (
                  <div key={o.id} className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${isAjipsas ? 'bg-purple-500':'bg-blue-500'}`}></div>
                    <div className="pl-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${isAjipsas ? 'bg-purple-100 text-purple-800':'bg-blue-100 text-blue-800'}`}>{hakAksesLabel}</span>
                      <h3 className="font-black text-lg text-slate-900 mt-2">{o.full_name} <span className="text-[11px] font-semibold text-slate-500 block">({jabatanLabel})</span></h3>
                      <p className="text-xs text-slate-500 font-mono mt-2">{o.email}</p>
                      <p className="text-xs text-slate-500 font-mono">{o.phone_number}</p>
                      
                      {isSuperAdmin && !isAjipsas && (
                        <div className="mt-4 pt-4 border-t flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>{setEditOfficer(o); setOffName(o.full_name); setOffPhone(o.phone_number); setOffEmail(o.email); setOffRole(o.role || 'Ketua RT'); setShowOfficerModal(true);}} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md hover:bg-slate-200">Edit</button>
                          <button onClick={()=>handleResetAdminPass(o.email)} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md hover:bg-amber-100">Reset Sandi</button>
                          <button onClick={async ()=>{if(confirm('Hapus admin ini?')){await deleteRtOfficer(o.id); setOfficers(officers.filter(x=>x.id!==o.id));}}} className="px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-md hover:bg-red-100">Hapus</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeMenu === 'audit' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-sm border"><h2 className="text-xl font-black text-slate-900">Jejak Audit Keamanan (System Logs)</h2><p className="text-xs text-slate-500 font-medium mt-1">Semua aksi kritis terekam oleh sistem secara mutlak.</p></div>
            <div className="bg-white border rounded-3xl shadow-sm p-2">
              <div className="space-y-2">
                {auditLogs.map(l => (
                  <div key={l.id} className="p-4 rounded-2xl bg-slate-50 flex flex-col md:flex-row gap-3 items-start md:items-center hover:bg-slate-100 transition-colors">
                    <span className="text-[10px] text-slate-400 font-mono font-bold md:w-32">{new Date(l.created_at).toLocaleString('id-ID')}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-black rounded uppercase tracking-wider">{l.action_type}</span><span className="text-[10px] font-bold text-amber-700">👤 {l.performed_by}</span></div>
                      <p className="text-xs text-slate-700 font-medium">{l.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {viewDocUrl && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col animate-fade-in">
          <div className="w-full bg-slate-900 p-4 flex justify-between items-center shadow-md z-10 border-b border-slate-700">
             <h3 className="text-white font-black text-sm">{docModalTitle}</h3>
             <button onClick={()=>setViewDocUrl(null)} className="text-white text-3xl hover:text-red-400 leading-none cursor-pointer p-2 bg-white/10 rounded-lg backdrop-blur-sm">✕</button>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            {viewDocUrl.toLowerCase().includes('.pdf') ? (
              <iframe src={viewDocUrl} className="w-full h-full rounded-xl bg-white" title="Document" />
            ) : (
              <img src={viewDocUrl} alt="Dokumen Resmi" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            )}
          </div>
        </div>
      )}

      {showExportConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border-2 border-amber-500 shadow-2xl">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto">🛡️</div>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-900">Verifikasi Keamanan</h3>
              <p className="text-sm text-slate-600 mt-2">Anda akan mengunduh data sensitif kependudukan. Aksi ini akan dicatat ke dalam <b>Jejak Audit</b>. Lanjutkan?</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={()=>setShowExportConfirm(false)} className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Batal</button>
              <button onClick={executeSecureExport} className="w-1/2 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl transition-colors">Ya, Unduh</button>
            </div>
          </div>
        </div>
      )}

      {showDuesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm border shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 bg-emerald-600 text-white flex justify-between items-center"><h3 className="font-black text-sm">💰 Catat Iuran Warga</h3><button onClick={()=>setShowDuesModal(false)} className="text-xl font-bold hover:text-emerald-200">✕</button></div>
            <form onSubmit={handleAddKas} className="p-6 space-y-4 text-sm bg-slate-50">
              
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <label className="text-[10px] font-black text-emerald-800 uppercase block">Pilih Entitas Penyetor Auto-Fill (Opsional)</label>
                <select value={selectedTenantKas} onChange={e => {
                    const val = e.target.value;
                    setSelectedTenantKas(val);
                    if (!val) { setDuesPayer(''); setDuesBlock(''); return; }

                    if (val.startsWith('owner-')) {
                        const p = properties.find(x => x.id === val.replace('owner-', ''));
                        if (p) {
                            setDuesPayer(p.owner_name || `Pemilik ${p.name}`);
                            setDuesBlock(`Kolektif - ${p.name}`);
                        }
                    } else if (val.startsWith('manager-')) {
                        const p = properties.find(x => x.id === val.replace('manager-', ''));
                        if (p) {
                            setDuesPayer(p.manager_name || `Pengelola ${p.name}`);
                            setDuesBlock(`Kolektif - ${p.name}`);
                        }
                    } else if (val.startsWith('ten-')) {
                        const t = tenants.find(x => x.id === val.replace('ten-', ''));
                        if (t) {
                            setDuesPayer(t.name);
                            setDuesBlock(`${t.properties?.name || 'Kontrakan'} - Kamar ${t.room_number}`);
                        }
                    }
                }} className="w-full p-2 border border-emerald-300 rounded-lg bg-white font-bold text-xs text-emerald-900 outline-none focus:border-emerald-600">
                   <option value="">-- Ketik Manual Atau Pilih Entitas --</option>
                   
                   <optgroup label="Pemilik Kos (Iuran Kolektif)">
                       {properties.filter(p => p.type === 'kos').map(p => (
                           <option key={`owner-${p.id}`} value={`owner-${p.id}`}>{p.owner_name || 'Pemilik'} - {p.name}</option>
                       ))}
                   </optgroup>

                   <optgroup label="Pengelola Kos (Iuran Kolektif)">
                       {properties.filter(p => p.type === 'kos' && p.manager_name && p.manager_name.trim() !== '').map(p => (
                           <option key={`manager-${p.id}`} value={`manager-${p.id}`}>{p.manager_name} - {p.name}</option>
                       ))}
                   </optgroup>
                   
                   <optgroup label="Warga Kontrakan (Iuran Langsung)">
                       {tenants.filter(t => t.is_head && t.properties?.type === 'kontrakan').map(t => (
                           <option key={`ten-${t.id}`} value={`ten-${t.id}`}>{t.name} ({t.properties?.name} - {t.room_number})</option>
                       ))}
                   </optgroup>
                </select>
              </div>

              <input type="text" required placeholder="Nama Penyetor (Cth: Bpk. Budi)" value={duesPayer} onChange={e=>setDuesPayer(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-bold outline-none focus:border-emerald-500" />
              <input type="text" required placeholder="Blok / Kamar (Cth: A-12)" value={duesBlock} onChange={e=>setDuesBlock(e.target.value)} className="w-full p-3 border rounded-xl bg-white font-bold outline-none focus:border-emerald-500" />
              <div className="flex gap-2">
                <select value={duesMonth} onChange={e=>setDuesMonth(e.target.value)} className="flex-1 p-3 border rounded-xl bg-white font-bold outline-none focus:border-emerald-500"><option>Januari</option><option>Februari</option><option>Maret</option><option>April</option><option>Mei</option><option>Juni</option><option>Juli</option><option>Agustus</option><option>September</option><option>Oktober</option><option>November</option><option>Desember</option></select>
                <input type="number" required placeholder="Tahun" value={duesYear} onChange={e=>setDuesYear(e.target.value)} className="w-24 p-3 border rounded-xl bg-white font-bold text-center outline-none focus:border-emerald-500" />
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl"><label className="text-[10px] font-black text-emerald-800 uppercase block mb-1">Nominal Disetor (Rp)</label><input type="text" required value={duesAmount} onChange={e=>setDuesAmount(e.target.value.replace(/\D/g,''))} className="w-full p-2 bg-transparent text-2xl font-black text-emerald-700 font-mono outline-none" /></div>
              <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-colors">Simpan ke Kas</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PENGURUS */}
      {showOfficerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm border shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><h3 className="font-black text-sm">{editOfficer?'Edit Pengurus':'Tambah Pengurus RT'}</h3><button onClick={()=>setShowOfficerModal(false)} className="text-xl font-bold hover:text-red-400">✕</button></div>
            
            <form onSubmit={handleOfficerSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <fieldset className="space-y-4 border p-4 rounded-2xl bg-white border-slate-200">
                <legend className="px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kredensial Pengurus</legend>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nama Lengkap</label>
                  <input type="text" required placeholder="Cth: Budi Santoso" value={offName} onChange={e=>setOffName(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold outline-none focus:border-blue-500" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Jabatan Kepengurusan</label>
                  <select value={offRole} onChange={e=>setOffRole(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold outline-none focus:border-blue-500">
                    <option value="Ketua RT">Ketua RT</option>
                    <option value="Wakil Ketua RT">Wakil Ketua RT</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Seksi Keamanan">Seksi Keamanan</option>
                    <option value="Seksi Humas">Seksi Humas</option>
                    <option value="Pengurus Lainnya">Lainnya...</option>
                  </select>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-blue-900 uppercase">ℹ️ Info Hak Akses Sistem</p>
                  <p className="text-xs text-blue-800 font-medium">Mendapatkan hak akses <b>Standar (Admin)</b>: Bisa membaca data warga, memvalidasi, dan mencatat iuran kas.</p>
                  <p className="text-[10px] text-blue-700 italic">*Akses Super Admin (Ubah PIN, Hapus Data) dikunci hanya untuk Web Developer.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">No. WhatsApp</label>
                  <input type="tel" required placeholder="08xxxxxxxx" value={offPhone} onChange={e=>setOffPhone(e.target.value.replace(/\D/g,''))} className="w-full p-3 border rounded-xl bg-slate-50 font-mono outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Alamat Email</label>
                  <input type="email" required placeholder="Cth: budi@rt.com" value={offEmail} onChange={e=>setOffEmail(e.target.value)} disabled={!!editOfficer} className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:border-blue-500 disabled:bg-slate-200" />
                </div>
                {!editOfficer && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Kata Sandi Akses</label>
                    <input type="text" required placeholder="Buat Kata Sandi (Min. 6 Karakter)" minLength={6} value={offPass} onChange={e=>setOffPass(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold outline-none focus:border-blue-500" />
                  </div>
                )}
              </fieldset>
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-colors">Simpan Akun</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}