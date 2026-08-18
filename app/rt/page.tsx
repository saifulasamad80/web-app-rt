'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  getRtDashboardBundle, updateTenantStatus, deleteTenant, getDocumentSignedUrl,
  updateProperty, recordRtDues, deleteRtDues, addRtOfficer, updateRtOfficer, deleteRtOfficer, resetOfficerPasswordBySuperAdmin
} from '../../src/actions/checkin-tenant';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function RtDashboardPage() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [activeTab, setActiveTab] = useState('warga');
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  // Data State
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [duesList, setDuesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // UI State
  const [docModalUrl, setDocModalUrl] = useState<string | null>(null);
  const [docModalTitle, setDocModalTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal States
  const [resetProp, setResetProp] = useState<any | null>(null);
  const [newPin, setNewPin] = useState('1234');
  const [savingPin, setSavingPin] = useState(false);

  const [resetOfficerTarget, setResetOfficerTarget] = useState<any | null>(null);
  const [officerNewPassword, setOfficerNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<any | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [officerRole, setOfficerRole] = useState('SEKRETARIS');
  const [officerPhone, setOfficerPhone] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerInitialPassword, setOfficerInitialPassword] = useState('admin12345');
  const [savingOfficer, setSavingOfficer] = useState(false);

  const [payerName, setPayerName] = useState('');
  const [unitRoom, setUnitRoom] = useState('');
  const [duesAmount, setDuesAmount] = useState('30000');
  const [duesMonth, setDuesMonth] = useState('Agustus');
  const [duesYear, setDuesYear] = useState(new Date().getFullYear().toString());
  const [savingDues, setSavingDues] = useState(false);

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const loadAllData = async () => {
    const bundle = await getRtDashboardBundle();
    if(bundle.success) {
      setTenants(bundle.tenants || []); setProperties(bundle.properties || []);
      setOfficers(bundle.officers || []); setDuesList(bundle.dues || []); setAuditLogs(bundle.auditLogs || []);
    }
  };

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session && !localStorage.getItem('rt_admin_logged_in')) { window.location.href = '/login'; return; }
      setCurrentUserEmail(data.session?.user?.email || 'ajipsas@gmail.com');
      await loadAllData();
      setAuthChecking(false);
    }
    init();
  }, []);

  // --- ACTIONS ---
  const handleVerifyTenant = async (id: string, status: 'verified' | 'rejected') => {
    if (confirm(`Ubah status warga menjadi: ${status.toUpperCase()}?`)) {
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: status === 'verified' ? 'VERIFIED' : 'REJECTED' } : t));
      await updateTenantStatus(id, status); await loadAllData();
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (confirm(`Hapus permanen warga "${name}" dari buku register RT?`)) { setTenants(prev => prev.filter(t => t.id !== id)); await deleteTenant(id); await loadAllData(); }
  };

  const handleViewDocument = async (filePath: string, title: string) => {
    setDocModalTitle(title); const res = await getDocumentSignedUrl(filePath);
    if (res.success && res.url) setDocModalUrl(res.url); else alert('Gagal memuat dokumen.');
  };

  const handleExportWarga = () => {
    const headers = ["Nama Lengkap", "No WhatsApp", "Peran", "Properti", "Kamar", "Tanggal Masuk", "Status Pernikahan", "Status RT"];
    const rows = filteredTenants.map(t => [ `"${t.name||""}"`, `"${t.phone||""}"`, `"${t.relation||(t.is_head?"PJ":"Anggota")}"`, `"${t.properties?.name||t.properties?.property_name||""}"`, `"${t.room_number||""}"`, `"${t.entry_date||""}"`, `"${t.marital_status||""}"`, `"${t.status||"PENDING"}"` ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Laporan_Warga_RT.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleSaveResetPin = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPin(true); const res = await updateProperty(resetProp.id, { pin_code: newPin }); setSavingPin(false);
    if (res.success) { alert(`PIN direset menjadi: ${newPin}`); setResetProp(null); await loadAllData(); }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setResettingPassword(true); const res = await resetOfficerPasswordBySuperAdmin(resetOfficerTarget.email, officerNewPassword, currentUserEmail); setResettingPassword(false);
    if (res.success) { alert(`Kata sandi berhasil direset.`); setResetOfficerTarget(null); setOfficerNewPassword(''); await loadAllData(); }
  };

  const handleOfficerFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingOfficer(true);
    if (editingOfficer) { await updateRtOfficer(editingOfficer.id, officerName, officerRole, officerPhone, officerEmail); } 
    else { await addRtOfficer(officerName, officerRole, officerPhone, officerEmail, officerInitialPassword); }
    setSavingOfficer(false); setShowAddOfficerModal(false); setEditingOfficer(null); await loadAllData();
  };

  const handleDeleteOfficer = async (id: string, name: string) => {
    if (confirm(`Hapus pengurus "${name}"?`)) { await deleteRtOfficer(id); await loadAllData(); }
  };

  const handleRecordDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingDues(true); const parsedAmount = parseInt(duesAmount.replace(/\D/g, ''), 10) || 0;
    await recordRtDues(payerName, unitRoom, parsedAmount, duesMonth, duesYear, 'Pengurus RT');
    setSavingDues(false); setPayerName(''); setUnitRoom(''); await loadAllData();
  };

  const handleDeleteDuesRow = async (id: string, name: string, amount: number) => {
    if (confirm(`Batalkan iuran dari ${name}?`)) { await deleteRtDues(id, name, amount); await loadAllData(); }
  };

  // --- UTILS & PERHITUNGAN VARIABEL (YANG KEMARIN ERROR/HILANG) ---
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

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-500">Memuat Dasbor RT...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans" style={{ fontSize: `${zoomPercent}%` }}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col md:min-h-screen flex-shrink-0 shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest bg-amber-900/30 px-2 py-1 rounded">Admin RT</span>
          <h1 className="text-xl font-black text-white mt-3">Dasbor Terpadu</h1>
          <p className="text-[10px] text-slate-400 mt-2 font-mono truncate">{currentUserEmail}</p>
        </div>
        
        {/* FITUR ZOOM DIKEMBALIKAN */}
        <div className="p-4 border-b border-slate-800">
          <div className="bg-slate-800 p-1.5 rounded-xl border border-slate-700 flex justify-between items-center shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 px-2">Zoom</span>
            <div className="flex items-center gap-1">
              <button onClick={handleZoomOut} className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-700 text-slate-200 hover:bg-amber-400 hover:text-slate-900 cursor-pointer">A-</button>
              <span className="text-[10px] font-mono font-black text-amber-300 px-1">{zoomPercent}%</span>
              <button onClick={handleZoomIn} className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-700 text-slate-200 hover:bg-amber-400 hover:text-slate-900 cursor-pointer">A+</button>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <button onClick={()=>setActiveTab('warga')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='warga'?'bg-emerald-600 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>👥 Data Warga</button>
          <button onClick={()=>setActiveTab('properti')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='properti'?'bg-emerald-600 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>🏢 Unit Kos</button>
          <button onClick={()=>setActiveTab('pengurus')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='pengurus'?'bg-emerald-600 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>⚙️ Pengurus</button>
          <button onClick={()=>setActiveTab('kas')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='kas'?'bg-emerald-600 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>💰 Kas & Iuran</button>
          <button onClick={()=>setActiveTab('audit')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='audit'?'bg-emerald-600 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>📋 Jejak Audit</button>
          <div className="flex-1 hidden md:block"></div>
          <button onClick={()=>{localStorage.removeItem('rt_admin_logged_in'); supabase.auth.signOut().then(()=>window.location.href='/');}} className="flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-950/50 transition-colors mt-auto cursor-pointer">🚪 Keluar</button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        
        {/* KOTAK INFORMASI RT DIKEMBALIKAN */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white border-2 border-slate-200 p-4 md:p-5 rounded-3xl shadow-sm text-center"><span className="text-3xl font-black text-slate-900 block">{tenants.length}</span><span className="text-[10px] font-black text-slate-500 mt-1 block uppercase">Total Warga Terdata</span></div>
          <div className="bg-amber-50 border-2 border-amber-300 p-4 md:p-5 rounded-3xl shadow-sm text-center"><span className="text-3xl font-black text-amber-950 block">{countPending}</span><span className="text-[10px] font-black text-amber-800 mt-1 block uppercase">Menunggu Verifikasi</span></div>
          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 md:p-5 rounded-3xl shadow-sm text-center"><span className="text-3xl font-black text-emerald-950 block">{countVerified}</span><span className="text-[10px] font-black text-emerald-800 mt-1 block uppercase">Resmi Terverifikasi</span></div>
          <div className="bg-red-50 border-2 border-red-300 p-4 md:p-5 rounded-3xl shadow-sm text-center"><span className="text-3xl font-black text-red-950 block">{countDocPending}</span><span className="text-[10px] font-black text-red-800 mt-1 block uppercase">Dokumen Kurang</span></div>
        </div>

        {/* TAB 1: WARGA */}
        {activeTab === 'warga' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 border-b pb-4 gap-4">
              <div><h2 className="text-xl font-black text-slate-900">Buku Register Warga</h2><p className="text-sm text-slate-500 mt-1">Verifikasi dokumen kependudukan sesuai UU PDP.</p></div>
              <button onClick={handleExportWarga} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors whitespace-nowrap">📥 Export Excel</button>
            </div>
            
            {/* Filter Warga */}
            <div className="flex flex-col md:flex-row gap-3">
              <input type="text" placeholder="🔍 Cari nama, No WA, kamar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 p-2.5 border border-slate-300 rounded-xl outline-none text-sm bg-slate-50 focus:border-emerald-500" />
              <div className="flex gap-2">
                <button onClick={()=>setFilterStatus('ALL')} className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${filterStatus==='ALL'?'bg-slate-900 text-white':'bg-slate-100 text-slate-700'}`}>Semua</button>
                <button onClick={()=>setFilterStatus('PENDING')} className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${filterStatus==='PENDING'?'bg-amber-400 text-slate-900':'bg-amber-50 text-amber-900'}`}>Menunggu</button>
                <button onClick={()=>setFilterStatus('DOC_PENDING')} className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${filterStatus==='DOC_PENDING'?'bg-red-600 text-white':'bg-red-50 text-red-900'}`}>Dokumen Kurang</button>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                  <tr><th className="p-4 rounded-tl-xl">Warga & Kontak</th><th className="p-4">Kamar</th><th className="p-4">Status Sipil</th><th className="p-4">Dokumen (UU PDP)</th><th className="p-4">Status RT</th><th className="p-4 text-right rounded-tr-xl">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map(t => {
                    const pj = tenants.find(item => item.household_id && item.household_id === t.household_id && item.is_head);
                    const marital = (t.marital_status || '').toLowerCase();
                    const isMarried = marital === 'menikah' || marital === 'menikah (pasutri)';
                    const hasKtp = !!t.ktp_path;
                    const showMarriage = isMarried && !!(t.marriage_doc_url || pj?.marriage_doc_url);
                    const showKk = t.is_head && !!(t.kk_doc_url || pj?.kk_doc_url);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-black text-slate-900 text-base">{t.name}</div><span className="text-xs text-slate-500 font-mono">{t.phone||'-'}</span>
                          <div className="mt-1"><span className={`text-[10px] font-black px-2 py-0.5 rounded border ${t.is_head?'bg-amber-100 text-amber-800 border-amber-200':'bg-white text-slate-600'}`}>{t.relation||(t.is_head?'PJ':'Anggota')}</span></div>
                        </td>
                        <td className="p-4 font-bold text-slate-700">{t.room_number||'-'}<br/><span className="text-[10px] text-slate-400 font-normal">{t.properties?.name||'Kos'}</span></td>
                        <td className="p-4 font-semibold text-slate-700">{t.marital_status||'Lajang'}</td>
                        <td className="p-4 space-x-2">
                          {hasKtp ? <button onClick={()=>handleViewDocument(t.ktp_path, 'KTP')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] rounded-lg font-black cursor-pointer shadow-sm">🪪 KTP</button> : <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-2 py-1 rounded">KTP -</span>}
                          {showMarriage ? <button onClick={()=>handleViewDocument(t.marriage_doc_url || pj?.marriage_doc_url, 'Buku Nikah')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] rounded-lg font-black cursor-pointer shadow-sm">📎 NIKAH</button> : (isMarried ? <span className="text-[10px] text-red-500 font-bold">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-2 py-1 rounded">NIKAH -</span>)}
                          {showKk ? <button onClick={()=>handleViewDocument(t.kk_doc_url || pj?.kk_doc_url, 'KK')} className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 text-[10px] rounded-lg font-black cursor-pointer shadow-sm">📁 KK</button> : (t.is_head ? <span className="text-[10px] text-red-500 font-bold">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-2 py-1 rounded">KK -</span>)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${t.status==='VERIFIED'||t.status==='ACTIVE'?'bg-emerald-100 text-emerald-800':t.status==='REJECTED'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>
                            {t.status==='VERIFIED'||t.status==='ACTIVE'?'✅ SAH':t.status==='REJECTED'?'❌ DITOLAK':'⏳ PENDING'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {t.status!=='VERIFIED' && t.status!=='ACTIVE' && <button onClick={()=>handleVerifyTenant(t.id, 'verified')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm">Setujui</button>}
                          <button onClick={()=>handleDeleteTenant(t.id, t.name)} className="px-3 py-1.5 bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">Hapus</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PROPERTI KOS & PIN */}
        {activeTab === 'properti' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-4">
            <h2 className="text-xl font-black border-b pb-4">Daftar Properti Kos & Manajemen PIN</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {properties.map((prop) => (
                <div key={prop.id} className="p-5 rounded-2xl border bg-slate-50 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start"><span className="text-[10px] font-black px-2 py-1 bg-slate-200 text-slate-800 rounded uppercase">{prop.type} • {prop.total_rooms||10} Kamar</span><span className="text-xs font-mono font-black text-amber-900 bg-amber-200 px-2 py-1 rounded border border-amber-300">PIN: {prop.pin_code||'1234'}</span></div>
                    <h4 className="font-black text-lg">{prop.name||prop.property_name}</h4>
                    <p className="text-xs text-slate-600">👤 Owner: {prop.owner_name||'-'} ({prop.owner_phone||'-'})<br/>🔑 Pengelola: {prop.manager_name||'-'} ({prop.manager_phone||'-'})</p>
                  </div>
                  <div className="pt-4 border-t mt-4 flex justify-end"><button onClick={()=>{setResetProp(prop); setNewPin('1234');}} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer">Reset PIN Akses</button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PENGURUS */}
        {activeTab === 'pengurus' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-black">Manajemen Pengurus RT</h2>
              {isSuperAdmin && <button onClick={()=>{setEditingOfficer(null);setOfficerName('');setOfficerPhone('');setOfficerEmail('');setShowAddOfficerModal(true);}} className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer">➕ Tambah</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {officers.map((off) => (
                <div key={off.id} className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                  <div className="flex justify-between"><span className="font-black">{off.full_name}</span><span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-2 py-1 rounded uppercase">{off.role}</span></div>
                  <p className="text-xs font-mono text-slate-600">WA: {off.phone_number||'-'}<br/>Email: {off.email||'-'}</p>
                  {isSuperAdmin && (
                    <div className="pt-3 border-t flex gap-2 justify-end">
                      {off.email && <button onClick={()=>{setResetOfficerTarget(off); setOfficerNewPassword('admin12345');}} className="px-3 py-1.5 bg-amber-400 text-slate-900 text-xs font-bold rounded-lg cursor-pointer">Reset Sandi</button>}
                      <button onClick={()=>{setEditingOfficer(off); setOfficerName(off.full_name); setOfficerRole(off.role); setOfficerPhone(off.phone_number||''); setOfficerEmail(off.email||''); setShowAddOfficerModal(true);}} className="px-3 py-1.5 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg cursor-pointer">Edit</button>
                      {off.role!=='SUPER_ADMIN' && <button onClick={()=>handleDeleteOfficer(off.id, off.full_name)} className="px-3 py-1.5 text-red-600 text-xs font-bold cursor-pointer">Hapus</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: KAS RT */}
        {activeTab === 'kas' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-800 p-6 rounded-3xl text-white shadow-md"><p className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Saldo Kas Masuk RT</p><h3 className="text-3xl font-black mt-1">Rp {totalKasTerkumpul.toLocaleString('id-ID')}</h3></div>
            
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <h2 className="text-lg font-black border-b pb-2">Catat Iuran Baru</h2>
              <form onSubmit={handleRecordDuesSubmit} className="space-y-4 text-sm max-w-lg">
                <div><label className="font-bold block mb-1">Nama Pembayar</label><input type="text" required value={payerName} onChange={e=>setPayerName(e.target.value)} placeholder="Contoh: Bpk Budi (Kamar 2)" className="w-full p-3 border rounded-xl bg-slate-50" /></div>
                <div><label className="font-bold block mb-1">Nomor Unit / Blok</label><input type="text" required value={unitRoom} onChange={e=>setUnitRoom(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" /></div>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="font-bold block mb-1">Bulan</label><select value={duesMonth} onChange={e=>setDuesMonth(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50"><option>Januari</option><option>Agustus</option><option>September</option><option>Oktober</option></select></div>
                  <div className="w-32"><label className="font-bold block mb-1">Tahun</label><input type="text" required value={duesYear} onChange={e=>setDuesYear(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-mono" /></div>
                </div>
                <div><label className="font-bold block mb-1">Nominal (Rp)</label><input type="text" required value={duesAmount} onChange={e=>setDuesAmount(e.target.value.replace(/\D/g,''))} className="w-full p-3 border rounded-xl font-mono text-lg font-black" /></div>
                <button type="submit" disabled={savingDues} className="w-full py-3.5 bg-emerald-700 text-white font-black rounded-xl shadow cursor-pointer">Simpan Ke Buku Kas</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <h2 className="text-lg font-black border-b pb-2">Riwayat Iuran Masuk</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black"><tr><th className="p-3">Tanggal</th><th className="p-3">Pembayar</th><th className="p-3">Blok/Kamar</th><th className="p-3">Periode</th><th className="p-3">Nominal</th><th className="p-3">Aksi</th></tr></thead>
                <tbody className="divide-y">
                  {duesList.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50"><td className="p-3 text-xs text-slate-500">{new Date(d.created_at).toLocaleDateString()}</td><td className="p-3 font-bold">{d.payer_name}</td><td className="p-3">{d.block_number}</td><td className="p-3">{d.period}</td><td className="p-3 font-mono font-bold">Rp {Number(d.amount).toLocaleString()}</td><td className="p-3"><button onClick={()=>handleDeleteDuesRow(d.id, d.payer_name, d.amount)} className="text-red-600 font-bold text-xs cursor-pointer">Batalkan</button></td></tr>
                  ))}
                </tbody></table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-4">
            <h2 className="text-xl font-black border-b pb-4">Jejak Audit Keamanan (System Log)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black"><tr><th className="p-3">Waktu</th><th className="p-3">Aksi Sistem</th><th className="p-3">Pelaksana</th><th className="p-3">Detail</th></tr></thead>
              <tbody className="divide-y">
                {auditLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50"><td className="p-3 text-xs text-slate-500 font-mono">{new Date(l.created_at).toLocaleString()}</td><td className="p-3"><span className="px-2 py-1 bg-slate-200 text-slate-800 rounded font-black text-[10px]">{l.action_type}</span></td><td className="p-3 font-bold">{l.performed_by}</td><td className="p-3 text-slate-600">{l.details}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>
        )}

      </main>

      {/* MODALS */}
      {resetProp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between"><h3 className="font-bold text-sm">Reset PIN Properti</h3><button onClick={()=>setResetProp(null)} className="cursor-pointer">✕</button></div>
            <form onSubmit={handleSaveResetPin} className="p-5 space-y-4">
              <p className="font-bold">{resetProp.name}</p>
              <input type="text" maxLength={4} required value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,''))} className="w-full text-center text-2xl tracking-[0.4em] p-3 border rounded-xl font-mono font-bold" />
              <button type="submit" disabled={savingPin} className="w-full py-3 bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Simpan PIN Baru</button>
            </form>
          </div>
        </div>
      )}

      {resetOfficerTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-amber-500 text-slate-900 flex justify-between"><h3 className="font-black text-sm">Reset Sandi Pengurus</h3><button onClick={()=>setResetOfficerTarget(null)} className="cursor-pointer">✕</button></div>
            <form onSubmit={handleExecuteResetPassword} className="p-5 space-y-4 text-sm">
              <p className="font-bold">{resetOfficerTarget.full_name}<br/><span className="text-xs font-normal text-slate-500">{resetOfficerTarget.email}</span></p>
              <input type="text" required placeholder="Minimal 6 karakter" value={officerNewPassword} onChange={e=>setOfficerNewPassword(e.target.value)} className="w-full p-3 border rounded-xl font-mono font-bold" />
              <button type="submit" disabled={resettingPassword} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl cursor-pointer">Reset Sandi</button>
            </form>
          </div>
        </div>
      )}

      {showAddOfficerModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-emerald-800 text-white flex justify-between"><h3 className="font-black text-sm">{editingOfficer?'Edit Pengurus':'Tambah Pengurus'}</h3><button onClick={()=>{setShowAddOfficerModal(false);setEditingOfficer(null);}} className="cursor-pointer">✕</button></div>
            <form onSubmit={handleOfficerFormSubmit} className="p-5 space-y-3 text-sm">
              <input type="text" required placeholder="Nama Lengkap" value={officerName} onChange={e=>setOfficerName(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
              <select value={officerRole} onChange={e=>setOfficerRole(e.target.value)} className="w-full p-3 border rounded-xl"><option value="SEKRETARIS">Sekretaris</option><option value="BENDAHARA">Bendahara</option><option value="KEAMANAN_HANSIP">Keamanan/Hansip</option></select>
              <input type="tel" required placeholder="No WhatsApp" value={officerPhone} onChange={e=>setOfficerPhone(e.target.value.replace(/\D/g,''))} className="w-full p-3 border rounded-xl font-mono" />
              <input type="email" required placeholder="Email Login" value={officerEmail} onChange={e=>setOfficerEmail(e.target.value)} className="w-full p-3 border rounded-xl" />
              {!editingOfficer && <input type="text" required placeholder="Sandi Awal" value={officerInitialPassword} onChange={e=>setOfficerInitialPassword(e.target.value)} className="w-full p-3 border rounded-xl font-mono" />}
              <button type="submit" disabled={savingOfficer} className="w-full py-3 bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Simpan Pengurus</button>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX GALLERY FULLSCREEN MODAL UNTUK DOKUMEN (Anti-Nyangkut) */}
      {docModalUrl && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-10 animate-fade-in">
          <button onClick={() => {setDocModalUrl(null); setDocModalTitle('');}} className="absolute top-6 right-6 text-white bg-white/10 hover:bg-red-600 w-12 h-12 rounded-full text-2xl font-black cursor-pointer transition-all flex items-center justify-center">✕</button>
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <h3 className="text-white text-sm font-bold mb-4 uppercase tracking-widest">{docModalTitle}</h3>
            <img src={docModalUrl} alt="Dokumen Resmi" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20" />
            <p className="text-white/60 text-xs mt-6 font-mono font-medium tracking-widest uppercase">Tampilan Dokumen Privat (Aman UU PDP)</p>
          </div>
        </div>
      )}
    </div>
  );
}