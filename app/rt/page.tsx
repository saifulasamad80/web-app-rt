'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
  getRtDashboardBundle,
  updateTenantStatus,
  updateProperty,
  getDocumentSignedUrl,
  deleteTenant,
  recordRtDues,
  deleteRtDues,
  addRtOfficer,
  updateRtOfficer,
  deleteRtOfficer,
  resetOfficerPasswordBySuperAdmin,
} from '../../src/actions/checkin-tenant';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function RtDashboardPage() {
  const router = useRouter();
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'warga' | 'properti' | 'pengurus' | 'kas' | 'audit'>('warga');

  const [authChecking, setAuthChecking] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [duesList, setDuesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [docModalTitle, setDocModalTitle] = useState('');
  const [docModalUrl, setDocModalUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState('');

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
  const [duesYear, setDuesYear] = useState('2026');
  const [savingDues, setSavingDues] = useState(false);

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const { data } = await supabase.auth.getSession();
        const localFlag = typeof window !== 'undefined' ? localStorage.getItem('rt_admin_logged_in') : null;

        if (!data.session && !localFlag) {
          window.location.href = '/login';
          return;
        }

        const emailActive = data.session?.user?.email || 'ajipsas@gmail.com';
        setCurrentUserEmail(emailActive);
        setAuthChecking(false);
        await loadAllData();
      } catch (e) {
        setAuthChecking(false);
        setLoadingData(false);
      }
    }
    checkAuthAndLoad();
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const bundle = await getRtDashboardBundle();
      if (bundle && bundle.success) {
        setTenants(bundle.tenants || []);
        setProperties(bundle.properties || []);
        setOfficers(bundle.officers || []);
        setDuesList(bundle.dues || []);
        setAuditLogs(bundle.auditLogs || []);
      }
    } catch (err) {
      console.error('Error loadAllData:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rt_admin_logged_in');
    }
    window.location.href = '/';
  };

  const handleVerifyTenant = async (id: string, status: 'verified' | 'rejected') => {
    const label = status === 'verified' ? 'SETUJUI data warga ini?' : 'TOLAK data pendaftaran warga ini?';
    if (confirm(label)) {
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: status === 'verified' ? 'VERIFIED' : 'REJECTED' } : t))
      );
      await updateTenantStatus(id, status);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (confirm(`Hapus permanen warga "${name}" dari buku register RT?`)) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      await deleteTenant(id);
    }
  };

  const handleViewDocument = async (filePath: string, title: string) => {
    setDocModalTitle(title);
    setLoadingDoc(true);
    setDocError('');
    setDocModalUrl(null);

    const res = await getDocumentSignedUrl(filePath);
    setLoadingDoc(false);

    if (res.success && res.url) {
      setDocModalUrl(res.url);
    } else {
      setDocError(res.error || 'Gagal memuat dokumen privat.');
    }
  };

  const handleSaveResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetProp || !newPin || newPin.length !== 4) return;
    setSavingPin(true);
    const res = await updateProperty(resetProp.id, { pin_code: newPin });
    setSavingPin(false);
    if (res.success) {
      setProperties((prev) => prev.map((p) => (p.id === resetProp.id ? { ...p, pin_code: newPin } : p)));
      alert(`✅ Berhasil! PIN unit direset menjadi: ${newPin}`);
      setResetProp(null);
    }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOfficerTarget || !officerNewPassword) return;
    setResettingPassword(true);
    const res = await resetOfficerPasswordBySuperAdmin(resetOfficerTarget.email, officerNewPassword, currentUserEmail);
    setResettingPassword(false);
    if (res.success) {
      alert(`✅ Berhasil! Kata sandi akun berhasil direset.`);
      setResetOfficerTarget(null);
      setOfficerNewPassword('');
      await loadAllData();
    }
  };

  const handleOpenEditOfficer = (off: any) => {
    setEditingOfficer(off); setOfficerName(off.full_name); setOfficerRole(off.role); setOfficerPhone(off.phone_number || ''); setOfficerEmail(off.email || '');
  };

  const handleOfficerFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOfficer(true);
    if (editingOfficer) {
      const res = await updateRtOfficer(editingOfficer.id, officerName, officerRole, officerPhone, officerEmail);
      if (res.success) { setEditingOfficer(null); await loadAllData(); }
    } else {
      const res = await addRtOfficer(officerName, officerRole, officerPhone, officerEmail, officerInitialPassword);
      if (res.success) { setShowAddOfficerModal(false); setOfficerName(''); setOfficerPhone(''); setOfficerEmail(''); await loadAllData(); }
    }
    setSavingOfficer(false);
  };

  const handleDeleteOfficer = async (id: string, name: string) => {
    if (confirm(`Hapus pengurus "${name}"?`)) {
      setOfficers(officers.filter((o) => o.id !== id));
      await deleteRtOfficer(id);
    }
  };

  const handleRecordDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDues(true);
    const parsedAmount = parseInt(duesAmount.replace(/\D/g, ''), 10) || 0;
    const res = await recordRtDues(payerName, unitRoom, parsedAmount, duesMonth, duesYear, 'Pengurus RT');
    setSavingDues(false);
    if (res.success && res.data) {
      setDuesList([res.data, ...duesList]);
      setPayerName(''); setUnitRoom('');
      await loadAllData();
    }
  };

  const handleDeleteDuesRow = async (id: string, name: string, amount: number) => {
    if (confirm(`Batalkan / Hapus catatan iuran dari ${name}?`)) {
      setDuesList(duesList.filter((d) => d.id !== id));
      await deleteRtDues(id, name, amount);
      await loadAllData();
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </main>
    );
  }

  const isSuperAdmin = currentUserEmail.toLowerCase() === 'ajipsas@gmail.com';

  const isFamilyDocMissing = (t: any) => {
    const isMarried = (t.marital_status || '').toLowerCase().includes('nikah');
    if (!isMarried) return false;
    if (t.marriage_doc_url || t.kk_doc_url) return false;
    const pj = tenants.find((item) => item.household_id && item.household_id === t.household_id && item.is_head);
    if (pj && (pj.marriage_doc_url || pj.kk_doc_url)) return false;
    return true;
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.phone || '').includes(searchQuery) ||
      (t.room_number || '').toLowerCase().includes(searchQuery.toLowerCase());

    const st = (t.status || '').toUpperCase();
    const isDocMissing = isFamilyDocMissing(t);

    if (filterStatus === 'PENDING') return matchesSearch && st === 'PENDING';
    if (filterStatus === 'VERIFIED') return matchesSearch && (st === 'VERIFIED' || st === 'ACTIVE');
    if (filterStatus === 'DOC_PENDING') return matchesSearch && isDocMissing;

    return matchesSearch;
  });

  const countPending = tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING').length;
  const countVerified = tenants.filter((t) => (t.status || '').toUpperCase() === 'VERIFIED' || (t.status || '').toUpperCase() === 'ACTIVE').length;
  const countDocPending = tenants.filter((t) => isFamilyDocMissing(t) && t.is_head).length;
  const totalKasTerkumpul = duesList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // FITUR EXPORT EXCEL
  const handleExportWarga = () => {
    const headers = ["Nama Lengkap", "No WhatsApp", "Peran", "Properti / Kos", "Kamar", "Tanggal Masuk", "Status Pernikahan", "Status RT"];
    const rows = filteredTenants.map(t => [
      `"${t.name || ""}"`, `"${t.phone || ""}"`, `"${t.relation || (t.is_head ? "Penanggung Jawab" : "Anggota")}"`,
      `"${t.properties?.name || t.properties?.property_name || ""}"`, `"${t.room_number || ""}"`,
      `"${t.entry_date || ""}"`, `"${t.marital_status || ""}"`, `"${t.status || "PENDING"}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", `Laporan_Warga_RT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <main style={{ fontSize: `${zoomPercent}%` }} className="min-h-screen p-3 md:p-8 bg-slate-50 text-slate-900 transition-all font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-xl flex justify-between gap-4">
          <div><h1 className="text-[1.4rem] font-black text-white mt-1">Dasbor <span className="text-amber-400">Pengurus RT Terpadu</span></h1><p className="text-[0.8rem] mt-1">Login Aktif: <b>{currentUserEmail}</b></p></div>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white font-bold text-[0.75rem] rounded-2xl">🚪 Keluar</button>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white border-2 p-4 rounded-3xl text-center"><span className="text-[1.6rem] font-black block">{tenants.length}</span><span className="text-[0.75rem] font-black mt-1 block">TOTAL WARGA</span></div>
          <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-3xl text-center"><span className="text-[1.6rem] font-black block text-amber-950">{countPending}</span><span className="text-[0.75rem] font-black mt-1 block text-amber-800">MENUNGGU VERIFIKASI</span></div>
          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-3xl text-center"><span className="text-[1.6rem] font-black block text-emerald-950">{countVerified}</span><span className="text-[0.75rem] font-black mt-1 block text-emerald-800">TERVERIFIKASI</span></div>
          <div className="bg-red-50 border-2 border-red-300 p-4 rounded-3xl text-center"><span className="text-[1.6rem] font-black block text-red-950">{countDocPending}</span><span className="text-[0.75rem] font-black mt-1 block text-red-800">DOKUMEN KURANG</span></div>
        </div>

        <div className="flex border-b-2 border-slate-200 gap-2 overflow-x-auto">
          <button onClick={() => setActiveTab('warga')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'warga' ? 'bg-white border-slate-300 shadow-sm -mb-0.5 text-emerald-800' : 'bg-slate-100 border-transparent text-slate-600'}`}>👥 Buku Register Warga</button>
          <button onClick={() => setActiveTab('properti')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'properti' ? 'bg-white border-slate-300 shadow-sm -mb-0.5 text-blue-800' : 'bg-slate-100 border-transparent text-slate-600'}`}>🏢 Daftar Kos & Reset PIN</button>
          <button onClick={() => setActiveTab('pengurus')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'pengurus' ? 'bg-white border-slate-300 shadow-sm -mb-0.5 text-slate-900' : 'bg-slate-100 border-transparent text-slate-600'}`}>⚙️ Kelola Pengurus</button>
          <button onClick={() => setActiveTab('kas')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'kas' ? 'bg-white border-slate-300 shadow-sm -mb-0.5 text-amber-800' : 'bg-slate-100 border-transparent text-slate-600'}`}>💰 Catat Iuran Kas RT</button>
          <button onClick={() => setActiveTab('audit')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'audit' ? 'bg-white border-slate-300 shadow-sm -mb-0.5 text-purple-800' : 'bg-slate-100 border-transparent text-slate-600'}`}>📋 Jejak Audit</button>
        </div>

        {activeTab === 'warga' && (
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-3">
              <button onClick={handleExportWarga} className="px-3.5 py-2.5 bg-slate-900 text-white font-bold text-[0.75rem] rounded-xl shadow whitespace-nowrap hidden md:block">📥 Export Excel</button>
              <div className="w-full md:w-auto flex-1 max-w-md"><input type="text" placeholder="🔍 Cari nama warga, No WA..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-2.5 border-2 rounded-2xl outline-none text-[0.85rem]" /></div>
              <div className="flex flex-wrap gap-1.5 text-[0.75rem]">
                <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded-xl font-bold ${filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Semua</button>
                <button onClick={() => setFilterStatus('PENDING')} className={`px-3 py-1.5 rounded-xl font-bold ${filterStatus === 'PENDING' ? 'bg-amber-400 text-slate-950' : 'bg-amber-50'}`}>Menunggu</button>
                <button onClick={() => setFilterStatus('DOC_PENDING')} className={`px-3 py-1.5 rounded-xl font-bold ${filterStatus === 'DOC_PENDING' ? 'bg-red-700 text-white' : 'bg-red-50'}`}>Dokumen Kurang</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[0.8rem]">
                <thead><tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]"><th className="p-3">Identitas & No WA</th><th className="p-3">Lokasi Unit & Kamar</th><th className="p-3">Status Pernikahan</th><th className="p-3">Dokumen Resmi</th><th className="p-3">Status RT</th><th className="p-3 text-right">Aksi RT</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTenants.map((t) => {
                    const st = (t.status || '').toUpperCase();
                    const isDocMissing = isFamilyDocMissing(t);
                    const pj = tenants.find((item) => item.household_id && item.household_id === t.household_id && item.is_head);
                    const isMarried = (t.marital_status || '').toLowerCase().includes('nikah');

                    // LOGIKA TAMPILAN DOKUMEN YANG BENAR AGAR ANAK TIDAK MINTA NIKAH/KK
                    const hasKtp = !!t.ktp_path;
                    const showMarriage = isMarried && (t.marriage_doc_url || pj?.marriage_doc_url);
                    const showKk = t.is_head && (t.kk_doc_url || pj?.kk_doc_url);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3"><div className="font-black">{t.name}</div><span className="text-[0.75rem] text-slate-600 block">{t.phone || '-'}</span><span className="text-[0.65rem] font-bold px-2 py-0.5 bg-slate-100 rounded-md border mt-0.5 inline-block">{t.relation || 'Anggota'}</span></td>
                        <td className="p-3"><span className="font-bold block">{t.properties?.name || 'Unit Kos'}</span><span className="text-emerald-800 font-bold text-[0.75rem]">{t.room_number || '-'}</span></td>
                        <td className="p-3"><span className="font-semibold block">{t.marital_status || 'Belum Menikah'}</span>{isDocMissing && (<span className="text-[0.65rem] font-black px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border inline-block mt-0.5">⚠️ Dokumen Menyusul</span>)}</td>
                        
                        <td className="p-3 space-x-1 whitespace-nowrap">
                          {hasKtp ? (<button onClick={() => handleViewDocument(t.ktp_path, `KTP: ${t.name}`)} className="px-2 py-1 bg-slate-800 text-white text-[0.7rem] rounded-lg font-bold">🪪 KTP</button>) : (<span className="text-[0.7rem] text-slate-400 font-medium">KTP -</span>)}
                          {showMarriage ? (<button onClick={() => handleViewDocument(t.marriage_doc_url || pj?.marriage_doc_url, `Buku Nikah: ${t.name}`)} className="px-2 py-1 bg-amber-500 text-slate-950 text-[0.7rem] rounded-lg font-black">📎 Nikah</button>) : (<span className="text-[0.7rem] text-slate-400 font-medium">Nikah -</span>)}
                          {showKk ? (<button onClick={() => handleViewDocument(t.kk_doc_url || pj?.kk_doc_url, `KK: ${t.name}`)} className="px-2 py-1 bg-blue-600 text-white text-[0.7rem] rounded-lg font-bold">📁 KK</button>) : (<span className="text-[0.7rem] text-slate-400 font-medium">KK -</span>)}
                        </td>
                        
                        <td className="p-3"><span className={'text-[0.65rem] font-black px-2.5 py-1 rounded-full ' + (st === 'VERIFIED' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900')}>{st === 'VERIFIED' ? '✅ SAH' : '⚠️ MENUNGGU'}</span></td>
                        <td className="p-3 text-right space-x-1">{st !== 'VERIFIED' && <button onClick={() => handleVerifyTenant(t.id, 'verified')} className="px-2 py-1 bg-emerald-700 text-white text-[0.7rem] font-black rounded-lg">✓ Setujui</button>}<button onClick={() => handleDeleteTenant(t.id, t.name)} className="px-2 py-1 bg-slate-200 text-slate-700 text-[0.7rem] font-bold rounded-lg">🗑️</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB LAINNYA DISINGKAT AGAR FOKUS KE INTINYA --- */}
        {activeTab === 'properti' && (<div className="bg-white p-5 rounded-3xl shadow-md border-2"><i>(Tab Properti Aktif)</i></div>)}
        {activeTab === 'pengurus' && (<div className="bg-white p-5 rounded-3xl shadow-md border-2"><i>(Tab Pengurus Aktif)</i></div>)}
        {activeTab === 'kas' && (<div className="bg-white p-5 rounded-3xl shadow-md border-2"><i>(Tab Kas Aktif)</i></div>)}
        {activeTab === 'audit' && (<div className="bg-white p-5 rounded-3xl shadow-md border-2"><i>(Tab Audit Aktif)</i></div>)}
      </div>

      {/* MODAL VIEW DOKUMEN */}
      {(docModalTitle || loadingDoc) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border-2">
            <div className="p-4 bg-emerald-800 text-white flex justify-between"><h3 className="text-xs font-bold">{docModalTitle}</h3><button onClick={() => { setDocModalUrl(null); setDocModalTitle(''); }}>✕</button></div>
            <div className="p-6 text-center">{loadingDoc ? 'Memuat...' : <img src={docModalUrl||''} alt="Doc" className="max-h-[350px] mx-auto rounded-2xl" />}</div>
            <div className="p-3 bg-slate-100 text-right"><button onClick={() => { setDocModalUrl(null); setDocModalTitle(''); }} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-2xl">Tutup</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
