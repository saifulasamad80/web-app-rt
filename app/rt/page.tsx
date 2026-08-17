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
      alert(`Status warga berhasil diperbarui menjadi: ${status === 'verified' ? 'SAH TERVERIFIKASI' : 'DITOLAK'}`);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (confirm(`Hapus permanen warga "${name}" dari buku register RT?`)) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      await deleteTenant(id);
      alert(`Data "${name}" telah dihapus.`);
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
    if (!resetProp || !newPin || newPin.length !== 4) {
      alert('PIN harus berupa 4-digit angka');
      return;
    }

    setSavingPin(true);
    const res = await updateProperty(resetProp.id, { pin_code: newPin });
    setSavingPin(false);

    if (res.success) {
      setProperties((prev) => prev.map((p) => (p.id === resetProp.id ? { ...p, pin_code: newPin } : p)));
      alert(`✅ Berhasil! PIN unit "${resetProp.name || resetProp.property_name}" direset menjadi: ${newPin}`);
      setResetProp(null);
    } else {
      alert('Gagal reset PIN: ' + res.error);
    }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOfficerTarget || !officerNewPassword) return;

    setResettingPassword(true);
    const res = await resetOfficerPasswordBySuperAdmin(resetOfficerTarget.email, officerNewPassword, currentUserEmail);
    setResettingPassword(false);

    if (res.success) {
      alert(`✅ Berhasil! Kata sandi akun ${resetOfficerTarget.full_name} berhasil direset.`);
      setResetOfficerTarget(null);
      setOfficerNewPassword('');
      await loadAllData();
    } else {
      alert('Gagal reset sandi: ' + res.error);
    }
  };

  const handleOpenEditOfficer = (off: any) => {
    setEditingOfficer(off);
    setOfficerName(off.full_name);
    setOfficerRole(off.role);
    setOfficerPhone(off.phone_number || '');
    setOfficerEmail(off.email || '');
  };

  const handleOfficerFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerName || !officerPhone || !officerEmail) {
      alert('Nama lengkap, No. WhatsApp, dan Email wajib diisi.');
      return;
    }

    setSavingOfficer(true);

    if (editingOfficer) {
      const res = await updateRtOfficer(editingOfficer.id, officerName, officerRole, officerPhone, officerEmail);
      setSavingOfficer(false);

      if (res.success) {
        alert(`✅ Kontak pengurus "${officerName}" berhasil diperbarui!`);
        setEditingOfficer(null);
        await loadAllData();
      } else {
        alert('Gagal memperbarui pengurus: ' + res.error);
      }
    } else {
      const res = await addRtOfficer(officerName, officerRole, officerPhone, officerEmail, officerInitialPassword);
      setSavingOfficer(false);

      if (res.success) {
        alert(`✅ Pengurus RT "${officerName}" berhasil didaftarkan!`);
        setShowAddOfficerModal(false);
        setOfficerName('');
        setOfficerPhone('');
        setOfficerEmail('');
        await loadAllData();
      } else {
        alert('Gagal menambah pengurus: ' + res.error);
      }
    }
  };

  const handleDeleteOfficer = async (id: string, name: string) => {
    if (confirm(`Hapus pengurus "${name}"?`)) {
      setOfficers(officers.filter((o) => o.id !== id));
      await deleteRtOfficer(id);
    }
  };

  const handleRecordDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName || !unitRoom || !duesAmount) {
      alert('Nama pembayar, Unit Kos/Rumah, dan nominal iuran wajib diisi.');
      return;
    }

    setSavingDues(true);
    const parsedAmount = parseInt(duesAmount.replace(/\D/g, ''), 10) || 0;

    const res = await recordRtDues(payerName, unitRoom, parsedAmount, duesMonth, duesYear, 'Pengurus RT');
    setSavingDues(false);

    if (res.success && res.data) {
      setDuesList([res.data, ...duesList]);
      alert(`✅ Iuran Rp ${parsedAmount.toLocaleString('id-ID')} dari ${payerName} berhasil dicatat.`);
      setPayerName('');
      setUnitRoom('');
      await loadAllData();
    } else {
      alert('Gagal mencatat iuran: ' + res.error);
    }
  };

  const handleDeleteDuesRow = async (id: string, name: string, amount: number) => {
    if (confirm(`Batalkan / Hapus catatan iuran Rp ${amount.toLocaleString('id-ID')} dari ${name}?`)) {
      setDuesList(duesList.filter((d) => d.id !== id));
      await deleteRtDues(id, name, amount);
      await loadAllData();
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-700">Memeriksa Hak Akses Pengurus RT...</p>
        </div>
      </main>
    );
  }

  const isSuperAdmin = currentUserEmail.toLowerCase() === 'ajipsas@gmail.com';

  // HELPER CEK DOKUMEN NIKAH (SATU KELUARGA / PJ)
  const isFamilyDocMissing = (t: any) => {
    const isMarried = (t.marital_status || '').toLowerCase().includes('nikah');
    if (!isMarried) return false;
    // Cek apakah ada berkas pada baris ini atau baris PJ satu household
    if (t.marriage_doc_url || t.kk_doc_url) return false;
    const pj = tenants.find((item) => item.household_id && item.household_id === t.household_id && item.is_head);
    if (pj && (pj.marriage_doc_url || pj.kk_doc_url)) return false;
    return true;
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.phone || '').includes(searchQuery) ||
      (t.room_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.properties?.name || t.properties?.property_name || '').toLowerCase().includes(searchQuery.toLowerCase());

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

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen p-3 md:p-8 bg-slate-50 text-slate-900 transition-all font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-5">

        {/* HEADER */}
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[1.3rem]">🏛️🛡️</span>
              <h1 className="text-[1.4rem] font-black text-white">Dasbor <span className="text-amber-400">Pengurus RT Terpadu</span></h1>
            </div>
            <p className="text-[0.8rem] text-emerald-100 mt-1 font-medium">
              Login Aktif: <b>{currentUserEmail}</b> {isSuperAdmin && <span className="text-amber-300 font-bold">(SUPER ADMIN)</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1.5 shadow-inner">
              <span className="text-[0.75rem] font-bold text-emerald-300 px-1 flex items-center">T↕</span>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Kecilkan Teks"
                className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
              >
                A-
              </button>
              <span className="text-[0.7rem] font-mono font-black text-amber-300 px-1">
                {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Perbesar Teks"
                className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
              >
                A+
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[0.75rem] rounded-2xl shadow border border-red-400 cursor-pointer flex items-center gap-1.5"
            >
              🚪 Keluar ke Utama
            </button>
          </div>
        </header>

        {/* 4 KOTAK REKAP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white border-2 border-slate-200 p-4 md:p-5 rounded-3xl shadow-sm text-center">
            <span className="text-[1.6rem] font-black text-slate-900 block">{tenants.length}</span>
            <span className="text-[0.75rem] font-black text-slate-600 mt-1 block uppercase">Total Warga Terdata</span>
          </div>

          <div className="bg-amber-50 border-2 border-amber-300 p-4 md:p-5 rounded-3xl shadow-sm text-center">
            <span className="text-[1.6rem] font-black text-amber-950 block">{countPending}</span>
            <span className="text-[0.75rem] font-black text-amber-800 mt-1 block uppercase">Menunggu Verifikasi</span>
          </div>

          <div className="bg-emerald-50 border-2 border-emerald-300 p-4 md:p-5 rounded-3xl shadow-sm text-center">
            <span className="text-[1.6rem] font-black text-emerald-950 block">{countVerified}</span>
            <span className="text-[0.75rem] font-black text-emerald-800 mt-1 block uppercase">Resmi Terverifikasi</span>
          </div>

          <div className="bg-red-50 border-2 border-red-300 p-4 md:p-5 rounded-3xl shadow-sm text-center">
            <span className="text-[1.6rem] font-black text-red-950 block">{countDocPending}</span>
            <span className="text-[0.75rem] font-black text-red-800 mt-1 block uppercase">Dokumen Kurang</span>
          </div>
        </div>

        {/* TAB NAVIGASI */}
        <div className="flex border-b-2 border-slate-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('warga')}
            className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'warga'
                ? 'bg-white border-slate-300 text-emerald-800 shadow-sm -mb-0.5'
                : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            👥 Buku Register Warga ({tenants.length})
          </button>

          <button
            onClick={() => setActiveTab('properti')}
            className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'properti'
                ? 'bg-white border-slate-300 text-blue-800 shadow-sm -mb-0.5'
                : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏢 Daftar Kos & Reset PIN ({properties.length})
          </button>

          <button
            onClick={() => setActiveTab('pengurus')}
            className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pengurus'
                ? 'bg-white border-slate-300 text-slate-900 shadow-sm -mb-0.5'
                : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚙️ Kelola Pengurus & Sandi ({officers.length})
          </button>

          <button
            onClick={() => setActiveTab('kas')}
            className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'kas'
                ? 'bg-white border-slate-300 text-amber-800 shadow-sm -mb-0.5'
                : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            💰 Catat Iuran Kas RT ({duesList.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-white border-slate-300 text-purple-800 shadow-sm -mb-0.5'
                : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 Jejak Audit ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: BUKU REGISTER WARGA */}
        {activeTab === 'warga' && (
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-3">
              <div className="w-full md:w-auto flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="🔍 Cari nama warga, No WA, kamar, atau kos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-2xl outline-none text-[0.85rem] bg-white font-medium focus:border-emerald-600"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 text-[0.75rem]">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua ({tenants.length})
                </button>
                <button
                  onClick={() => setFilterStatus('PENDING')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    filterStatus === 'PENDING' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  Menunggu ({countPending})
                </button>
                <button
                  onClick={() => setFilterStatus('DOC_PENDING')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    filterStatus === 'DOC_PENDING' ? 'bg-red-700 text-white font-black' : 'bg-red-50 text-red-900 hover:bg-red-100'
                  }`}
                >
                  Dokumen Kurang ({countDocPending})
                </button>
              </div>
            </div>

            {loadingData ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[0.8rem] font-bold text-slate-600">Memuat Buku Register Warga RT...</p>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                <p className="text-[0.8rem] text-slate-500 font-medium">Belum ada data warga pendatang yang terdaftar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[0.8rem]">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]">
                      <th className="p-3">Identitas & No WA</th>
                      <th className="p-3">Lokasi Unit & Kamar</th>
                      <th className="p-3">Status Pernikahan</th>
                      <th className="p-3">3 Dokumen Resmi (KTP, Nikah, KK)</th>
                      <th className="p-3">Status RT</th>
                      <th className="p-3 text-right">Aksi RT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTenants.map((t) => {
                      const st = (t.status || '').toUpperCase();
                      const isDocMissing = isFamilyDocMissing(t);

                      // Cari dokumen nikah dari baris ini atau baris PJ satu household
                      const pj = tenants.find((item) => item.household_id && item.household_id === t.household_id && item.is_head);
                      const activeMarriageDoc = t.marriage_doc_url || pj?.marriage_doc_url;
                      const activeKkDoc = t.kk_doc_url || pj?.kk_doc_url;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="font-black text-slate-900">{t.name}</div>
                            <span className="text-[0.75rem] font-mono text-slate-600 block">{t.phone || '-'}</span>
                            <span className="text-[0.65rem] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 inline-block mt-0.5">
                              {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{t.properties?.name || t.properties?.property_name || 'Unit Kos'}</span>
                            <span className="text-emerald-800 font-bold text-[0.75rem]">{t.room_number || '-'}</span>
                          </td>

                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">{t.marital_status || 'Belum Menikah'}</span>
                            {isDocMissing && (
                              <span className="text-[0.65rem] font-black px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md border border-amber-300 inline-block mt-0.5">
                                ⚠️ Dokumen Menyusul
                              </span>
                            )}
                          </td>

                          <td className="p-3 space-x-1 whitespace-nowrap">
                            {t.ktp_path ? (
                              <button
                                onClick={() => handleViewDocument(t.ktp_path, `KTP: ${t.name}`)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[0.7rem] rounded-lg font-bold cursor-pointer"
                              >
                                🪪 KTP
                              </button>
                            ) : (
                              <span className="text-[0.7rem] text-slate-400 font-medium">KTP -</span>
                            )}

                            {activeMarriageDoc ? (
                              <button
                                onClick={() => handleViewDocument(activeMarriageDoc, `Buku Nikah: ${t.name}`)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[0.7rem] rounded-lg font-black cursor-pointer"
                              >
                                📎 Nikah
                              </button>
                            ) : (
                              <span className="text-[0.7rem] text-slate-400 font-medium">Nikah -</span>
                            )}

                            {activeKkDoc ? (
                              <button
                                onClick={() => handleViewDocument(activeKkDoc, `Kartu Keluarga: ${t.name}`)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[0.7rem] rounded-lg font-bold cursor-pointer"
                              >
                                📁 KK
                              </button>
                            ) : (
                              <span className="text-[0.7rem] text-slate-400 font-medium">KK -</span>
                            )}
                          </td>

                          <td className="p-3">
                            <span className={'text-[0.65rem] font-black px-2.5 py-1 rounded-full uppercase ' +
                              (st === 'VERIFIED' || st === 'ACTIVE' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                               st === 'REJECTED' ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-amber-100 text-amber-900 border border-amber-300')}>
                              {st === 'VERIFIED' ? '✅ SAH TERVERIFIKASI' : st === 'REJECTED' ? '❌ DITOLAK' : '⚠️ MENUNGGU RT'}
                            </span>
                          </td>

                          <td className="p-3 text-right space-x-1">
                            {st !== 'VERIFIED' && (
                              <button
                                onClick={() => handleVerifyTenant(t.id, 'verified')}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[0.7rem] font-black rounded-lg shadow cursor-pointer"
                              >
                                ✓ Setujui
                              </button>
                            )}
                            {st !== 'REJECTED' && (
                              <button
                                onClick={() => handleVerifyTenant(t.id, 'rejected')}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-[0.7rem] font-bold rounded-lg cursor-pointer"
                              >
                                ✗ Tolak
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTenant(t.id, t.name)}
                              className="px-2 py-1 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 text-[0.7rem] font-bold rounded-lg cursor-pointer"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DAFTAR PROPERTI */}
        {activeTab === 'properti' && (
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                Daftar Properti Kos & Manajemen PIN Unit
              </h3>
              <p className="text-[0.75rem] text-slate-500">Pengurus RT memegang hak reset PIN jika pemilik kos lupa kata sandi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map((prop) => (
                <div key={prop.id} className="p-5 rounded-3xl border-2 border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[0.7rem] font-black px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-full uppercase">
                        {prop.type} • {prop.total_rooms || 10} Kamar
                      </span>
                      <span className="text-[0.75rem] font-mono font-black text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-lg border border-amber-300">
                        PIN AKTIF: {prop.pin_code || '1234'}
                      </span>
                    </div>

                    <h4 className="font-black text-[1.1rem] text-slate-900">{prop.name || prop.property_name}</h4>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200 text-[0.75rem] space-y-1 text-slate-700">
                      <p>👤 <b>Pemilik Sah:</b> {prop.owner_name || '-'} ({prop.owner_phone || '-'})</p>
                      <p>🔑 <b>Pengelola Lapangan:</b> {prop.manager_name || 'Dikelola Sendiri'} ({prop.manager_phone || '-'})</p>
                      <p>📍 <b>Alamat:</b> {prop.address || 'Lingkungan RT'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex justify-end gap-2">
                    <button
                      onClick={() => { setResetProp(prop); setNewPin('1234'); }}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[0.75rem] font-bold rounded-xl shadow cursor-pointer"
                    >
                      🔑 Reset PIN Unit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: KELOLA PENGURUS RT */}
        {activeTab === 'pengurus' && (
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b pb-3">
              <div>
                <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                  ⚙️ Struktur Akun & Manajemen Kontak Pengurus RT
                </h3>
                <p className="text-[0.75rem] text-slate-500">
                  Perbarui nomor WhatsApp pengurus jika berganti nomor, atau reset kata sandi login akun.
                </p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => {
                    setEditingOfficer(null);
                    setOfficerName('');
                    setOfficerRole('SEKRETARIS');
                    setOfficerPhone('');
                    setOfficerEmail('');
                    setOfficerInitialPassword('admin12345');
                    setShowAddOfficerModal(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[0.8rem] rounded-2xl shadow cursor-pointer"
                >
                  ➕ Tambah Pengurus Baru
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {officers.map((off) => (
                <div key={off.id} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-[0.95rem]">{off.full_name}</span>
                      <span className="text-[0.65rem] font-black px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md uppercase border border-emerald-300">
                        {off.role}
                      </span>
                    </div>
                    <p className="text-[0.75rem] font-mono text-slate-800 font-bold">📱 WhatsApp: {off.phone_number || '-'}</p>
                    {off.email && <p className="text-[0.75rem] text-slate-600 font-mono">✉️ Email Login: {off.email}</p>}
                  </div>

                  {isSuperAdmin && (
                    <div className="pt-2 border-t flex justify-end items-center gap-2">
                      <button
                        onClick={() => handleOpenEditOfficer(off)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[0.75rem] rounded-xl shadow-sm cursor-pointer"
                      >
                        ✏️ Edit Kontak / WA
                      </button>
                      {off.email && (
                        <button
                          onClick={() => {
                            setResetOfficerTarget(off);
                            setOfficerNewPassword('admin12345');
                          }}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[0.75rem] rounded-xl shadow cursor-pointer"
                        >
                          🔑 Reset Sandi
                        </button>
                      )}
                      {off.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleDeleteOfficer(off.id, off.full_name)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-100 rounded-xl font-bold text-[0.75rem] cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CATAT IURAN KAS */}
        {activeTab === 'kas' && (
          <div className="space-y-5">
            <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg flex justify-between items-center">
              <div>
                <span className="text-[0.7rem] font-black uppercase tracking-wider text-emerald-200 bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                  TOTAL KAS MASUK RT
                </span>
                <h3 className="text-[1.8rem] font-black text-white mt-1">
                  Rp {totalKasTerkumpul.toLocaleString('id-ID')}
                </h3>
                <p className="text-[0.75rem] text-emerald-100 font-medium">Dari {duesList.length} total transaksi iuran tercatat</p>
              </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                  Pencatatan Iuran Kas Lingkungan RT Baru
                </h3>
                <p className="text-[0.75rem] text-slate-500">Catat pemasukan iuran sampah, keamanan, dan kas RT dari warga atau pemilik kos.</p>
              </div>

              <form onSubmit={handleRecordDuesSubmit} className="max-w-lg space-y-3 text-[0.8rem]">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nama Pembayar / Warga *</label>
                  <select
                    required
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 rounded-2xl outline-none font-bold bg-white text-slate-900"
                  >
                    <option value="">-- Pilih Nama Warga / Pemilik --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.name}>{t.name} (Warga - Unit: {t.room_number || 'Kamar'})</option>
                    ))}
                    {properties.map((p) => (
                      <option key={p.id} value={p.owner_name || p.name}>
                        {p.owner_name || p.name} (Pemilik - {p.name})
                      </option>
                    ))}
                    {officers.map((o) => (
                      <option key={o.id} value={o.full_name}>{o.full_name} (Pengurus RT - {o.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nomor Rumah / Unit Kos *</label>
                  <select
                    required
                    value={unitRoom}
                    onChange={(e) => setUnitRoom(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 rounded-2xl outline-none font-bold bg-white text-slate-900"
                  >
                    <option value="">-- Pilih Unit Properti / Kamar / Blok --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.name}>{p.name} ({p.type})</option>
                    ))}
                    {tenants.filter(t => t.room_number).map((t) => (
                      <option key={`room-${t.id}`} value={`${t.properties?.name || 'Unit'} - ${t.room_number}`}>
                        {t.room_number} ({t.name} - {t.properties?.name || 'Unit'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Nominal (Rp) *</label>
                    <input
                      type="text"
                      required
                      value={duesAmount}
                      onChange={(e) => setDuesAmount(e.target.value)}
                      className="w-full p-3 border-2 border-slate-200 rounded-2xl font-mono font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Bulan *</label>
                    <select
                      value={duesMonth}
                      onChange={(e) => setDuesMonth(e.target.value)}
                      className="w-full p-3 border-2 border-slate-200 rounded-2xl bg-white font-bold"
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Tahun *</label>
                    <select
                      value={duesYear}
                      onChange={(e) => setDuesYear(e.target.value)}
                      className="w-full p-3 border-2 border-slate-200 rounded-2xl bg-white font-bold font-mono"
                    >
                      {['2025', '2026', '2027', '2028', '2029', '2030'].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingDues}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[0.85rem] rounded-2xl shadow cursor-pointer disabled:bg-slate-300"
                >
                  {savingDues ? 'Menyimpan...' : '➕ Simpan Transaksi Kas RT'}
                </button>
              </form>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                  Daftar Riwayat Transaksi Iuran Warga Masuk ({duesList.length})
                </h3>
              </div>

              {duesList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                  <p className="text-[0.8rem] text-slate-500 font-medium">Belum ada transaksi iuran kas yang tercatat.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[0.8rem]">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]">
                        <th className="p-3">Tanggal Catat</th>
                        <th className="p-3">Nama Pembayar</th>
                        <th className="p-3">Unit / Kamar</th>
                        <th className="p-3">Periode</th>
                        <th className="p-3">Nominal (Rp)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {duesList.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-[0.75rem] text-slate-600">
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td className="p-3 font-black text-slate-900">{d.payer_name || d.resident_name}</td>
                          <td className="p-3 font-semibold text-emerald-900">{d.block_number || d.house_number || '-'}</td>
                          <td className="p-3 font-medium text-slate-800">{d.period || `${d.month} ${d.year}`}</td>
                          <td className="p-3 font-mono font-black text-slate-900">
                            Rp {Number(d.amount || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-black text-[0.65rem] rounded-full border border-emerald-300 uppercase">
                              {d.status || 'PAID'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteDuesRow(d.id, d.payer_name || d.resident_name, d.amount)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 text-[0.7rem] font-bold rounded-lg cursor-pointer"
                            >
                              🗑️ Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: JEJAK AUDIT */}
        {activeTab === 'audit' && (
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                Jejak Audit Iuran Kas RT (Audit Trail)
              </h3>
              <p className="text-[0.75rem] text-slate-500">Mencatat transparansi setiap transaksi kas masuk, perubahan kas, & reset sandi pengurus.</p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                <p className="text-[0.8rem] text-slate-500 font-medium">Belum ada aktivitas kas yang tercatat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[0.8rem]">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]">
                      <th className="p-3">Waktu</th>
                      <th className="p-3">Aksi</th>
                      <th className="p-3">Pelaksana</th>
                      <th className="p-3">Rincian Perubahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-[0.75rem] text-slate-600">
                          {new Date(log.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[0.7rem]">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">{log.performed_by}</td>
                        <td className="p-3 font-medium text-slate-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL RESET SANDI */}
      {resetOfficerTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.85rem] font-bold">🔑 Reset Sandi Pengurus RT</h3>
              <button
                onClick={() => setResetOfficerTarget(null)}
                className="text-white hover:text-amber-300 font-bold text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="p-5 space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-800 text-sm">{resetOfficerTarget.full_name}</p>
                <p className="text-slate-500 font-mono text-[11px]">{resetOfficerTarget.email}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kata Sandi Baru *</label>
                <input
                  type="text"
                  required
                  placeholder="Minimal 6 karakter"
                  value={officerNewPassword}
                  onChange={(e) => setOfficerNewPassword(e.target.value)}
                  className="w-full p-3 border-2 border-slate-300 rounded-xl font-mono font-bold focus:border-emerald-600 outline-none text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetOfficerTarget(null)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword || !officerNewPassword}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow cursor-pointer disabled:bg-slate-300"
                >
                  {resettingPassword ? 'Menyimpan...' : 'Simpan Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH & EDIT PENGURUS */}
      {(showAddOfficerModal || editingOfficer) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.85rem] font-black">
                {editingOfficer ? '✏️ Edit Kontak Pengurus' : '➕ Tambah Pengurus RT Baru'}
              </h3>
              <button
                onClick={() => { setShowAddOfficerModal(false); setEditingOfficer(null); }}
                className="text-white hover:text-amber-300 font-bold text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOfficerFormSubmit} className="p-5 space-y-3 text-[0.8rem]">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Bambang"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan / Peran *</label>
                <select
                  value={officerRole}
                  onChange={(e) => setOfficerRole(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                >
                  <option value="SEKRETARIS">Sekretaris RT</option>
                  <option value="BENDAHARA">Bendahara RT</option>
                  <option value="KEAMANAN_HANSIP">Seksi Keamanan / Hansip</option>
                  <option value="ADMIN_RT">Staf Administrasi RT</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={officerPhone}
                  onChange={(e) => setOfficerPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Pengurus (Wajib Login) *</label>
                <input
                  type="email"
                  required
                  placeholder="pengurus@gmail.com"
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-mono"
                />
              </div>

              {!editingOfficer && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi Awal *</label>
                  <input
                    type="text"
                    required
                    placeholder="admin12345"
                    value={officerInitialPassword}
                    onChange={(e) => setOfficerInitialPassword(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-mono"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => { setShowAddOfficerModal(false); setEditingOfficer(null); }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingOfficer}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl shadow cursor-pointer"
                >
                  {savingOfficer ? 'Menyimpan...' : editingOfficer ? 'Simpan Kontak' : 'Simpan Pengurus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW DOKUMEN */}
      {(docModalTitle || loadingDoc) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <span>🛡️ Dokumen Resmi (UU PDP):</span>
                <span className="text-amber-300">{docModalTitle}</span>
              </h3>
              <button onClick={() => { setDocModalUrl(null); setDocModalTitle(''); setDocError(''); }} className="text-white font-bold text-lg leading-none cursor-pointer">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center min-h-[220px] bg-slate-50">
              {loadingDoc ? (
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500 font-semibold">Membuat Tautan Privat Dokumen...</p>
                </div>
              ) : docError ? (
                <div className="text-center space-y-2 p-4 bg-red-50 border border-red-200 rounded-2xl max-w-md">
                  <p className="text-xs font-semibold text-red-800">{docError}</p>
                </div>
              ) : docModalUrl ? (
                <div className="space-y-3 w-full text-center">
                  <img src={docModalUrl} alt="Dokumen Resmi Warga" className="max-h-[350px] w-auto mx-auto rounded-2xl border shadow-sm object-contain" />
                  <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 font-semibold">
                    🔒 Tautan privat ini aman & kedaluwarsa otomatis dalam 60 detik sesuai UU PDP No. 27/2022.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="p-3 bg-slate-100 text-right border-t">
              <button onClick={() => { setDocModalUrl(null); setDocModalTitle(''); setDocError(''); }} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-2xl cursor-pointer">Tutup Dokumen</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET PIN PROPERTI */}
      {resetProp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">🔑 Reset PIN Unit Properti</h3>
              <button onClick={() => setResetProp(null)} className="text-white font-bold text-lg leading-none cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveResetPin} className="p-5 space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-800">Unit: {resetProp.name || resetProp.property_name}</p>
                <p className="text-slate-500 text-[11px]">Masukkan PIN 4-Digit baru untuk unit ini:</p>
              </div>

              <input
                type="text"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl tracking-[0.4em] p-3 border-2 border-slate-300 rounded-2xl font-mono font-bold focus:border-emerald-600 outline-none"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetProp(null)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPin || newPin.length !== 4}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {savingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
