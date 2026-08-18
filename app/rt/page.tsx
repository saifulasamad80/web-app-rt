'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getRtDashboardBundle, updateTenantStatus, deleteTenant, getDocumentSignedUrl, updateProperty, recordRtDues, deleteRtDues, addRtOfficer, updateRtOfficer, deleteRtOfficer, resetOfficerPasswordBySuperAdmin } from '../../src/actions/checkin-tenant';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function RtDashboardPage() {
  const [activeTab, setActiveTab] = useState('warga');
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [duesList, setDuesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  const [docModalUrl, setDocModalUrl] = useState<string | null>(null);
  const [docModalTitle, setDocModalTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<any | null>(null);
  const [officerName, setOfficerName] = useState(''); const [officerRole, setOfficerRole] = useState('SEKRETARIS'); const [officerPhone, setOfficerPhone] = useState(''); const [officerEmail, setOfficerEmail] = useState(''); const [officerInitialPassword, setOfficerInitialPassword] = useState('admin12345'); const [savingOfficer, setSavingOfficer] = useState(false);

  const [resetOfficerTarget, setResetOfficerTarget] = useState<any | null>(null); const [officerNewPassword, setOfficerNewPassword] = useState(''); const [resettingPassword, setResettingPassword] = useState(false);

  const [payerName, setPayerName] = useState(''); const [unitRoom, setUnitRoom] = useState(''); const [duesAmount, setDuesAmount] = useState('30000'); const [duesMonth, setDuesMonth] = useState('Agustus'); const [duesYear, setDuesYear] = useState(new Date().getFullYear().toString()); const [savingDues, setSavingDues] = useState(false);

  const loadAllData = async () => {
    const bundle = await getRtDashboardBundle();
    if(bundle.success) { setTenants(bundle.tenants || []); setProperties(bundle.properties || []); setOfficers(bundle.officers || []); setDuesList(bundle.dues || []); setAuditLogs(bundle.auditLogs || []); }
  };

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session && !localStorage.getItem('rt_admin_logged_in')) { window.location.href = '/login'; return; }
      setCurrentUserEmail(data.session?.user?.email || '');
      await loadAllData(); setAuthChecking(false);
    }
    init();
  }, []);

  const handleVerifyTenant = async (id: string, status: 'verified' | 'rejected' | 'pending') => {
    const label = status === 'pending' ? 'Batal Verifikasi (Kembali ke Pending)' : status;
    if (confirm(`Ubah status warga ini menjadi: ${label.toUpperCase()}?`)) {
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: status.toUpperCase() } : t));
      await updateTenantStatus(id, status); await loadAllData();
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (confirm(`Hapus warga "${name}" dari sistem?`)) { setTenants(prev => prev.filter(t => t.id !== id)); await deleteTenant(id); }
  };

  const handleViewDocument = async (filePath: string, title: string) => {
    setDocModalTitle(title); const res = await getDocumentSignedUrl(filePath);
    if (res.success && res.url) setDocModalUrl(res.url); else alert('Gagal muat dokumen.');
  };

  const handleExportWarga = () => {
    const rows = filteredTenants.map(t => [ `"${t.name||""}"`, `"${t.phone||""}"`, `"${t.relation||(t.is_head?"PJ":"Anggota")}"`, `"${t.properties?.name||""}"`, `"${t.room_number||""}"`, `"${t.entry_date||""}"`, `"${t.marital_status||""}"`, `"${t.status||"PENDING"}"` ]);
    const csvContent = [["Nama", "WA", "Peran", "Properti", "Kamar", "Tgl Masuk", "Status Nikah", "Status RT"].join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Data_Warga_RT.csv`); document.body.appendChild(link); link.click();
  };

  const handleExportAudit = () => {
    const rows = auditLogs.map(l => [`"${new Date(l.created_at).toLocaleString()}"`, `"${l.action_type}"`, `"${l.performed_by}"`, `"${l.details}"`]);
    const csv = [["Waktu", "Aksi", "Pelaksana", "Detail"].join(","), ...rows.map(r=>r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `Audit_Log_RT.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setResettingPassword(true); const res = await resetOfficerPasswordBySuperAdmin(resetOfficerTarget.email, officerNewPassword, currentUserEmail); setResettingPassword(false);
    if (res.success) { alert(`Sandi berhasil direset.`); setResetOfficerTarget(null); setOfficerNewPassword(''); await loadAllData(); }
  };

  const handleOfficerFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingOfficer(true);
    if (editingOfficer) { await updateRtOfficer(editingOfficer.id, officerName, officerRole, officerPhone, officerEmail); } 
    else { await addRtOfficer(officerName, officerRole, officerPhone, officerEmail, officerInitialPassword); }
    setSavingOfficer(false); setShowAddOfficerModal(false); setEditingOfficer(null); await loadAllData();
  };

  const handleRecordDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingDues(true); const parsedAmount = parseInt(duesAmount.replace(/\D/g, ''), 10) || 0;
    await recordRtDues(payerName, unitRoom, parsedAmount, duesMonth, duesYear, 'Pengurus RT');
    setSavingDues(false); setPayerName(''); setUnitRoom(''); await loadAllData();
  };

  const isSuperAdmin = currentUserEmail.toLowerCase() === 'ajipsas@gmail.com';
  const isFamilyDocMissing = (t: any) => {
    const marital = (t.marital_status || '').toLowerCase();
    if (marital !== 'menikah' && marital !== 'menikah (pasutri)') return false;
    if (t.marriage_doc_url || t.kk_doc_url) return false;
    const pj = tenants.find((item) => item.household_id && item.household_id === t.household_id && item.is_head);
    if (pj && (pj.marriage_doc_url || pj.kk_doc_url)) return false;
    return true;
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.phone || '').includes(searchQuery) || (t.room_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const st = (t.status || '').toUpperCase();
    if (filterStatus === 'PENDING') return matchesSearch && st === 'PENDING';
    if (filterStatus === 'VERIFIED') return matchesSearch && (st === 'VERIFIED' || st === 'ACTIVE');
    if (filterStatus === 'DOC_PENDING') return matchesSearch && isFamilyDocMissing(t);
    return matchesSearch;
  });

  const countPending = tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING').length;
  const countVerified = tenants.filter((t) => (t.status || '').toUpperCase() === 'VERIFIED' || (t.status || '').toUpperCase() === 'ACTIVE').length;
  const countDocPending = tenants.filter((t) => isFamilyDocMissing(t) && t.is_head).length;
  const totalKasTerkumpul = duesList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400">Loading Dashboard...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col md:min-h-screen flex-shrink-0 shadow-xl z-10 sticky top-0">
        <div className="p-6 border-b border-slate-800 bg-slate-950">
          <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-1 rounded">Admin RT</span>
          <h1 className="text-xl font-black mt-3">Dasbor<br/>Terpadu</h1>
          <p className="text-[10px] text-slate-400 mt-2 truncate">{currentUserEmail}</p>
        </div>
        <nav className="flex-1 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <button onClick={()=>setActiveTab('warga')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm ${activeTab==='warga'?'bg-emerald-600':'hover:bg-slate-800 text-slate-400'}`}>👥 Data Warga</button>
          <button onClick={()=>setActiveTab('properti')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm ${activeTab==='properti'?'bg-blue-600':'hover:bg-slate-800 text-slate-400'}`}>🏢 Unit Kos</button>
          <button onClick={()=>setActiveTab('pengurus')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm ${activeTab==='pengurus'?'bg-purple-600':'hover:bg-slate-800 text-slate-400'}`}>⚙️ Pengurus</button>
          <button onClick={()=>setActiveTab('kas')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm ${activeTab==='kas'?'bg-amber-500 text-slate-900':'hover:bg-slate-800 text-slate-400'}`}>💰 Kas & Iuran</button>
          <button onClick={()=>setActiveTab('audit')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm ${activeTab==='audit'?'bg-slate-700':'hover:bg-slate-800 text-slate-400'}`}>📋 Jejak Audit</button>
          <div className="flex-1 hidden md:block"></div>
          <button onClick={()=>{localStorage.removeItem('rt_admin_logged_in'); window.location.href='/';}} className="flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm text-red-400 hover:bg-red-950 mt-auto">🚪 Keluar</button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 mb-6">
          <div className="bg-white border p-5 md:p-6 rounded-3xl shadow-sm text-center"><span className="text-4xl font-black text-slate-900 block">{tenants.length}</span><span className="text-[10px] font-black text-slate-400 uppercase mt-2 block">Total Warga</span></div>
          <div className="bg-amber-50 border border-amber-200 p-5 md:p-6 rounded-3xl shadow-sm text-center"><span className="text-4xl font-black text-amber-700 block">{countPending}</span><span className="text-[10px] font-black text-amber-600 uppercase mt-2 block">Menunggu Verif</span></div>
          <div className="bg-emerald-50 border border-emerald-200 p-5 md:p-6 rounded-3xl shadow-sm text-center"><span className="text-4xl font-black text-emerald-700 block">{countVerified}</span><span className="text-[10px] font-black text-emerald-600 uppercase mt-2 block">Terverifikasi</span></div>
          <div className="bg-red-50 border border-red-200 p-5 md:p-6 rounded-3xl shadow-sm text-center"><span className="text-4xl font-black text-red-700 block">{countDocPending}</span><span className="text-[10px] font-black text-red-600 uppercase mt-2 block">Dokumen Kurang</span></div>
        </div>

        {/* TAB 1: WARGA */}
        {activeTab === 'warga' && (
          <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5 gap-4">
              <div><h2 className="text-2xl font-black text-slate-900">Buku Register Warga</h2></div>
              <button onClick={handleExportWarga} className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md">📥 Export Data (CSV)</button>
            </div>
            
            <div className="flex flex-col xl:flex-row gap-3 bg-slate-50 p-3 rounded-2xl border mt-4">
              <input type="text" placeholder="🔍 Cari nama, No WA, kamar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 p-3 border rounded-xl outline-none text-sm" />
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>setFilterStatus('ALL')} className={`px-4 py-3 rounded-xl text-xs font-black ${filterStatus==='ALL'?'bg-slate-800 text-white':'bg-white text-slate-600 border'}`}>SEMUA</button>
                <button onClick={()=>setFilterStatus('PENDING')} className={`px-4 py-3 rounded-xl text-xs font-black ${filterStatus==='PENDING'?'bg-amber-400 text-amber-950':'bg-white text-amber-700 border'}`}>MENUNGGU</button>
                <button onClick={()=>setFilterStatus('DOC_PENDING')} className={`px-4 py-3 rounded-xl text-xs font-black ${filterStatus==='DOC_PENDING'?'bg-red-600 text-white':'bg-white text-red-600 border'}`}>DOKUMEN KURANG</button>
              </div>
            </div>

            <div className="overflow-x-auto pt-4">
              <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y"><tr><th className="p-4">Identitas Warga</th><th className="p-4">Kamar / Unit</th><th className="p-4">Status Sipil</th><th className="p-4">Berkas (UU PDP)</th><th className="p-4">Status RT</th><th className="p-4 text-right">Aksi</th></tr></thead>
                <tbody className="divide-y">
                  {filteredTenants.map(t => {
                    const pj = tenants.find(item => item.household_id && item.household_id === t.household_id && item.is_head);
                    const marital = (t.marital_status || '').toLowerCase();
                    const isMarried = marital === 'menikah' || marital === 'menikah (pasutri)';
                    const hasKtp = !!t.ktp_path;
                    
                    // FIX: Show document ONLY if the tenant is head OR if they actually uploaded it. Don't show dummy button for members if they didn't upload.
                    const showMarriage = isMarried && (t.is_head || t.marriage_doc_url) && !!(t.marriage_doc_url || pj?.marriage_doc_url);
                    const showKk = (t.is_head || t.kk_doc_url) && !!(t.kk_doc_url || pj?.kk_doc_url);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-4"><div className="font-black text-base">{t.name}</div><div className="text-xs text-slate-500 font-mono">{t.phone||'Tak ada kontak'}</div><div className="mt-1"><span className={`text-[10px] font-black px-2 py-1 rounded border ${t.is_head?'bg-blue-50 text-blue-800':'bg-white text-slate-500'}`}>{t.relation||(t.is_head?'Penanggung Jawab':'Anggota')}</span></div></td>
                        <td className="p-4"><span className="font-black text-sm block">{t.room_number||'-'}</span><span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{t.properties?.name||'Kos'}</span></td>
                        <td className="p-4 font-bold text-slate-600">{t.marital_status||'Lajang'}</td>
                        <td className="p-4 space-x-2">
                          {hasKtp ? <button onClick={()=>handleViewDocument(t.ktp_path, 'KTP Resmi')} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg font-black">🪪 KTP</button> : <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">KTP -</span>}
                          {showMarriage ? <button onClick={()=>handleViewDocument(t.marriage_doc_url || pj?.marriage_doc_url, 'Buku Nikah Pasutri')} className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] rounded-lg font-black">📎 NIKAH</button> : (t.is_head && isMarried ? <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-300 font-bold bg-slate-50 px-2 py-1 rounded">NIKAH -</span>)}
                          {showKk ? <button onClick={()=>handleViewDocument(t.kk_doc_url || pj?.kk_doc_url, 'Kartu Keluarga')} className="px-3 py-1.5 bg-blue-100 text-blue-900 border border-blue-300 text-[10px] rounded-lg font-black">📁 KK</button> : (t.is_head ? <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-300 font-bold bg-slate-50 px-2 py-1 rounded">KK -</span>)}
                        </td>
                        <td className="p-4"><span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border ${t.status==='VERIFIED'||t.status==='ACTIVE'?'bg-emerald-50 text-emerald-800 border-emerald-200':t.status==='REJECTED'?'bg-red-50 text-red-800 border-red-200':'bg-amber-50 text-amber-800 border-amber-200'}`}>{t.status==='VERIFIED'||t.status==='ACTIVE'?'✅ Sah Terverifikasi':t.status==='REJECTED'?'❌ Ditolak':'⏳ Menunggu'}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col gap-1 items-end">
                            {t.status!=='VERIFIED' && t.status!=='ACTIVE' && <button onClick={()=>handleVerifyTenant(t.id, 'verified')} className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-sm">Setujui</button>}
                            {(t.status==='VERIFIED'||t.status==='ACTIVE') && <button onClick={()=>handleVerifyTenant(t.id, 'pending')} className="px-3 py-1.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-300">Batal Verif (Pending)</button>}
                            <button onClick={()=>handleDeleteTenant(t.id, t.name)} className="px-3 py-1.5 bg-white border text-slate-700 text-[10px] font-bold rounded-lg mt-1">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PROPERTI KOS */}
        {activeTab === 'properti' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border space-y-5">
            <h2 className="text-2xl font-black border-b pb-4">Daftar Properti Kos</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-2">
              {properties.map((prop) => (
                <div key={prop.id} className="p-6 rounded-3xl border bg-slate-50 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] font-black px-2.5 py-1 bg-white border rounded uppercase inline-block">{prop.type} • {prop.total_rooms||10} Kamar</span>
                    <h4 className="font-black text-xl">{prop.name||prop.property_name}</h4>
                    <p className="text-xs text-slate-500 bg-white p-2 border rounded-lg">📍 {prop.address || 'Alamat tidak diisi'}</p>
                    <div className="bg-white p-4 rounded-2xl border text-xs text-slate-600 space-y-2">
                      <p>👤 <b>Owner (Sari):</b> <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">{prop.owner_phone||'-'}</span></p>
                      <p>🔑 <b>Pengelola (Asep):</b> <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">{prop.manager_phone||'-'}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PENGURUS */}
        {activeTab === 'pengurus' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border space-y-5">
            <div className="flex justify-between items-center border-b pb-4"><h2 className="text-2xl font-black">Manajemen Pengurus RT</h2>{isSuperAdmin && <button onClick={()=>{setEditingOfficer(null);setOfficerName('');setOfficerPhone('');setOfficerEmail('');setShowAddOfficerModal(true);}} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-md">➕ Tambah Pengurus</button>}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {officers.map((off) => (
                <div key={off.id} className="p-5 bg-white rounded-3xl border space-y-4 shadow-sm">
                  <div className="flex justify-between items-start"><span className="font-black text-lg">{off.full_name}</span><span className="text-[10px] font-black bg-blue-50 text-blue-800 border px-2.5 py-1 rounded-md uppercase">{off.role}</span></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border text-xs font-mono text-slate-600 space-y-2"><p>WA: <b className="text-slate-900">{off.phone_number||'-'}</b></p><p>Email: <b className="text-slate-900">{off.email||'-'}</b></p></div>
                  {isSuperAdmin && (
                    <div className="pt-4 border-t flex gap-2 justify-end">
                      {off.email && <button onClick={()=>{setResetOfficerTarget(off); setOfficerNewPassword('admin12345');}} className="px-4 py-2 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl">Reset Sandi</button>}
                      <button onClick={()=>{setEditingOfficer(off); setOfficerName(off.full_name); setOfficerRole(off.role); setOfficerPhone(off.phone_number||''); setOfficerEmail(off.email||''); setShowAddOfficerModal(true);}} className="px-4 py-2 bg-white border text-xs font-bold rounded-xl">Edit Profil</button>
                      {off.role!=='SUPER_ADMIN' && <button onClick={()=>handleDeleteOfficer(off.id, off.full_name)} className="px-4 py-2 bg-red-50 text-red-600 border text-xs font-bold rounded-xl">Hapus</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: KAS RT */}
        {activeTab === 'kas' && (
          <div className="space-y-6">
            <div className="bg-emerald-800 p-8 rounded-3xl text-white shadow-lg"><p className="text-xs font-black text-emerald-300 uppercase tracking-widest mb-1">Total Saldo Kas Masuk</p><h3 className="text-4xl md:text-5xl font-black">Rp {totalKasTerkumpul.toLocaleString('id-ID')}</h3></div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl border xl:col-span-1 h-fit">
                <h2 className="text-lg font-black border-b pb-3 mb-4">➕ Catat Iuran Baru</h2>
                <form onSubmit={handleRecordDuesSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="font-bold block mb-1">Pilih Penyetor Warga/Owner</label>
                    <select required value={payerName} onChange={e=>setPayerName(e.target.value)} className="w-full p-3.5 border rounded-xl bg-slate-50 outline-none">
                      <option value="">Pilih Nama...</option>
                      {properties.map(p => <option key={p.id} value={p.owner_name||p.name}>Owner: {p.owner_name||p.name}</option>)}
                      {tenants.map(t => <option key={t.id} value={t.name}>Warga: {t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Pilih Blok/Kamar</label>
                    <select required value={unitRoom} onChange={e=>setUnitRoom(e.target.value)} className="w-full p-3.5 border rounded-xl bg-slate-50 outline-none">
                      <option value="">Pilih Properti / Kamar...</option>
                      {properties.map(p => <option key={p.id} value={p.name}>Properti: {p.name}</option>)}
                      {tenants.map(t => <option key={t.id} value={t.room_number||'Kamar'}>Kamar: {t.room_number} ({t.name})</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3"><div className="flex-1"><label className="font-bold block mb-1">Bulan</label><select value={duesMonth} onChange={e=>setDuesMonth(e.target.value)} className="w-full p-3.5 border rounded-xl bg-slate-50"><option>Januari</option><option>Februari</option><option>Maret</option><option>April</option><option>Mei</option><option>Juni</option><option>Juli</option><option>Agustus</option><option>September</option><option>Oktober</option><option>November</option><option>Desember</option></select></div><div className="w-1/3"><label className="font-bold block mb-1">Tahun</label><input type="text" required value={duesYear} onChange={e=>setDuesYear(e.target.value)} className="w-full p-3.5 border rounded-xl bg-slate-50 font-mono text-center" /></div></div>
                  <div className="pt-2"><label className="font-bold block mb-1 text-emerald-900 text-[10px]">Nominal Transaksi (Rp)</label><input type="text" required value={duesAmount} onChange={e=>setDuesAmount(e.target.value.replace(/\D/g,''))} className="w-full p-4 border border-emerald-400 bg-emerald-50 rounded-2xl font-mono text-2xl font-black text-emerald-900" /></div>
                  <button type="submit" disabled={savingDues} className="w-full py-4 bg-emerald-700 text-white font-black rounded-2xl">✅ Simpan Ke Buku Kas</button>
                </form>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-3xl border xl:col-span-2">
                <h2 className="text-lg font-black border-b pb-3 mb-4">Riwayat Iuran Masuk</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y"><tr><th className="p-4">Tanggal</th><th className="p-4">Nama Penyetor</th><th className="p-4">Blok / Lokasi</th><th className="p-4">Periode</th><th className="p-4 text-right">Nominal (Rp)</th><th className="p-4 text-center">Aksi</th></tr></thead>
                    <tbody className="divide-y">
                      {duesList.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50"><td className="p-4 text-xs font-mono text-slate-500">{new Date(d.created_at).toLocaleDateString()}</td><td className="p-4 font-black">{d.payer_name}</td><td className="p-4 font-bold text-slate-600">{d.block_number}</td><td className="p-4"><span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-1 rounded">{d.period}</span></td><td className="p-4 font-mono font-black text-right">Rp {Number(d.amount).toLocaleString()}</td><td className="p-4 text-center"><button onClick={()=>handleDeleteDuesRow(d.id, d.payer_name, d.amount)} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-lg">Batal</button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl border space-y-5">
            <div className="flex justify-between items-center border-b pb-4"><h2 className="text-2xl font-black">Jejak Audit Keamanan (System Log)</h2><button onClick={handleExportAudit} className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md">📥 Export Audit (CSV)</button></div>
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-y"><tr><th className="p-4">Waktu</th><th className="p-4">Aksi Sistem</th><th className="p-4">Pelaksana</th><th className="p-4">Detail Aktivitas</th></tr></thead>
                <tbody className="divide-y">
                  {auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50"><td className="p-4 text-xs font-mono">{new Date(l.created_at).toLocaleString()}</td><td className="p-4"><span className="px-2 py-1 bg-slate-800 text-white rounded text-[10px] font-black">{l.action_type}</span></td><td className="p-4 font-black">{l.performed_by}</td><td className="p-4 font-medium text-slate-600">{l.details}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah Pengurus */}
      {showAddOfficerModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border"><div className="p-5 bg-emerald-800 text-white flex justify-between"><h3 className="font-black text-base">{editingOfficer?'Edit Pengurus':'Daftar Pengurus Baru'}</h3><button onClick={()=>{setShowAddOfficerModal(false);setEditingOfficer(null);}} className="text-xl">✕</button></div>
            <form onSubmit={handleOfficerFormSubmit} className="p-6 space-y-4 bg-slate-50">
              <input type="text" required placeholder="Cth: Pak Budi" value={officerName} onChange={e=>setOfficerName(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
              <select value={officerRole} onChange={e=>setOfficerRole(e.target.value)} className="w-full p-3 border rounded-xl font-bold"><option value="SEKRETARIS">Sekretaris RT</option><option value="BENDAHARA">Bendahara RT</option></select>
              <input type="tel" required placeholder="08xxxxxxxx" value={officerPhone} onChange={e=>setOfficerPhone(e.target.value.replace(/\D/g,''))} className="w-full p-3 border rounded-xl font-mono" />
              <input type="email" required placeholder="email@domain.com" value={officerEmail} onChange={e=>setOfficerEmail(e.target.value)} className="w-full p-3 border rounded-xl" />
              {!editingOfficer && (<input type="text" required placeholder="Sandi Default" value={officerInitialPassword} onChange={e=>setOfficerInitialPassword(e.target.value)} className="w-full p-3 border rounded-xl font-mono" />)}
              <button type="submit" disabled={savingOfficer} className="w-full py-4 bg-emerald-700 text-white font-black rounded-xl">Simpan Data Pengurus</button>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX DOKUMEN FIX CLOSE */}
      {docModalUrl && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-[9999]">
          <button onClick={() => setDocModalUrl(null)} className="absolute top-6 right-6 text-white w-14 h-14 bg-red-600 rounded-full text-3xl font-black flex items-center justify-center shadow-2xl cursor-pointer hover:bg-red-700 z-[10000]">✕</button>
          <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
            <h3 className="text-white text-sm font-black uppercase mb-4 pointer-events-auto">{docModalTitle}</h3>
            <img src={docModalUrl} alt="Dokumen Resmi" className="max-w-full max-h-[75vh] object-contain rounded-2xl pointer-events-auto" />
          </div>
        </div>
      )}
    </div>
  );
}