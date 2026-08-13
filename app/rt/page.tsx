'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRtDashboardData, verifyTenantByRt, approvePropertyByRt, resetPropertyPinByRt } from '../../src/actions/rt-actions';
import { getTenantKtpUrl } from '../../src/actions/checkin-tenant';
import { submitDuesPayment, getDuesHistory, deleteDuesRecord } from '../../src/actions/manage-dues';
import { logoutAdminRT, getAllRtAdmins, createRtAdmin, deleteRtAdmin, getCurrentAdminSession } from '../../src/actions/auth';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  address_ktp: string;
  entry_date: string;
  status: string;
  relation?: string;
  room_number?: string;
  full_address?: string;
  household_id?: string;
  is_head?: boolean;
  birth_date?: string;
  ktp_url?: string;
  ktp_path?: string;
  property_id?: string;
  properties?: { id: string; name: string; type: string; slug: string };
}

interface Property {
  id: string;
  name: string;
  property_name?: string;
  type: string;
  slug: string;
  address?: string;
  status?: string;
  pin_code?: string;
  failed_pin_attempts?: number;
  pin_locked_until?: string;
}

interface DuesItem {
  id: string;
  resident_name?: string | null;
  house_number?: string | null;
  amount: number;
  period_month?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

const MONTH_OPTIONS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEAR_OPTIONS = ['2025', '2026', '2027', '2028', '2029', '2030'];

export default function RtDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [duesList, setDuesList] = useState<DuesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Sesi Admin Aktif
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  const [textScale, setTextScale] = useState<'sm' | 'base' | 'lg'>('base');

  const [selectedKtpUrl, setSelectedKtpUrl] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [loadingKtp, setLoadingKtp] = useState<boolean>(false);
  const [ktpErrorMsg, setKtpErrorMsg] = useState<string>('');

  const [resetPinProp, setResetPinProp] = useState<Property | null>(null);
  const [newPinInput, setNewPinInput] = useState('1234');
  const [resetMsg, setResetMsg] = useState('');
  const [resettingPin, setResettingPin] = useState(false);

  // Form Iuran Kas RT
  const [duesName, setDuesName] = useState('');
  const [duesHouse, setDuesHouse] = useState('');
  const [duesAmount, setDuesAmount] = useState('50000');
  const [selectedMonth, setSelectedMonth] = useState('Agustus');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [duesMsg, setDuesMsg] = useState('');
  const [submittingDues, setSubmittingDues] = useState(false);

  // Modal Kelola Akun Pengurus RT
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const session = await getCurrentAdminSession();
    setCurrentAdmin(session);

    const res = await getRtDashboardData();
    setProperties(res.properties || []);
    setTenants(res.tenants || []);

    const duesRes = await getDuesHistory();
    setDuesList(duesRes.dues || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadAdminUsers = async () => {
    const res = await getAllRtAdmins();
    setAdminList(res.admins || []);
  };

  const handleOpenAdminModal = () => {
    setShowAdminModal(true);
    loadAdminUsers();
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPass) return;

    setSavingAdmin(true);
    const res = await createRtAdmin(newAdminName, newAdminEmail, newAdminPass, 'ADMIN');
    setSavingAdmin(false);

    if (res.success) {
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPass('');
      await loadAdminUsers();
    } else {
      alert('Gagal menambah akun pengurus: ' + res.error);
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (confirm(`Hapus akun pengurus RT "${name}"?`)) {
      await deleteRtAdmin(id);
      await loadAdminUsers();
    }
  };

  const handleVerifyTenant = async (id: string, newStatus: 'VERIFIED' | 'REJECTED' | 'ACTIVE') => {
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    await verifyTenantByRt(id, newStatus);
    await loadData();
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinProp || !newPinInput) return;

    setResettingPin(true);
    const res = await resetPropertyPinByRt(resetPinProp.id, newPinInput);
    setResettingPin(false);

    if (res.success) {
      setResetMsg(`🔑 PIN untuk ${resetPinProp.name || resetPinProp.property_name} berhasil direset ke: ${newPinInput}`);
      setTimeout(() => setResetMsg(''), 4000);
      setResetPinProp(null);
      await loadData();
    } else {
      alert('Gagal reset PIN: ' + res.error);
    }
  };

  const handleViewKtp = async (tenant: Tenant) => {
    const targetPath = tenant.ktp_url || tenant.ktp_path;
    setSelectedTenantName(tenant.name);
    setLoadingKtp(true);
    setKtpErrorMsg('');
    setSelectedKtpUrl(null);

    if (!targetPath) {
      setLoadingKtp(false);
      setKtpErrorMsg('Warga ini tidak memiliki lampiran foto KTP.');
      return;
    }

    const res = await getTenantKtpUrl(targetPath);
    setLoadingKtp(false);

    if (res && res.success && res.url) {
      setSelectedKtpUrl(res.url);
    } else {
      setKtpErrorMsg(res?.error || 'Gagal membuka berkas KTP.');
    }
  };

  const handleDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duesName || !duesAmount) return;
    setSubmittingDues(true);

    const periodMonthFormatted = `${selectedMonth} ${selectedYear}`;

    const formData = new FormData();
    formData.append('resident_name', duesName);
    formData.append('house_number', duesHouse || 'Griya Alfatihah 78');
    formData.append('amount', duesAmount);
    formData.append('period_month', periodMonthFormatted);

    const res = await submitDuesPayment(formData);
    setSubmittingDues(false);

    if (res && res.success) {
      setDuesMsg(`Pembayaran iuran kas atas nama "${duesName}" (${periodMonthFormatted}) berhasil dicatat!`);
      setDuesName('');
      setDuesHouse('');
      setTimeout(() => setDuesMsg(''), 4000);
      await loadData();
    } else {
      alert('Gagal mencatat iuran: ' + (res?.error || 'Kesalahan teknis'));
    }
  };

  const handleDeleteDues = async (id: string, name: string) => {
    if (confirm(`Hapus catatan iuran atas nama "${name}"?`)) {
      setDuesList((prev) => prev.filter((d) => d.id !== id));
      await deleteDuesRecord(id);
      await loadData();
    }
  };

  const handleLogout = async () => {
    await logoutAdminRT();
    window.location.href = '/';
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      (t.address_ktp || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProperty =
      selectedProperty === 'ALL' || t.property_id === selectedProperty || t.properties?.id === selectedProperty;

    const st = (t.status || '').toUpperCase();
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'PENDING' && (st === 'PENDING' || st === 'ACTIVE')) ||
      (selectedStatus === 'VERIFIED' && st === 'VERIFIED');

    return matchesSearch && matchesProperty && matchesStatus;
  });

  const totalKasAmount = duesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const fontClass = textScale === 'lg' ? 'text-sm' : textScale === 'sm' ? 'text-[11px]' : 'text-xs';

  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  return (
    <main className={`min-h-screen bg-slate-100 p-3 md:p-8 text-slate-900 ${fontClass}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DASBOR RT */}
        <div className="bg-slate-900 text-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500 text-slate-950 rounded uppercase">
              PORTAL PENGURUS RT / KEPENDUDUKAN
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold mt-2 text-white">Dasbor Pengurus RT Terpadu</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Buku Register Warga Pendatang, Verifikasi & Reset PIN Properti, Kas Iuran RT
              {currentAdmin && <span className="text-emerald-400 block mt-0.5">👤 Login Sebagai: <b>{currentAdmin.name}</b> ({currentAdmin.role})</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* TOMBOL HANYA MUNCUL JIKA ROLE === SUPER_ADMIN */}
            {isSuperAdmin && (
              <button
                onClick={handleOpenAdminModal}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <span>⚙️ Kelola Pengurus</span>
              </button>
            )}

            {/* WIDGET ZOOM FONT */}
            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center gap-1 shadow-inner">
              <span className="text-xs text-emerald-400 font-bold px-1.5">T↕</span>
              <button
                onClick={() => setTextScale('sm')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${textScale === 'sm' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
              >
                A-
              </button>
              <button
                onClick={() => setTextScale('base')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${textScale === 'base' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
              >
                A
              </button>
              <button
                onClick={() => setTextScale('lg')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${textScale === 'lg' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}
              >
                A+
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all shadow flex items-center gap-1"
            >
              🚪 Keluar ke Utama
            </button>
          </div>
        </div>

        {resetMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold">
            {resetMsg}
          </div>
        )}

        {/* PANEL MANAJEMEN PIN KOS/KONTRAKAN TERDAFTAR */}
        <div className="bg-white p-5 rounded-2xl shadow border border-slate-200 space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase">
              🔑 Manajemen PIN Operasional Pemilik Unit ({properties.length})
            </h3>
            <span className="text-[11px] text-slate-500">Fitur Bantuan RT</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {properties.map((p) => (
              <div key={p.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{p.name || p.property_name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-500">PIN: <b>{p.pin_code || '1234'}</b></span>
                    {p.pin_locked_until && new Date(p.pin_locked_until) > new Date() && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-100 text-red-700 rounded">TERKUNCI</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setResetPinProp(p); setNewPinInput(p.pin_code || '1234'); }}
                  className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-900"
                >
                  🔑 Reset PIN
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* TABEL DATA PENDUDUK RT */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Daftar Lengkap Warga Pendatang Sementara
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              Menampilkan {filteredTenants.length} data
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-semibold">Memuat data kependudukan RT...</div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Tidak ada data warga pendatang yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-700 font-bold uppercase text-[10px]">
                    <th className="p-3">Nama Warga</th>
                    <th className="p-3">Lokasi Unit & Kamar</th>
                    <th className="p-3">Kota Asal KTP</th>
                    <th className="p-3">Kontak WA</th>
                    <th className="p-3">Dokumen KTP</th>
                    <th className="p-3">Mulai Menetap</th>
                    <th className="p-3">Status RT</th>
                    <th className="p-3 text-right">Aksi Verifikasi RT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTenants.map((t) => {
                    const isVerified = (t.status || '').toUpperCase() === 'VERIFIED';
                    const location = t.room_number ? `Kamar ${t.room_number}` : (t.full_address || 'Kos Melati 1');

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{t.name}</td>
                        <td className="p-3 font-semibold text-emerald-800">{location}</td>
                        <td className="p-3 font-medium text-slate-700">{t.address_ktp || '-'}</td>
                        <td className="p-3 font-mono text-slate-800">{t.phone}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleViewKtp(t)}
                            className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-semibold rounded hover:bg-slate-900"
                          >
                            🪪 KTP
                          </button>
                        </td>
                        <td className="p-3 font-mono">{t.entry_date}</td>
                        <td className="p-3">
                          {isVerified ? (
                            <span className="text-[10px] font-extrabold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                              ✅ VERIFIED
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                              ⚠️ MENUNGGU
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {!isVerified ? (
                            <button
                              onClick={() => handleVerifyTenant(t.id, 'VERIFIED')}
                              className="px-3 py-1.5 bg-emerald-700 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-800 shadow-sm"
                            >
                              ✓ Setujui
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerifyTenant(t.id, 'ACTIVE')}
                              className="px-2.5 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-300"
                            >
                              Batal
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODUL PENCATATAN & RIWAYAT IURAN KAS RT */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase">
                Pencatatan & Riwayat Kas Iuran RT
              </h2>
              <p className="text-xs text-slate-500">Kelola dan pantau seluruh transaksi kas masuk iuran warga</p>
            </div>

            <div className="bg-emerald-950 text-white px-5 py-2.5 rounded-xl border border-emerald-800 flex items-center gap-3 shadow-md">
              <span className="text-xl">💰</span>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 block">Total Kas Terkumpul</span>
                <span className="text-lg font-black text-white">
                  Rp {totalKasAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {duesMsg && (
            <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold">
              {duesMsg}
            </div>
          )}

          {/* FORM INPUT IURAN */}
          <form onSubmit={handleDuesSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Warga / Pembayar *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Saiful"
                value={duesName}
                onChange={(e) => setDuesName(e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rumah / Blok</label>
              <input
                type="text"
                placeholder="Griya Alfatihah 78"
                value={duesHouse}
                onChange={(e) => setDuesHouse(e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nominal (Rp) *</label>
              <input
                type="number"
                required
                value={duesAmount}
                onChange={(e) => setDuesAmount(e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bulan *</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none bg-white font-semibold text-slate-800"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tahun *</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none bg-white font-semibold text-slate-800"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6 flex justify-end pt-1">
              <button
                type="submit"
                disabled={submittingDues}
                className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all disabled:bg-slate-400"
              >
                {submittingDues ? 'Mencatat...' : 'Catat Iuran Kas'}
              </button>
            </div>
          </form>

          {/* TABEL RIWAYAT TRANSAKSI KAS */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              📜 Riwayat Transaksi Kas Iuran Terdaftar ({duesList.length})
            </h3>

            {duesList.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50 text-xs text-slate-500">
                Belum ada riwayat transaksi iuran kas yang dicatat.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700 font-bold uppercase text-[10px]">
                      <th className="p-3">Nama Pembayar</th>
                      <th className="p-3">Lokasi / Rumah</th>
                      <th className="p-3">Periode Iuran</th>
                      <th className="p-3">Nominal (Rp)</th>
                      <th className="p-3">Tanggal Catat</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {duesList.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{d.resident_name || 'Warga'}</td>
                        <td className="p-3 text-slate-600 font-medium">{d.house_number || '-'}</td>
                        <td className="p-3 font-semibold text-emerald-800">{d.period_month || '-'}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          Rp {Number(d.amount).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {d.paid_at ? new Date(d.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteDues(d.id, d.resident_name || 'Warga')}
                            className="px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 text-[10px] font-bold rounded-lg transition-colors"
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

      </div>

      {/* MODAL KELOLA AKUN PENGURUS RT (KHUSUS SUPER_ADMIN) */}
      {showAdminModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 space-y-0">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <span>⚙️ Kelola Akun Pengurus RT (Hak Akses Super Admin)</span>
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>

            <div className="p-5 space-y-5 bg-slate-50 max-h-[80vh] overflow-y-auto">
              
              {/* FORM BUAT AKUN PENGURUS BARU */}
              <form onSubmit={handleCreateAdminSubmit} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">➕ Tambah Akun Pengurus Baru</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pak RT Budi"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Login</label>
                    <input
                      type="email"
                      required
                      placeholder="pakt.budi@gmail.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kata Sandi Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Buat kata sandi..."
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    className="w-full text-xs p-2 border rounded-lg outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="w-full py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 disabled:bg-slate-300 transition-all shadow"
                >
                  {savingAdmin ? 'Menyimpan...' : 'Daftarkan Akun Pengurus'}
                </button>
              </form>

              {/* TABEL DAFTAR AKUN PENGURUS TERDAFTAR */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase">📋 Daftar Pengurus Terdaftar ({adminList.length})</h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-700 font-bold uppercase text-[9px]">
                        <th className="p-2.5">Nama & Peran</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {adminList.map((adm) => (
                        <tr key={adm.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">
                            <div>{adm.name}</div>
                            <span className="text-[9px] font-normal px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                              {adm.role}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">{adm.email}</td>
                          <td className="p-2.5 text-right">
                            {adm.role !== 'SUPER_ADMIN' ? (
                              <button
                                onClick={() => handleDeleteAdmin(adm.id, adm.name)}
                                className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded hover:bg-red-200"
                              >
                                Hapus
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-semibold">Utama</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="p-3 bg-slate-100 text-right border-t">
              <button
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
