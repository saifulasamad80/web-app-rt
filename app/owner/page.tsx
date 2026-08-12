'use client';

import React, { useEffect, useState } from 'react';
import { getOwnerPropertiesAndTenants, updateTenantStatus, getTenantKtpUrl, deleteTenant, updateHouseRules } from '../../src/actions/checkin-tenant';

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
  ktp_url?: string;
  ktp_path?: string;
  property_id?: string;
  properties?: { id: string; name: string; type: string; slug: string };
}

interface Property {
  id: string;
  name: string;
  type: string;
  slug: string;
  address: string;
  house_rules?: string;
}

export default function OwnerDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyMsg, setCopyMsg] = useState('');
  
  // State Filter
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'CHECKED_OUT'>('ALL');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('ALL');

  // State Modal KTP
  const [selectedKtpUrl, setSelectedKtpUrl] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [loadingKtp, setLoadingKtp] = useState<boolean>(false);
  const [ktpErrorMsg, setKtpErrorMsg] = useState<string>('');

  // State Modal Edit Tata Tertib
  const [editingRulesProp, setEditingRulesProp] = useState<Property | null>(null);
  const [rulesText, setRulesText] = useState<string>('');
  const [savingRules, setSavingRules] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await getOwnerPropertiesAndTenants();
    setProperties(res.properties || []);
    setTenants(res.tenants || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin + '/checkin/' + slug;
    navigator.clipboard.writeText(url);
    setCopyMsg('Tautan /checkin/' + slug + ' berhasil disalin!');
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const handleOpenRulesModal = (prop: Property) => {
    setEditingRulesProp(prop);
    setRulesText(
      prop.house_rules ||
        '1. Wajib menjaga ketertiban dan ketenangan lingkungan.\n2. Dilarang membawa barang terlarang (narkoba/miras) atau berbuat asusila.\n3. Tamu menginap wajib melapor.\n4. Pembayaran sewa dilakukan tepat waktu maksimal tanggal 5 setiap bulan.'
    );
  };

  const handleSaveRules = async () => {
    if (!editingRulesProp) return;
    setSavingRules(true);
    const res = await updateHouseRules(editingRulesProp.id, rulesText);
    setSavingRules(false);

    if (res && res.success) {
      setCopyMsg('Tata tertib properti ' + editingRulesProp.name + ' berhasil diperbarui!');
      setTimeout(() => setCopyMsg(''), 3000);
      setEditingRulesProp(null);
      await fetchData();
    } else {
      alert('Gagal menyimpan tata tertib: ' + (res?.error || 'Kesalahan database'));
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'checked_out') => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus.toUpperCase() } : t))
    );

    const res = await updateTenantStatus(id, newStatus);
    if (res && !res.success) {
      await fetchData();
    } else {
      await fetchData();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data penghuni "${name}"?`)) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      const res = await deleteTenant(id);
      if (res && !res.success) {
        alert('Gagal menghapus: ' + res.error);
        await fetchData();
      } else {
        await fetchData();
      }
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
      setKtpErrorMsg('Penyewa ini mendaftar tanpa berkas KTP (Usia < 17 tahun atau data lama).');
      return;
    }

    const res = await getTenantKtpUrl(targetPath);
    setLoadingKtp(false);

    if (res && res.success && res.url) {
      setSelectedKtpUrl(res.url);
    } else {
      setKtpErrorMsg(res?.error || 'Gagal memuat berkas KTP.');
    }
  };

  const formatPhoneToWA = (phone: string) => {
    let cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  const filteredTenants = tenants.filter((t) => {
    const st = (t.status || '').toUpperCase();
    const matchesStatus = activeTab === 'ALL' || st === activeTab;
    const propId = t.property_id || t.properties?.id;
    const matchesProperty = selectedPropertyFilter === 'ALL' || propId === selectedPropertyFilter;
    return matchesStatus && matchesProperty;
  });

  const countAll = tenants.length;
  const countPending = tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING').length;
  const countActive = tenants.filter((t) => (t.status || '').toUpperCase() === 'ACTIVE').length;
  const countCheckedOut = tenants.filter((t) => (t.status || '').toUpperCase() === 'CHECKED_OUT').length;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-emerald-900 text-white p-6 rounded-xl shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dasbor Pemilik Kos & Kontrakan</h1>
            <p className="text-xs text-emerald-200 mt-1">
              Kelola Properti, Tata Tertib Hunian, dan Verifikasi Penyewa
            </p>
          </div>

          {properties.length > 0 && (
            <div className="bg-emerald-800/80 p-2 rounded-lg border border-emerald-700">
              <label className="block text-[10px] text-emerald-200 font-bold uppercase mb-1">
                Filter Properti:
              </label>
              <select
                value={selectedPropertyFilter}
                onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                className="bg-white text-gray-900 text-xs font-bold p-2 rounded w-full md:w-56 outline-none"
              >
                <option value="ALL">🏢 Semua Properti ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {copyMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold">
            {copyMsg}
          </div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-semibold uppercase">Total Terdaftar</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">{countAll}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/30 shadow-sm">
            <span className="text-xs text-amber-700 font-semibold uppercase">Menunggu (Pending)</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{countPending}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200 bg-green-50/30 shadow-sm">
            <span className="text-xs text-green-700 font-semibold uppercase">Aktif Menghuni</span>
            <p className="text-2xl font-extrabold text-green-600 mt-1">{countActive}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 bg-gray-100/50 shadow-sm">
            <span className="text-xs text-gray-600 font-semibold uppercase">Checked-Out</span>
            <p className="text-2xl font-extrabold text-gray-600 mt-1">{countCheckedOut}</p>
          </div>
        </div>

        {/* PROPERTI MILIK ANDA & PENGATURAN TATA TERTIB */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-lg font-bold mb-3">Properti Milik Anda</h2>
          {properties.length === 0 ? (
            <div className="text-sm text-gray-500">
              Properti default: <span className="font-mono font-semibold">kos-melati-1</span>
              <button
                onClick={() => handleCopyLink('kos-melati-1')}
                className="ml-3 px-2.5 py-1 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800"
              >
                📋 Salin Link Check-In
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map((prop) => (
                <div key={prop.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded uppercase">
                      {prop.type}
                    </span>
                    <h3 className="font-bold text-base mt-1">{prop.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">/checkin/{prop.slug}</p>
                  </div>
                  
                  {/* TOMBOL AKSI PROPERTI */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleCopyLink(prop.slug)}
                      className="flex-1 px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800 transition-colors"
                    >
                      📋 Salin Link
                    </button>
                    <button
                      onClick={() => handleOpenRulesModal(prop)}
                      className="flex-1 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-900 transition-colors inline-flex items-center justify-center gap-1"
                    >
                      <span>📜 Atur Tata Tertib</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DAFTAR PENGHUNI */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Daftar Penghuni / Penyewa</h2>
              <p className="text-xs text-gray-500">
                {selectedPropertyFilter === 'ALL'
                  ? 'Menampilkan seluruh penyewa dari semua unit properti.'
                  : 'Menampilkan penyewa khusus unit terfilter.'}
              </p>
            </div>

            {/* TAB FILTER STATUS */}
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'ALL' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'PENDING' ? 'bg-amber-500 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'ACTIVE' ? 'bg-green-600 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Aktif
              </button>
              <button
                onClick={() => setActiveTab('CHECKED_OUT')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'CHECKED_OUT' ? 'bg-gray-700 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Keluar
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Memuat data penyewa...</p>
          ) : filteredTenants.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-lg bg-gray-50">
              <p className="text-sm text-gray-500">
                Tidak ada data penghuni yang cocok dengan filter saat ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b text-gray-700">
                    <th className="p-2.5">Nama & Status</th>
                    <th className="p-2.5">Lokasi / Kamar Unit</th>
                    <th className="p-2.5">WhatsApp Direct</th>
                    <th className="p-2.5">Dokumen KTP</th>
                    <th className="p-2.5">Tanggal Masuk</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTenants.map((t) => {
                    const st = (t.status || '').toUpperCase();
                    const waNumber = formatPhoneToWA(t.phone);
                    const waMessage = encodeURIComponent(`Halo Sdr/i ${t.name}, salam dari Pemilik Kos/Kontrakan. Mengenai pendataan hunian Anda:`);
                    
                    const locationLabel = t.room_number 
                      ? `Kamar: ${t.room_number}`
                      : (t.full_address || t.properties?.name || 'Kos Melati 1');

                    return (
                      <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-2.5 font-medium">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{t.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 inline-block mt-0.5">
                            {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                          </span>
                        </td>
                        <td className="p-2.5 text-xs text-gray-700">
                          <div className="font-semibold text-emerald-800">{locationLabel}</div>
                          <span className="text-[10px] text-gray-400 font-mono block">
                            {t.properties?.name || 'Properti Default'}
                          </span>
                        </td>
                        <td className="p-2.5 text-xs font-mono">
                          <div className="flex items-center space-x-2">
                            <span>{t.phone}</span>
                            <a
                              href={`https://wa.me/${waNumber}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center space-x-1 shadow-sm"
                            >
                              <span>💬 Chat WA</span>
                            </a>
                          </div>
                        </td>
                        <td className="p-2.5 text-xs">
                          <button
                            onClick={() => handleViewKtp(t)}
                            className="px-2.5 py-1 bg-slate-800 text-white text-[10px] rounded font-semibold hover:bg-slate-900 transition-colors inline-flex items-center space-x-1"
                          >
                            <span>🪪 Lihat KTP</span>
                          </button>
                        </td>
                        <td className="p-2.5 text-xs">{t.entry_date}</td>
                        <td className="p-2.5">
                          <span className={'text-[10px] font-bold px-2 py-0.5 rounded uppercase ' + 
                            (st === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                             st === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800')}>
                            {st}
                          </span>
                        </td>
                        <td className="p-2.5 text-right space-x-1">
                          {st !== 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusChange(t.id, 'active')}
                              className="px-2 py-1 bg-green-600 text-white text-[10px] rounded font-semibold hover:bg-green-700"
                            >
                              Set Active
                            </button>
                          )}
                          {st !== 'CHECKED_OUT' && (
                            <button
                              onClick={() => handleStatusChange(t.id, 'checked_out')}
                              className="px-2 py-1 bg-red-600 text-white text-[10px] rounded font-semibold hover:bg-red-700"
                            >
                              Check-Out
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-[10px] rounded font-semibold hover:bg-red-100 hover:text-red-700 transition-colors"
                          >
                            🗑️ Hapus
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

      </div>

      {/* MODAL EDIT TATA TERTIB */}
      {editingRulesProp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>📜 Atur Tata Tertib & Ketentuan Hunian</span>
                </h3>
                <p className="text-[11px] text-emerald-400 mt-0.5">
                  Properti: {editingRulesProp.name} ({editingRulesProp.type.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setEditingRulesProp(null)}
                className="text-gray-400 hover:text-white font-bold text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 bg-slate-50">
              <p className="text-xs text-gray-600">
                Tuliskan poin-poin aturan kos/kontrakan Anda di bawah ini. Aturan ini wajib disetujui penyewa sebelum mendaftar:
              </p>
              <textarea
                rows={7}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                placeholder="Tuliskan peraturan di sini..."
                className="w-full text-xs p-3 border rounded-lg font-mono bg-white focus:ring-2 focus:ring-emerald-600 outline-none leading-relaxed"
              ></textarea>
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                🔒 Teks tata tertib ini memiliki kekuatan perjanjian sewa yang sah secara elektronik sesuai UU ITE dan KUHPerdata saat dicentang oleh penyewa.
              </p>
            </div>

            <div className="p-3 bg-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingRulesProp(null)}
                className="px-4 py-1.5 bg-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRules}
                disabled={savingRules}
                className="px-4 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800 disabled:bg-gray-400"
              >
                {savingRules ? 'Menyimpan...' : 'Simpan Tata Tertib'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KTP VIEWER */}
      {(selectedTenantName || loadingKtp) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>🛡️ Dokumen KTP PDP Compliant:</span>
                <span className="text-emerald-400 font-normal">{selectedTenantName}</span>
              </h3>
              <button
                onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }}
                className="text-gray-400 hover:text-white font-bold text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center min-h-[220px] bg-slate-50">
              {loadingKtp ? (
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-gray-500 font-semibold">Memuat Tautan Aman KTP...</p>
                </div>
              ) : ktpErrorMsg ? (
                <div className="text-center space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md">
                  <p className="text-xl">⚠️</p>
                  <p className="text-xs font-semibold text-amber-800">{ktpErrorMsg}</p>
                </div>
              ) : selectedKtpUrl ? (
                <div className="space-y-3 w-full text-center">
                  <img
                    src={selectedKtpUrl}
                    alt="Dokumen KTP Penghuni"
                    className="max-h-[350px] w-auto mx-auto rounded-lg border shadow-sm object-contain"
                  />
                  <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 font-semibold">
                    🔒 Tautan ini bersifat privat dan akan kedaluwarsa secara otomatis dalam 60 detik demi mematuhi UU PDP.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="p-3 bg-gray-100 text-right">
              <button
                onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }}
                className="px-4 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded hover:bg-gray-800"
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
