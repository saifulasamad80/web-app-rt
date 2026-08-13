'use client';

import React, { useEffect, useState } from 'react';
import {
  getPublicPropertiesList,
  getTenantsByPropertyPin,
  createProperty,
  updateTenantStatus,
  getTenantKtpUrl,
  deleteTenant,
  updateHouseRules,
} from '../../src/actions/checkin-tenant';

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
  property_name?: string;
  type: string;
  slug: string;
  address?: string;
  house_rules?: string;
  status?: string;
}

export default function OwnerDashboard() {
  const [propertiesList, setPropertiesList] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [copyMsg, setCopyMsg] = useState('');

  // State Modal Input PIN
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [targetPropForUnlock, setTargetPropForUnlock] = useState<Property | null>(null);
  const [inputPin, setInputPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);

  // State Modal Tambah Properti Baru
  const [showAddPropModal, setShowAddPropModal] = useState<boolean>(false);
  const [newPropName, setNewPropName] = useState<string>('');
  const [newPropType, setNewPropType] = useState<'kos' | 'kontrakan'>('kos');
  const [newPropAddress, setNewPropAddress] = useState<string>('');
  const [newPropRules, setNewPropRules] = useState<string>('');
  const [newPropPin, setNewPropPin] = useState<string>('');
  const [creatingProp, setCreatingProp] = useState<boolean>(false);

  // State Modal Edit Tata Tertib
  const [editingRulesProp, setEditingRulesProp] = useState<Property | null>(null);
  const [rulesText, setRulesText] = useState<string>('');
  const [savingRules, setSavingRules] = useState<boolean>(false);

  // State Modal KTP
  const [selectedKtpUrl, setSelectedKtpUrl] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [loadingKtp, setLoadingKtp] = useState<boolean>(false);
  const [ktpErrorMsg, setKtpErrorMsg] = useState<string>('');

  const fetchPublicPropertyList = async () => {
    const res = await getPublicPropertiesList();
    setPropertiesList(res.properties || []);
  };

  useEffect(() => {
    fetchPublicPropertyList();
  }, []);

  const handleOpenUnlockModal = (prop: Property) => {
    setTargetPropForUnlock(prop);
    setInputPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleUnlockWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPropForUnlock || !inputPin) return;

    setVerifyingPin(true);
    setPinError('');

    const res = await getTenantsByPropertyPin(targetPropForUnlock.id, inputPin);
    setVerifyingPin(false);

    if (res.success && res.property) {
      setActiveProperty(res.property);
      setTenants(res.tenants || []);
      setIsUnlocked(true);
      setShowPinModal(false);
      setInputPin('');
      setCopyMsg('Dasbor ' + (res.property.name || res.property.property_name) + ' berhasil dibuka!');
      setTimeout(() => setCopyMsg(''), 3000);
    } else {
      setPinError(res.error || '🔒 PIN 4-digit salah.');
    }
  };

  const handleCreatePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropPin) return;

    if (!/^\d{4}$/.test(newPropPin)) {
      alert('PIN harus berupa 4-digit angka (contoh: 1234)');
      return;
    }

    setCreatingProp(true);
    const res = await createProperty(newPropName, newPropType, newPropAddress, newPropRules, newPropPin);
    setCreatingProp(false);

    if (res && res.success) {
      setCopyMsg('Properti "' + newPropName + '" berhasil dibuat dengan PIN 4-Digit! Menunggu verifikasi RT.');
      setTimeout(() => setCopyMsg(''), 4000);
      setShowAddPropModal(false);
      setNewPropName('');
      setNewPropAddress('');
      setNewPropRules('');
      setNewPropPin('');
      await fetchPublicPropertyList();
    } else {
      alert('Gagal membuat properti: ' + (res?.error || 'Kesalahan teknis'));
    }
  };

  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin + '/checkin/' + slug;
    navigator.clipboard.writeText(url);
    setCopyMsg('Tautan /checkin/' + slug + ' berhasil disalin!');
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'checked_out') => {
    if (!activeProperty) return;
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus.toUpperCase() } : t)));
    await updateTenantStatus(id, newStatus);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data penghuni "${name}"?`)) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      await deleteTenant(id);
    }
  };

  const handleOpenRulesModal = (prop: Property) => {
    setEditingRulesProp(prop);
    setRulesText(
      prop.house_rules ||
        '1. Wajib menjaga ketertiban dan ketenangan lingkungan.\n2. Dilarang membawa barang terlarang.\n3. Pembayaran sewa tepat waktu.'
    );
  };

  const handleSaveRules = async () => {
    if (!editingRulesProp) return;
    setSavingRules(true);
    const res = await updateHouseRules(editingRulesProp.id, rulesText);
    setSavingRules(false);

    if (res && res.success) {
      setCopyMsg('Tata tertib berhasil diperbarui!');
      setTimeout(() => setCopyMsg(''), 3000);
      setEditingRulesProp(null);
      if (activeProperty) {
        setActiveProperty({ ...activeProperty, house_rules: rulesText });
      }
    } else {
      alert('Gagal menyimpan tata tertib: ' + (res?.error || 'Kesalahan database'));
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
      setKtpErrorMsg('Penyewa ini mendaftar tanpa berkas KTP.');
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
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    return cleaned;
  };

  const countAll = tenants.length;
  const countPending = tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING').length;
  const countActive = tenants.filter((t) => (t.status || '').toUpperCase() === 'ACTIVE').length;
  const countCheckedOut = tenants.filter((t) => (t.status || '').toUpperCase() === 'CHECKED_OUT').length;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-100 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-emerald-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-900">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Dasbor Pemilik Kos & Kontrakan</h1>
            <p className="text-xs text-emerald-300 mt-1">
              Portal Mandiri Terproteksi PIN 4-Digit Pemilik Unit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddPropModal(true)}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all shadow"
            >
              + Tambah Properti Baru
            </button>
            {isUnlocked && (
              <button
                onClick={() => { setIsUnlocked(false); setActiveProperty(null); setTenants([]); }}
                className="px-3.5 py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-700 border border-slate-700"
              >
                🔒 Kunci Dasbor
              </button>
            )}
          </div>
        </div>

        {copyMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold">
            {copyMsg}
          </div>
        )}

        {/* PILIH PROPERTI UNTUK DI-UNLOCK */}
        <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pilih Unit Properti Anda</h2>
              <p className="text-xs text-slate-500">Masukkan PIN 4-Digit rahasia unit Anda untuk membuka data penyewa.</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {propertiesList.length} Unit Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {propertiesList.map((prop) => {
              const isCurrentActive = isUnlocked && activeProperty?.id === prop.id;

              return (
                <div
                  key={prop.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    isCurrentActive ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded uppercase">
                        {prop.type}
                      </span>
                      {prop.status === 'APPROVED' ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded">
                          ✅ VERIFIED RT
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                          ⚠️ MENUNGGU RT
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base mt-2 text-slate-900">{prop.name || prop.property_name}</h3>
                    <p className="text-xs text-slate-500 font-mono">/checkin/{prop.slug}</p>
                    <p className="text-xs text-slate-600 mt-1">{prop.address || 'Alamat belum diatur'}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyLink(prop.slug)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg hover:bg-slate-300"
                    >
                      📋 Link Check-In
                    </button>

                    {isCurrentActive ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <span>🔓 Dasbor Aktif</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenUnlockModal(prop)}
                        className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1"
                      >
                        <span>🔒 Buka Dasbor (PIN)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TAMPILKAN DATA DASBOR HANYA JIKA PIN BENAR / UNLOCKED */}
        {isUnlocked && activeProperty ? (
          <div className="space-y-6">

            <div className="bg-emerald-900 text-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-slate-950 rounded uppercase">
                  DASBOR KHUSUS UNIT TERVERIFIKASI PIN
                </span>
                <h2 className="text-lg font-bold mt-1 text-white">{activeProperty.name || activeProperty.property_name}</h2>
              </div>
              <button
                onClick={() => handleOpenRulesModal(activeProperty)}
                className="px-3.5 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 border border-slate-700"
              >
                📜 Atur Tata Tertib Hunian
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold uppercase">Total Terdaftar</span>
                <p className="text-2xl font-black text-slate-800 mt-1">{countAll}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
                <span className="text-xs text-amber-700 font-bold uppercase">Menunggu (Pending)</span>
                <p className="text-2xl font-black text-amber-600 mt-1">{countPending}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50/30 shadow-sm">
                <span className="text-xs text-green-700 font-bold uppercase">Aktif Menghuni</span>
                <p className="text-2xl font-black text-green-600 mt-1">{countActive}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 bg-slate-100/50 shadow-sm">
                <span className="text-xs text-slate-600 font-bold uppercase">Checked-Out</span>
                <p className="text-2xl font-black text-slate-600 mt-1">{countCheckedOut}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Daftar Penghuni / Penyewa Khusus: {activeProperty.name || activeProperty.property_name}
              </h3>

              {tenants.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Belum ada penyewa yang mendaftar di unit ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-700 font-bold uppercase text-[10px]">
                        <th className="p-3">Nama & Peran</th>
                        <th className="p-3">Lokasi / Kamar</th>
                        <th className="p-3">WhatsApp Direct</th>
                        <th className="p-3">Dokumen KTP</th>
                        <th className="p-3">Tanggal Masuk</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tenants.map((t) => {
                        const st = (t.status || '').toUpperCase();
                        const waNumber = formatPhoneToWA(t.phone);
                        const locationLabel = t.room_number ? `Kamar: ${t.room_number}` : (t.full_address || activeProperty.name);

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-medium">
                              <div className="font-bold text-slate-900">{t.name}</div>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 inline-block mt-0.5">
                                {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 font-semibold">{locationLabel}</td>
                            <td className="p-3 font-mono">
                              <a
                                href={`https://wa.me/${waNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-emerald-600 text-white text-[10px] rounded font-bold hover:bg-emerald-700 inline-flex items-center gap-1 shadow-sm"
                              >
                                💬 Chat WA ({t.phone})
                              </a>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleViewKtp(t)}
                                className="px-2.5 py-1 bg-slate-800 text-white text-[10px] rounded font-bold hover:bg-slate-900"
                              >
                                🪪 Lihat KTP
                              </button>
                            </td>
                            <td className="p-3 font-mono">{t.entry_date}</td>
                            <td className="p-3">
                              <span className={'text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ' +
                                (st === 'ACTIVE' || st === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                 st === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800')}>
                                {st}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {st !== 'ACTIVE' && (
                                <button
                                  onClick={() => handleStatusChange(t.id, 'active')}
                                  className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700"
                                >
                                  Aktifkan
                                </button>
                              )}
                              {st !== 'CHECKED_OUT' && (
                                <button
                                  onClick={() => handleStatusChange(t.id, 'checked_out')}
                                  className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700"
                                >
                                  Out
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(t.id, t.name)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded hover:bg-red-100 hover:text-red-700"
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
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-3xl">🔒</p>
            <h3 className="text-base font-bold text-slate-800">Dasbor Penyewa Masih Terkunci</h3>
            <p className="text-xs text-slate-500">
              Pilih salah satu unit properti Anda di atas lalu klik tombol <b>"🔒 Buka Dasbor (PIN)"</b> untuk memverifikasi hak akses Anda.
            </p>
          </div>
        )}

      </div>

      {/* MODAL INPUT PIN 4-DIGIT */}
      {showPinModal && targetPropForUnlock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">🔒 Verifikasi PIN 4-Digit Pemilik</h3>
              <button onClick={() => setShowPinModal(false)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleUnlockWithPin} className="p-5 space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">{targetPropForUnlock.name || targetPropForUnlock.property_name}</h4>
                <p className="text-[11px] text-slate-500">Masukkan PIN 4-digit rahasia unit ini:</p>
              </div>

              {pinError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold text-center">
                  {pinError}
                </div>
              )}

              <div>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  placeholder="• • • •"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl tracking-[0.5em] p-3 border-2 border-slate-300 rounded-xl font-mono focus:border-emerald-600 outline-none"
                />
                <p className="text-[10px] text-slate-400 text-center mt-1">Petunjuk Pengujian: PIN default unit awal adalah <b>1234</b></p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifyingPin || inputPin.length !== 4}
                  className="flex-1 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 disabled:bg-slate-300 transition-all shadow"
                >
                  {verifyingPin ? 'Memeriksa...' : 'Buka Dasbor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PROPERTI BARU */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-emerald-950 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">🏢 Daftarkan Properti Kos / Kontrakan Baru</h3>
              <button onClick={() => setShowAddPropModal(false)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleCreatePropertySubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Nama Unit Properti *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kontrakan Berkah"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Tipe Properti *</label>
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value as 'kos' | 'kontrakan')}
                  className="w-full text-xs p-2.5 border rounded-xl bg-white font-semibold text-slate-800"
                >
                  <option value="kos">Kos-kosan (Per Kamar)</option>
                  <option value="kontrakan">Kontrakan (1 Rumah / Unit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Buat PIN 4-Digit Rahasia *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="Contoh: 8821"
                  value={newPropPin}
                  onChange={(e) => setNewPropPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-xs p-2.5 border rounded-xl font-mono tracking-widest focus:ring-2 focus:ring-emerald-600 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">PIN ini digunakan untuk membuka data penyewa Anda.</p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Alamat Lengkap Unit</label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Melati No. 88 RT 02/RW 05"
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Tata Tertib Khusus Unit (Opsional)</label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan aturan khusus..."
                  value={newPropRules}
                  onChange={(e) => setNewPropRules(e.target.value)}
                  className="w-full text-xs p-2 border rounded-xl font-mono outline-none"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPropModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingProp || newPropPin.length !== 4}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 disabled:bg-slate-300 transition-all shadow"
                >
                  {creatingProp ? 'Mendaftarkan...' : 'Daftarkan Properti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT TATA TERTIB */}
      {editingRulesProp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">📜 Atur Tata Tertib Hunian</h3>
              <button onClick={() => setEditingRulesProp(null)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3 bg-slate-50">
              <textarea
                rows={7}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="w-full text-xs p-3 border rounded-xl font-mono bg-white focus:ring-2 focus:ring-emerald-600 outline-none leading-relaxed"
              ></textarea>
            </div>
            <div className="p-3 bg-slate-100 flex justify-end gap-2">
              <button onClick={() => setEditingRulesProp(null)} className="px-4 py-1.5 bg-slate-300 text-slate-700 text-xs font-bold rounded-xl">Batal</button>
              <button onClick={handleSaveRules} disabled={savingRules} className="px-4 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 disabled:bg-slate-400">
                {savingRules ? 'Menyimpan...' : 'Simpan Tata Tertib'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KTP VIEWER */}
      {(selectedTenantName || loadingKtp) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <span>🛡️ Dokumen KTP PDP Compliant:</span>
                <span className="text-emerald-400">{selectedTenantName}</span>
              </h3>
              <button onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center min-h-[220px] bg-slate-50">
              {loadingKtp ? (
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500 font-semibold">Memuat Tautan Aman KTP...</p>
                </div>
              ) : ktpErrorMsg ? (
                <div className="text-center space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-md">
                  <p className="text-xs font-semibold text-amber-800">{ktpErrorMsg}</p>
                </div>
              ) : selectedKtpUrl ? (
                <div className="space-y-3 w-full text-center">
                  <img src={selectedKtpUrl} alt="Dokumen KTP Penghuni" className="max-h-[350px] w-auto mx-auto rounded-xl border shadow-sm object-contain" />
                  <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-semibold">
                    🔒 Tautan privat ini akan kedaluwarsa secara otomatis dalam 60 detik (UU PDP).
                  </p>
                </div>
              ) : null}
            </div>
            <div className="p-3 bg-slate-100 text-right">
              <button onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }} className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl">Tutup Dokumen</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
