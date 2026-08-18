'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  getRtDashboardBundle, updateTenantStatus, deleteTenant, getDocumentSignedUrl,
  updateProperty, recordRtDues, deleteRtDues, addRtOfficer, updateRtOfficer, deleteRtOfficer, resetOfficerPasswordBySuperAdmin
} from '../../src/actions/checkin-tenant';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function RtDashboardPage() {
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

  // --- ACTIONS UTAMA ---
  const handleVerifyTenant = async (id: string, status: 'verified' | 'rejected') => {
    if (confirm(`Ubah status persetujuan warga menjadi: ${status.toUpperCase()}?`)) {
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: status === 'verified' ? 'VERIFIED' : 'REJECTED' } : t));
      await updateTenantStatus(id, status); await loadAllData();
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (confirm(`Hapus permanen warga "${name}" dari buku register RT?\nPerhatian: Data ini juga akan hilang dari Dasbor Pemilik Kos terkait.`)) { 
      setTenants(prev => prev.filter(t => t.id !== id)); await deleteTenant(id); await loadAllData(); 
    }
  };

  const handleViewDocument = async (filePath: string, title: string) => {
    setDocModalTitle(title); const res = await getDocumentSignedUrl(filePath);
    if (res.success && res.url) setDocModalUrl(res.url); else alert('Gagal memuat dokumen rahasia.');
  };

  const handleExportWarga = () => {
    const headers = ["Nama Lengkap", "No WhatsApp", "Peran", "Properti / Kos", "Kamar", "Tanggal Masuk", "Status Pernikahan", "Status RT"];
    const rows = filteredTenants.map(t => [ `"${t.name||""}"`, `"${t.phone||""}"`, `"${t.relation||(t.is_head?"PJ":"Anggota")}"`, `"${t.properties?.name||t.properties?.property_name||""}"`, `"${t.room_number||""}"`, `"${t.entry_date||""}"`, `"${t.marital_status||""}"`, `"${t.status||"PENDING"}"` ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Laporan_Warga_RT_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- ACTIONS MANAJEMEN ---
  const handleSaveResetPin = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPin(true); const res = await updateProperty(resetProp.id, { pin_code: newPin }); setSavingPin(false);
    if (res.success) { alert(`PIN akses properti direset menjadi: ${newPin}`); setResetProp(null); await loadAllData(); }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setResettingPassword(true); const res = await resetOfficerPasswordBySuperAdmin(resetOfficerTarget.email, officerNewPassword, currentUserEmail); setResettingPassword(false);
    if (res.success) { alert(`Kata sandi akun pengurus berhasil direset.`); setResetOfficerTarget(null); setOfficerNewPassword(''); await loadAllData(); }
  };

  const handleOfficerFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingOfficer(true);
    if (editingOfficer) { await updateRtOfficer(editingOfficer.id, officerName, officerRole, officerPhone, officerEmail); } 
    else { await addRtOfficer(officerName, officerRole, officerPhone, officerEmail, officerInitialPassword); }
    setSavingOfficer(false); setShowAddOfficerModal(false); setEditingOfficer(null); await loadAllData();
  };

  const handleDeleteOfficer = async (id: string, name: string) => {
    if (confirm(`Cabut hak akses dan hapus pengurus "${name}"?`)) { await deleteRtOfficer(id); await loadAllData(); }
  };

  const handleRecordDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingDues(true); const parsedAmount = parseInt(duesAmount.replace(/\D/g, ''), 10) || 0;
    await recordRtDues(payerName, unitRoom, parsedAmount, duesMonth, duesYear, 'Pengurus RT');
    setSavingDues(false); setPayerName(''); setUnitRoom(''); await loadAllData();
  };

  const handleDeleteDuesRow = async (id: string, name: string, amount: number) => {
    if (confirm(`Batalkan iuran kas dari ${name} sebesar Rp ${amount}?`)) { await deleteRtDues(id, name, amount); await loadAllData(); }
  };

  // --- UTILS & VARIABEL UI ---
  const isSuperAdmin = currentUserEmail.toLowerCase() === 'ajipsas@gmail.com';
  
  // Logika pengecekan kelengkapan dokumen nikah
  const isFamilyDocMissing = (t: any) => {
    const marital = (t.marital_status || '').toLowerCase();
    if (marital !== 'menikah' && marital !== 'menikah (pasutri)') return false;
    if (t.marriage_doc_url || t.kk_doc_url) return false;
    const pj = tenants.find((item) => item.household_id && item.household_id === t.household_id && item.is_head);
    if (pj && (pj.marriage_doc_url || pj.kk_doc_url)) return false;
    return true;
  };

  // Logika pencarian data
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.phone || '').includes(searchQuery) || (t.room_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const st = (t.status || '').toUpperCase();
    if (filterStatus === 'PENDING') return matchesSearch && st === 'PENDING';
    if (filterStatus === 'VERIFIED') return matchesSearch && (st === 'VERIFIED' || st === 'ACTIVE');
    if (filterStatus === 'DOC_PENDING') return matchesSearch && isFamilyDocMissing(t);
    return matchesSearch;
  });

  // Perhitungan Data Kotak Atas
  const countPending = tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING').length;
  const countVerified = tenants.filter((t) => (t.status || '').toUpperCase() === 'VERIFIED' || (t.status || '').toUpperCase() === 'ACTIVE').length;
  const countDocPending = tenants.filter((t) => isFamilyDocMissing(t) && t.is_head).length;
  const totalKasTerkumpul = duesList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Dasbor Enterprise RT...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR NAVIGATION (UI/UX Feedback: Modern SaaS) */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col md:min-h-screen flex-shrink-0 shadow-xl z-10 sticky top-0">
        <div className="p-6 border-b border-slate-800 bg-slate-950">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest border border-amber-400/30 bg-amber-400/10 px-2 py-1 rounded">Admin RT</span>
          <h1 className="text-xl font-black text-white mt-3 leading-tight">Dasbor<br/>Terpadu</h1>
          <p className="text-[10px] text-slate-400 mt-2 font-mono truncate">{currentUserEmail}</p>
        </div>
        
        <nav className="flex-1 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <button onClick={()=>setActiveTab('warga')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab==='warga'?'bg-emerald-600 text-white shadow-md':'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><span className="text-lg">👥</span> Data Warga</button>
          <button onClick={()=>setActiveTab('properti')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab==='properti'?'bg-blue-600 text-white shadow-md':'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><span className="text-lg">🏢</span> Unit Kos</button>
          <button onClick={()=>setActiveTab('pengurus')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab==='pengurus'?'bg-purple-600 text-white shadow-md':'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><span className="text-lg">⚙️</span> Pengurus</button>
          <button onClick={()=>setActiveTab('kas')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab==='kas'?'bg-amber-500 text-slate-900 shadow-md':'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><span className="text-lg">💰</span> Kas & Iuran</button>
          <button onClick={()=>setActiveTab('audit')} className={`flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab==='audit'?'bg-slate-700 text-white shadow-md':'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><span className="text-lg">📋</span> Jejak Audit</button>
          
          <div className="flex-1 hidden md:block"></div>
          <button onClick={()=>{localStorage.removeItem('rt_admin_logged_in'); supabase.auth.signOut().then(()=>window.location.href='/');}} className="flex-shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-sm text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors mt-auto cursor-pointer border border-transparent hover:border-red-900"><span className="text-lg">🚪</span> Keluar</button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        
        {/* KOTAK INFORMASI STATISTIK UTAMA (DIKEMBALIKAN UTUH) */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 mb-6">
          <div className="bg-white border border-slate-200 p-5 md:p-6 rounded-3xl shadow-sm text-center flex flex-col justify-center"><span className="text-4xl font-black text-slate-900 block">{tenants.length}</span><span className="text-[10px] font-black text-slate-400 mt-2 block uppercase tracking-widest">Total Warga Terdata</span></div>
          <div className="bg-amber-50 border border-amber-200 p-5 md:p-6 rounded-3xl shadow-sm text-center flex flex-col justify-center"><span className="text-4xl font-black text-amber-700 block">{countPending}</span><span className="text-[10px] font-black text-amber-600 mt-2 block uppercase tracking-widest">Menunggu Verifikasi</span></div>
          <div className="bg-emerald-50 border border-emerald-200 p-5 md:p-6 rounded-3xl shadow-sm text-center flex flex-col justify-center"><span className="text-4xl font-black text-emerald-700 block">{countVerified}</span><span className="text-[10px] font-black text-emerald-600 mt-2 block uppercase tracking-widest">Resmi Terverifikasi</span></div>
          <div className="bg-red-50 border border-red-200 p-5 md:p-6 rounded-3xl shadow-sm text-center flex flex-col justify-center"><span className="text-4xl font-black text-red-700 block">{countDocPending}</span><span className="text-[10px] font-black text-red-600 mt-2 block uppercase tracking-widest">Dokumen Kurang</span></div>
        </div>

        {/* TAB 1: WARGA */}
        {activeTab === 'warga' && (
          <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
              <div><h2 className="text-2xl font-black text-slate-900">Buku Register Warga</h2><p className="text-sm text-slate-500 mt-1 font-medium">Verifikasi dan kelola dokumen kependudukan sesuai UU PDP.</p></div>
              <button onClick={handleExportWarga} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors whitespace-nowrap flex items-center gap-2"><span>📥</span> Export Data (CSV)</button>
            </div>
            
            {/* Filter Warga */}
            <div className="flex flex-col xl:flex-row gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <input type="text" placeholder="🔍 Cari nama, No WA, kamar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 p-3 border border-slate-200 rounded-xl outline-none text-sm bg-white focus:border-emerald-500 font-medium shadow-sm" />
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>setFilterStatus('ALL')} className={`px-4 py-3 rounded-xl text-xs font-black tracking-wide cursor-pointer transition-colors ${filterStatus==='ALL'?'bg-slate-800 text-white shadow-sm':'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>SEMUA</button>
                <button onClick={()=>setFilterStatus('PENDING')} className={`px-4 py-3 rounded-xl text-xs font-black tracking-wide cursor-pointer transition-colors ${filterStatus==='PENDING'?'bg-amber-400 text-amber-950 shadow-sm':'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'}`}>MENUNGGU</button>
                <button onClick={()=>setFilterStatus('DOC_PENDING')} className={`px-4 py-3 rounded-xl text-xs font-black tracking-wide cursor-pointer transition-colors ${filterStatus==='DOC_PENDING'?'bg-red-600 text-white shadow-sm':'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}>DOKUMEN KURANG</button>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y border-slate-200">
                  <tr><th className="p-4">Identitas Warga</th><th className="p-4">Kamar / Unit</th><th className="p-4">Status Sipil</th><th className="p-4">Berkas (UU PDP)</th><th className="p-4">Status RT</th><th className="p-4 text-right">Aksi Manajemen</th></tr>
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
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-black text-slate-900 text-base">{t.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{t.phone||'Tak ada kontak'}</div>
                          <div className="mt-2"><span className={`text-[10px] font-black px-2.5 py-1 rounded-md border ${t.is_head?'bg-blue-50 text-blue-800 border-blue-200':'bg-white text-slate-500 border-slate-200'}`}>{t.relation||(t.is_head?'Penanggung Jawab':'Anggota')}</span></div>
                        </td>
                        <td className="p-4">
                          <span className="font-black text-slate-700 text-sm block">{t.room_number||'-'}</span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">{t.properties?.name||'Kos / Properti'}</span>
                        </td>
                        <td className="p-4 font-bold text-slate-600">{t.marital_status||'Lajang'}</td>
                        <td className="p-4 space-x-2">
                          {hasKtp ? <button onClick={()=>handleViewDocument(t.ktp_path, 'KTP Resmi')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] rounded-lg font-black cursor-pointer shadow-sm transition-colors">🪪 KTP</button> : <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">KTP -</span>}
                          {showMarriage ? <button onClick={()=>handleViewDocument(t.marriage_doc_url || pj?.marriage_doc_url, 'Buku Nikah Pasutri')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] rounded-lg font-black cursor-pointer shadow-sm transition-colors">📎 NIKAH</button> : (isMarried ? <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">NIKAH -</span>)}
                          {showKk ? <button onClick={()=>handleViewDocument(t.kk_doc_url || pj?.kk_doc_url, 'Kartu Keluarga')} className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 text-[10px] rounded-lg font-black cursor-pointer shadow-sm transition-colors">📁 KK</button> : (t.is_head ? <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">KK -</span>)}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${t.status==='VERIFIED'||t.status==='ACTIVE'?'bg-emerald-50 text-emerald-800 border-emerald-200':t.status==='REJECTED'?'bg-red-50 text-red-800 border-red-200':'bg-amber-50 text-amber-800 border-amber-200'}`}>
                            {t.status==='VERIFIED'||t.status==='ACTIVE'?'✅ Sah Terverifikasi':t.status==='REJECTED'?'❌ Ditolak':'⏳ Menunggu Review'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {t.status!=='VERIFIED' && t.status!=='ACTIVE' && <button onClick={()=>handleVerifyTenant(t.id, 'verified')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-colors">Setujui</button>}
                            <button onClick={()=>handleDeleteTenant(t.id, t.name)} className="px-4 py-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTenants.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold border-2 border-dashed rounded-2xl">Tidak ada data warga yang ditemukan.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PROPERTI KOS & PIN */}
        {activeTab === 'properti' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-5">
            <h2 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">Daftar Properti Kos & Manajemen PIN</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-2">
              {properties.map((prop) => (
                <div key={prop.id} className="p-6 rounded-3xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black px-2.5 py-1 bg-white text-slate-700 rounded-md border shadow-sm uppercase tracking-wider">{prop.type} • {prop.total_rooms||10} Kamar</span>
                      <span className="text-xs font-mono font-black text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 shadow-sm">PIN AKTIF: {prop.pin_code||'1234'}</span>
                    </div>
                    <h4 className="font-black text-xl text-slate-900">{prop.name||prop.property_name}</h4>
                    <div className="bg-white p-4 rounded-2xl border text-xs text-slate-600 space-y-2 shadow-sm">
                      <p className="flex items-center gap-2"><span>👤</span> <b>Owner:</b> {prop.owner_name||'-'} <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">{prop.owner_phone||'-'}</span></p>
                      <p className="flex items-center gap-2"><span>🔑</span> <b>Pengelola:</b> {prop.manager_name||'-'} <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">{prop.manager_phone||'-'}</span></p>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-slate-200 mt-5 flex justify-end">
                    <button onClick={()=>{setResetProp(prop); setNewPin('1234');}} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl cursor-pointer shadow-md transition-colors">🔑 Reset PIN Akses Properti</button>
                  </div>
                </div>
              ))}
              {properties.length === 0 && <div className="col-span-1 xl:col-span-2 p-8 text-center text-slate-400 font-bold border-2 border-dashed rounded-2xl">Belum ada properti kos yang didaftarkan. Owner harus mendaftar via halaman login.</div>}
            </div>
          </div>
        )}

        {/* TAB 3: PENGURUS */}
        {activeTab === 'pengurus' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900">Manajemen Pengurus RT</h2>
              {isSuperAdmin && <button onClick={()=>{setEditingOfficer(null);setOfficerName('');setOfficerPhone('');setOfficerEmail('');setShowAddOfficerModal(true);}} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-md transition-colors">➕ Tambah Pengurus Baru</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {officers.map((off) => (
                <div key={off.id} className="p-5 bg-white rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-black text-lg text-slate-900">{off.full_name}</span>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md uppercase tracking-wider">{off.role}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border text-xs font-mono text-slate-600 space-y-2">
                    <p className="flex justify-between"><span>WhatsApp:</span> <b className="text-slate-900">{off.phone_number||'-'}</b></p>
                    <p className="flex justify-between"><span>Email Login:</span> <b className="text-slate-900">{off.email||'-'}</b></p>
                  </div>
                  {isSuperAdmin && (
                    <div className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
                      {off.email && <button onClick={()=>{setResetOfficerTarget(off); setOfficerNewPassword('admin12345');}} className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl cursor-pointer transition-colors">Reset Sandi</button>}
                      <button onClick={()=>{setEditingOfficer(off); setOfficerName(off.full_name); setOfficerRole(off.role); setOfficerPhone(off.phone_number||''); setOfficerEmail(off.email||''); setShowAddOfficerModal(true);}} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm">Edit Profil</button>
                      {off.role!=='SUPER_ADMIN' && <button onClick={()=>handleDeleteOfficer(off.id, off.full_name)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 text-xs font-bold rounded-xl cursor-pointer transition-colors">Hapus</button>}
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
            <div className="bg-emerald-800 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl">💰</div>
              <p className="text-xs font-black text-emerald-300 uppercase tracking-widest mb-1">Total Saldo Kas Masuk Lingkungan RT</p>
              <h3 className="text-4xl md:text-5xl font-black">Rp {totalKasTerkumpul.toLocaleString('id-ID')}</h3>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* FORM CATAT IURAN BARU */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm xl:col-span-1 h-fit">
                <h2 className="text-lg font-black border-b border-slate-100 pb-3 mb-4 text-slate-900">➕ Catat Iuran Kas Baru</h2>
                <form onSubmit={handleRecordDuesSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">Nama Penyetor / Warga</label>
                    <input type="text" required value={payerName} onChange={e=>setPayerName(e.target.value)} placeholder="Contoh: Bpk Budi (Kamar 2)" className="w-full p-3.5 border rounded-xl bg-slate-50 font-medium outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-slate-700">Nomor Rumah / Blok</label>
                    <input type="text" required value={unitRoom} onChange={e=>setUnitRoom(e.target.value)} placeholder="Cth: Blok A No 5" className="w-full p-3.5 border rounded-xl bg-slate-50 font-medium outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="font-bold block mb-1 text-slate-700">Bulan</label>
                      <select value={duesMonth} onChange={e=>setDuesMonth(e.target.value)} className="w-full p-3.5 border rounded-xl bg-slate-50 font-bold outline-none focus:border-emerald-500">
                        <option>Januari</option><option>Februari</option><option>Maret</option><option>April</option><option>Mei</option><option>Juni</option><option>Juli</option><option>Agustus</option><option>September</option><option>Oktober</option><option>November</option><option>Desember</option>
                      </select>
                    </div>
                    <div className="w-1/3">
                      <label className="font-bold block mb-1 text-slate-700">Tahun</label>
                      <input type="text" required value={duesYear} onChange={e=>setDuesYear(e.target.value)} className="w-full p-3.5 border rounded-xl bg-slate-50 font-mono font-bold text-center outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="font-bold block mb-1 text-emerald-900 uppercase tracking-wider text-[10px]">Nominal Transaksi (Rp)</label>
                    <input type="text" required value={duesAmount} onChange={e=>setDuesAmount(e.target.value.replace(/\D/g,''))} className="w-full p-4 border border-emerald-400 bg-emerald-50 rounded-2xl font-mono text-2xl font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="pt-3">
                    <button type="submit" disabled={savingDues} className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base rounded-2xl shadow-lg cursor-pointer transition-colors disabled:bg-slate-400">✅ Simpan Ke Buku Kas</button>
                  </div>
                </form>
              </div>

              {/* TABEL RIWAYAT IURAN MASUK */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm xl:col-span-2">
                <h2 className="text-lg font-black border-b border-slate-100 pb-3 mb-4 text-slate-900">Riwayat Iuran Masuk Warga</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y border-slate-200">
                      <tr><th className="p-4">Tanggal Catat</th><th className="p-4">Nama Penyetor</th><th className="p-4">Blok / Lokasi</th><th className="p-4">Bulan Periode</th><th className="p-4 text-right">Nominal (Rp)</th><th className="p-4 text-center">Aksi Batal</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {duesList.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-xs text-slate-500 font-mono">{new Date(d.created_at).toLocaleDateString('id-ID')}</td>
                          <td className="p-4 font-black text-slate-900 text-base">{d.payer_name}</td>
                          <td className="p-4 font-bold text-slate-600">{d.block_number}</td>
                          <td className="p-4"><span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">{d.period}</span></td>
                          <td className="p-4 font-mono font-black text-slate-900 text-right text-base border-l border-slate-100">Rp {Number(d.amount).toLocaleString('id-ID')}</td>
                          <td className="p-4 text-center">
                            <button onClick={()=>handleDeleteDuesRow(d.id, d.payer_name, d.amount)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-sm">Batalkan</button>
                          </td>
                        </tr>
                      ))}
                      {duesList.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold border-2 border-dashed rounded-2xl">Belum ada transaksi uang kas masuk.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-fade-in space-y-5">
            <h2 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-4">Jejak Audit Keamanan Sistem (System Log)</h2>
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y border-slate-200">
                  <tr><th className="p-4 rounded-tl-xl">Waktu & Tanggal</th><th className="p-4">Aksi Sistem</th><th className="p-4">Pelaksana / User</th><th className="p-4 rounded-tr-xl">Detail Aktivitas</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs text-slate-500 font-mono">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                      <td className="p-4"><span className="px-2.5 py-1 bg-slate-800 text-white shadow-sm rounded-md font-black text-[10px] tracking-wider">{l.action_type}</span></td>
                      <td className="p-4 font-black text-slate-700">{l.performed_by}</td>
                      <td className="p-4 text-slate-600 font-medium">{l.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold border-2 border-dashed rounded-2xl">Sistem belum mencatat aktivitas apapun.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODALS UNTUK DASBOR RT */}
      {resetProp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 animate-slide-up">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><h3 className="font-black text-base">Reset PIN Akses Kos</h3><button onClick={()=>setResetProp(null)} className="cursor-pointer text-xl hover:text-red-400 leading-none">✕</button></div>
            <form onSubmit={handleSaveResetPin} className="p-6 space-y-4 bg-slate-50">
              <p className="font-black text-slate-900 text-center text-lg">{resetProp.name}</p>
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest text-center">Masukkan 4 Digit Angka Baru</label>
                <input type="text" maxLength={4} required value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,''))} className="w-full text-center text-3xl tracking-[0.6em] p-4 border border-emerald-400 rounded-2xl font-mono font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner bg-white" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={savingPin} className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base rounded-xl cursor-pointer shadow-md transition-colors disabled:bg-slate-400">Simpan Perubahan PIN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetOfficerTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 animate-slide-up">
            <div className="p-5 bg-amber-500 text-slate-900 flex justify-between items-center"><h3 className="font-black text-base">Reset Sandi Pengurus</h3><button onClick={()=>setResetOfficerTarget(null)} className="cursor-pointer text-xl hover:text-red-700 leading-none">✕</button></div>
            <form onSubmit={handleExecuteResetPassword} className="p-6 space-y-4 bg-slate-50 text-sm">
              <div className="text-center pb-2 border-b border-slate-200"><p className="font-black text-slate-900 text-lg">{resetOfficerTarget.full_name}</p><p className="text-xs font-bold text-slate-500 font-mono mt-1">{resetOfficerTarget.email}</p></div>
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Ketik Sandi Baru</label>
                <input type="text" required placeholder="Minimal 6 karakter" value={officerNewPassword} onChange={e=>setOfficerNewPassword(e.target.value)} className="w-full p-3.5 border rounded-xl font-mono font-bold bg-white outline-none focus:border-amber-500" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={resettingPassword} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-base rounded-xl cursor-pointer shadow-md transition-colors disabled:bg-slate-400">Terapkan Sandi Baru</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddOfficerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 animate-slide-up">
            <div className="p-5 bg-emerald-800 text-white flex justify-between items-center"><h3 className="font-black text-base">{editingOfficer?'Edit Data Pengurus':'Daftar Pengurus Baru'}</h3><button onClick={()=>{setShowAddOfficerModal(false);setEditingOfficer(null);}} className="cursor-pointer text-xl hover:text-red-300 leading-none">✕</button></div>
            <form onSubmit={handleOfficerFormSubmit} className="p-6 space-y-4 text-sm bg-slate-50">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label><input type="text" required placeholder="Cth: Pak Budi" value={officerName} onChange={e=>setOfficerName(e.target.value)} className="w-full p-3.5 border rounded-xl font-bold outline-none focus:border-emerald-500 bg-white" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Posisi Jabatan</label><select value={officerRole} onChange={e=>setOfficerRole(e.target.value)} className="w-full p-3.5 border rounded-xl font-bold outline-none focus:border-emerald-500 bg-white"><option value="SEKRETARIS">Sekretaris RT</option><option value="BENDAHARA">Bendahara RT</option><option value="KEAMANAN_HANSIP">Keamanan / Hansip</option></select></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">No WhatsApp</label><input type="tel" required placeholder="08xxxxxxxx" value={officerPhone} onChange={e=>setOfficerPhone(e.target.value.replace(/\D/g,''))} className="w-full p-3.5 border rounded-xl font-mono outline-none focus:border-emerald-500 bg-white" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Email untuk Login Dasbor</label><input type="email" required placeholder="email@domain.com" value={officerEmail} onChange={e=>setOfficerEmail(e.target.value)} className="w-full p-3.5 border rounded-xl outline-none focus:border-emerald-500 bg-white" /></div>
              {!editingOfficer && (<div><label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Awal Login</label><input type="text" required placeholder="Sandi Default" value={officerInitialPassword} onChange={e=>setOfficerInitialPassword(e.target.value)} className="w-full p-3.5 border rounded-xl font-mono outline-none focus:border-emerald-500 bg-white" /></div>)}
              <div className="pt-2"><button type="submit" disabled={savingOfficer} className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl cursor-pointer shadow-md transition-colors disabled:bg-slate-400">Simpan Data Pengurus</button></div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX GALLERY FULLSCREEN MODAL UNTUK DOKUMEN (Anti-Nyangkut) */}
      {docModalUrl && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-10 animate-fade-in">
          <button onClick={() => {setDocModalUrl(null); setDocModalTitle('');}} className="absolute top-6 right-6 text-white bg-white/10 hover:bg-red-600 w-12 h-12 rounded-full text-2xl font-black cursor-pointer transition-all flex items-center justify-center border border-white/20 hover:border-red-500">✕</button>
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <div className="bg-slate-900/80 px-6 py-2 rounded-full border border-slate-700 mb-4 shadow-xl backdrop-blur-md">
              <h3 className="text-white text-sm font-black uppercase tracking-widest">{docModalTitle}</h3>
            </div>
            <img src={docModalUrl} alt="Dokumen Resmi" className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl ring-2 ring-white/20" />
            <p className="text-white/40 text-[10px] mt-6 font-mono font-bold tracking-widest uppercase bg-black/50 px-4 py-1.5 rounded">Tampilan Dokumen Privat (Aman Sesuai Standar UU PDP)</p>
          </div>
        </div>
      )}
    </div>
  );
}