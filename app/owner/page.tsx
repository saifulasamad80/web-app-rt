'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  owner_name?: string;
  owner_phone?: string;
}

export default function OwnerDashboard() {
  const [propertiesList, setPropertiesList] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [copyMsg, setCopyMsg] = useState('');

  const [textScale, setTextScale] = useState<'sm' | 'base' | 'lg'>('base');

  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [targetPropForUnlock, setTargetPropForUnlock] = useState<Property | null>(null);
  const [inputPin, setInputPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);

  // Modal Tambah Properti Baru
  const [showAddPropModal, setShowAddPropModal] = useState<boolean>(false);
  const [newPropName, setNewPropName] = useState<string>('');
  const [newPropType, setNewPropType] = useState<'kos' | 'kontrakan'>('kos');
  const [newPropOwnerName, setNewPropOwnerName] = useState<string>('');
  const [newPropOwnerPhone, setNewPropOwnerPhone] = useState<string>('');
  const [newPropAddress, setNewPropAddress] = useState<string>('');
  const [newPropRules, setNewPropRules] = useState<string>('');
  const [newPropPin, setNewPropPin] = useState<string>('');
  const [creatingProp, setCreatingProp] = useState<boolean>(false);

  const [editingRulesProp, setEditingRulesProp] = useState<Property | null>(null);
  const [rulesText, setRulesText] = useState<string>('');
  const [savingRules, setSavingRules] = useState<boolean>(false);

  const [posterProp, setPosterProp] = useState<Property | null>(null);

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
    const res = await createProperty(
      newPropName,
      newPropType,
      newPropAddress,
      newPropRules,
      newPropPin,
      newPropOwnerName,
      newPropOwnerPhone
    );
    setCreatingProp(false);

    if (res && res.success) {
      setCopyMsg('Properti "' + newPropName + '" berhasil dibuat!');
      setTimeout(() => setCopyMsg(''), 4000);
      setShowAddPropModal(false);
      setNewPropName('');
      setNewPropOwnerName('');
      setNewPropOwnerPhone('');
      setNewPropAddress('');
      setNewPropRules('');
      setNewPropPin('');
      await fetchPublicPropertyList();
    } else {
      alert('Gagal membuat properti: ' + (res?.error || 'Kesalahan teknis'));
    }
  };

  const handleShareWA = (prop: Property) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const checkinUrl = origin + '/checkin/' + prop.slug;
    const propName = prop.name || prop.property_name;

    const message = `Halo calon penghuni *${propName}*,\n\nSesuai Peraturan Wajib Lapor Kependudukan RT setempat, mohon melengkapi formulir lapor diri digital resmi melalui tautan berikut sebelum menempati unit:\n\n👉 ${checkinUrl}\n\nProses ini wajib untuk pendataan kependudukan RT. Terima kasih.`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
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

  const fontClass = textScale === 'lg' ? 'text-base' : textScale === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <main className={`min-h-screen p-3 md:p-8 bg-slate-100 text-slate-900 ${fontClass}`}>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="bg-emerald-950 text-white p-5 md:p-6 rounded-2xl shadow-xl border border-emerald-900 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white">Dasbor Pemilik Kos & Kontrakan</h1>
              <p className="text-xs text-emerald-300 mt-0.5">
                Portal Mandiri Terproteksi PIN 4-Digit Pemilik Unit
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-emerald-900/80 p-1 rounded-xl border border-emerald-700/60 flex items-center gap-1">
                <span className="text-[10px] font-bold px-2 text-emerald-300">Ukuran Teks:</span>
                <button
                  onClick={() => setTextScale('sm')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${textScale === 'sm' ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950 text-emerald-200 hover:bg-emerald-800'}`}
                >
                  A-
                </button>
                <button
                  onClick={() => setTextScale('base')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${textScale === 'base' ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950 text-emerald-200 hover:bg-emerald-800'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setTextScale('lg')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${textScale === 'lg' ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-950 text-emerald-200 hover:bg-emerald-800'}`}
                >
                  A+
                </button>
              </div>

              <Link
                href="/"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center gap-1"
              >
                <span>🚪 Keluar ke Halaman Utama</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-900/80">
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

        {/* PILIH PROPERTI */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pilih Unit Properti Anda</h2>
              <p className="text-xs text-slate-500">Gunakan PIN 4-Digit untuk membuka data penyewa.</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {propertiesList.length} Unit
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
                    {prop.owner_name && (
                      <p className="text-xs text-emerald-800 font-semibold mt-0.5">👤 Pemilik: {prop.owner_name} {prop.owner_phone ? `(${prop.owner_phone})` : ''}</p>
                    )}
                    <p className="text-xs text-slate-500 font-mono break-all mt-1">/checkin/{prop.slug}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{prop.address || 'Alamat belum diatur'}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleShareWA(prop)}
                        className="flex-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <span>💬 Kirim WA</span>
                      </button>

                      <button
                        onClick={() => setPosterProp(prop)}
                        className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-all shadow-sm flex items-center gap-1"
                      >
                        <span>🖨️ Poster QR</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {isCurrentActive ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 w-full justify-center py-1 bg-emerald-100/50 rounded-lg">
                          <span>🔓 Dasbor Aktif</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenUnlockModal(prop)}
                          className="w-full py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span>🔒 Buka Dasbor (PIN)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DASBOR PENYEWA TERVERIFIKASI PIN */}
        {isUnlocked && activeProperty ? (
          <div className="space-y-6">

            <div className="bg-emerald-900 text-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-slate-950 rounded uppercase">
                  DASBOR KHUSUS UNIT TERVERIFIKASI PIN
                </span>
                <h2 className="text-lg font-bold mt-1 text-white">{activeProperty.name || activeProperty.property_name}</h2>
                {activeProperty.owner_name && <p className="text-xs text-emerald-200 mt-0.5">Pemilik Resmi: {activeProperty.owner_name}</p>}
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
                <span className="text-xs text-amber-700 font-bold uppercase">Menunggu</span>
                <p className="text-2xl font-black text-amber-600 mt-1">{countPending}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50/30 shadow-sm">
                <span className="text-xs text-green-700 font-bold uppercase">Aktif</span>
                <p className="text-2xl font-black text-green-600 mt-1">{countActive}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 bg-slate-100/50 shadow-sm">
                <span className="text-xs text-slate-600 font-bold uppercase">Out</span>
                <p className="text-2xl font-black text-slate-600 mt-1">{countCheckedOut}</p>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Daftar Penghuni / Penyewa Khusus: {activeProperty.name || activeProperty.property_name}
              </h3>

              {tenants.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Belum ada penyewa yang mendaftar di unit ini.</p>
                </div>
              ) : (
                <>
                  <div className="block md:hidden space-y-3">
                    {tenants.map((t) => {
                      const st = (t.status || '').toUpperCase();
                      const waNumber = formatPhoneToWA(t.phone);
                      const locationLabel = t.room_number ? `Kamar: ${t.room_number}` : (t.full_address || activeProperty.name);

                      return (
                        <div key={t.id} className="p-4 bg-slate-50 border rounded-xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded inline-block mt-1">
                                {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                              </span>
                            </div>
                            <span className={'text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ' +
                              (st === 'ACTIVE' || st === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                               st === 'CHECKED_OUT' ? 'bg-slate-200 text-slate-800' : 'bg-amber-100 text-amber-800')}>
                              {st}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 text-slate-600 font-medium border-t pt-2 border-slate-200">
                            <p>🏠 <b>Lokasi:</b> {locationLabel}</p>
                            <p>📅 <b>Masuk:</b> {t.entry_date}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 bg-emerald-600 text-white text-[11px] rounded-lg font-bold text-center"
                            >
                              💬 Chat WA
                            </a>
                            <button
                              onClick={() => handleViewKtp(t)}
                              className="px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg font-bold"
                            >
                              🪪 KTP
                            </button>
                            {st !== 'ACTIVE' && (
                              <button
                                onClick={() => handleStatusChange(t.id, 'active')}
                                className="px-3 py-2 bg-green-600 text-white text-[11px] font-bold rounded-lg"
                              >
                                Aktif
                              </button>
                            )}
                            {st !== 'CHECKED_OUT' && (
                              <button
                                onClick={() => handleStatusChange(t.id, 'checked_out')}
                                className="px-3 py-2 bg-red-600 text-white text-[11px] font-bold rounded-lg"
                              >
                                Out
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(t.id, t.name)}
                              className="p-2 bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
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
                </>
              )}
            </div>

          </div>
        ) : (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-3xl">🔒</p>
            <h3 className="text-base font-bold text-slate-800">Dasbor Penyewa Masih Terkunci</h3>
            <p className="text-xs text-slate-500">
              Pilih salah satu unit properti Anda di atas lalu klik tombol <b>"🔒 Buka Dasbor (PIN)"</b> untuk memverifikasi hak akses Anda.
            </p>
          </div>
        )}

      </div>

      {/* MODAL CETAK POSTER QR CODE */}
      {posterProp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
              <h3 className="text-xs font-bold">🖨️ Poster Resmi QR Code Wajib Lapor RT</h3>
              <button onClick={() => setPosterProp(null)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>

            <div className="p-6 text-center space-y-4 bg-white" id="printable-poster">
              <div className="border-b-2 border-slate-900 pb-3">
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-800 text-white rounded uppercase tracking-wider">
                  TERAKREDITASI PENGURUS RT
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2 uppercase">WAJIB LAPOR DIRI</h2>
                <p className="text-xs text-slate-600 font-bold">WARGA PENDATANG SEMENTARA</p>
              </div>

              <div className="py-2">
                <h3 className="text-lg font-bold text-emerald-900">{posterProp.name || posterProp.property_name}</h3>
                {posterProp.owner_name && <p className="text-xs text-slate-700 font-semibold">Pemilik: {posterProp.owner_name}</p>}
                <p className="text-xs text-slate-500">{posterProp.address || 'Wilayah Lingkungan RT'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x250&data=${encodeURIComponent(
                    (typeof window !== 'undefined' ? window.location.origin : '') + '/checkin/' + posterProp.slug
                  )}`}
                  alt="QR Code Check-in"
                  className="w-48 h-48 mx-auto rounded-lg"
                />
              </div>

              <div className="text-left bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">📢 PERHATIAN PENGHUNI BARU:</p>
                <p>1. Pindai QR Code di atas menggunakan kamera HP Anda.</p>
                <p>2. Lengkapi formulir pendaftaran & unggah KTP dalam 1x24 jam.</p>
                <p>3. Data disimpan aman sesuai aturan UU PDP No. 27 Tahun 2022.</p>
              </div>

              <div className="pt-2 border-t text-[10px] text-slate-400 font-mono">
                Sistem Informasi Kependudukan Digital RT
              </div>
            </div>

            <div className="p-3 bg-slate-100 flex justify-end gap-2 print:hidden">
              <button onClick={() => setPosterProp(null)} className="px-4 py-2 bg-slate-300 text-slate-700 text-xs font-bold rounded-xl">Tutup</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 shadow">
                🖨️ Cetak Poster (A4/A5)
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL TAMBAH PROPERTI BARU (LENGKAP INPUT PEMILIK & NO WA) */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-emerald-950 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">🏢 Daftarkan Properti Kos / Kontrakan Baru</h3>
              <button onClick={() => setShowAddPropModal(false)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleCreatePropertySubmit} className="p-5 space-y-3">
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Nama Pemilik *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bpk. Hj. Ahmad"
                    value={newPropOwnerName}
                    onChange={(e) => setNewPropOwnerName(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">No. WhatsApp Pemilik *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08123456789"
                    value={newPropOwnerPhone}
                    onChange={(e) => setNewPropOwnerPhone(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none font-mono"
                  />
                </div>
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
                  rows={2}
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
