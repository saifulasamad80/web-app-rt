'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getPublicPropertiesList,
  getTenantsByPropertyPin,
  createProperty,
  updateProperty,
  deleteProperty,
  updateTenantStatus,
  updateTenantData,
  getTenantKtpUrl,
  deleteTenant,
  updateHouseRules,
  updateTenantPaymentStatus,
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
  rent_price?: number;
  payment_status?: string;
  marital_status?: string;
  occupation?: string;
  ktp_url?: string;
  ktp_path?: string;
  marriage_doc_url?: string;
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
  manager_name?: string;
  manager_phone?: string;
  total_rooms?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
}

export default function OwnerDashboard() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const [propertiesList, setPropertiesList] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [copyMsg, setCopyMsg] = useState('');

  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [targetPropForUnlock, setTargetPropForUnlock] = useState<Property | null>(null);
  const [inputPin, setInputPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);

  // Modal Tambah & Edit Properti
  const [showAddPropModal, setShowAddPropModal] = useState<boolean>(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propName, setPropName] = useState<string>('');
  const [propType, setPropType] = useState<'kos' | 'kontrakan'>('kos');
  const [propTotalRooms, setPropTotalRooms] = useState<number>(10);
  const [propOwnerName, setPropOwnerName] = useState<string>('');
  const [propOwnerPhone, setPropOwnerPhone] = useState<string>('');
  const [propManagerName, setPropManagerName] = useState<string>('');
  const [propManagerPhone, setPropManagerPhone] = useState<string>('');
  const [propBankName, setPropBankName] = useState<string>('BCA');
  const [propBankAcc, setPropBankAcc] = useState<string>('');
  const [propBankHolder, setPropBankHolder] = useState<string>('');
  const [propAddress, setPropAddress] = useState<string>('');
  const [propRules, setPropRules] = useState<string>('');
  const [propPin, setPropPin] = useState<string>('');
  const [submittingProp, setSubmittingProp] = useState<boolean>(false);

  // Modal Edit Penyewa
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantRoom, setTenantRoom] = useState('');
  const [tenantRelation, setTenantRelation] = useState('Istri');
  const [tenantRentPrice, setTenantRentPrice] = useState('1500000');
  const [savingTenant, setSavingTenant] = useState(false);

  const [editingRulesProp, setEditingRulesProp] = useState<Property | null>(null);
  const [rulesText, setRulesText] = useState<string>('');
  const [savingRules, setSavingRules] = useState<boolean>(false);

  const [posterProp, setPosterProp] = useState<Property | null>(null);

  const [selectedKtpUrl, setSelectedKtpUrl] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [loadingKtp, setLoadingKtp] = useState<boolean>(false);
  const [ktpErrorMsg, setKtpErrorMsg] = useState<string>('');

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

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

  const handleOpenEditProp = (prop: Property) => {
    setEditingProperty(prop);
    setPropName(prop.name || prop.property_name || '');
    setPropType((prop.type as 'kos' | 'kontrakan') || 'kos');
    setPropTotalRooms(prop.total_rooms || 10);
    setPropOwnerName(prop.owner_name || '');
    setPropOwnerPhone(prop.owner_phone || '');
    setPropManagerName(prop.manager_name || '');
    setPropManagerPhone(prop.manager_phone || '');
    setPropBankName(prop.bank_name || 'BCA');
    setPropBankAcc(prop.bank_account_number || '');
    setPropBankHolder(prop.bank_account_holder || '');
    setPropAddress(prop.address || '');
  };

  const handlePropFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName) return;

    setSubmittingProp(true);

    if (editingProperty) {
      const res = await updateProperty(editingProperty.id, {
        name: propName,
        type: propType,
        total_rooms: propTotalRooms,
        owner_name: propOwnerName,
        owner_phone: propOwnerPhone,
        manager_name: propManagerName,
        manager_phone: propManagerPhone,
        bank_name: propBankName,
        bank_account_number: propBankAcc,
        bank_account_holder: propBankHolder,
        address: propAddress,
      });
      setSubmittingProp(false);

      if (res.success) {
        setCopyMsg('Data unit properti & pengelola berhasil diperbarui!');
        setTimeout(() => setCopyMsg(''), 3000);
        setEditingProperty(null);
        await fetchPublicPropertyList();
        if (activeProperty && activeProperty.id === editingProperty.id) {
          setActiveProperty({
            ...activeProperty,
            name: propName,
            type: propType,
            total_rooms: propTotalRooms,
            owner_name: propOwnerName,
            owner_phone: propOwnerPhone,
            manager_name: propManagerName,
            manager_phone: propManagerPhone,
            bank_name: propBankName,
            bank_account_number: propBankAcc,
            bank_account_holder: propBankHolder,
            address: propAddress,
          });
        }
      } else {
        alert('Gagal update properti: ' + res.error);
      }
    } else {
      if (!propPin || !/^\d{4}$/.test(propPin)) {
        alert('PIN harus berupa 4-digit angka (contoh: 1234)');
        setSubmittingProp(false);
        return;
      }

      const res = await createProperty(
        propName,
        propType,
        propAddress,
        propRules,
        propPin,
        propOwnerName,
        propOwnerPhone,
        propManagerName,
        propManagerPhone,
        propTotalRooms,
        propBankName,
        propBankAcc,
        propBankHolder
      );
      setSubmittingProp(false);

      if (res && res.success) {
        setCopyMsg('Properti "' + propName + '" berhasil didaftarkan!');
        setTimeout(() => setCopyMsg(''), 4000);
        setShowAddPropModal(false);
        setPropName('');
        setPropOwnerName('');
        setPropOwnerPhone('');
        setPropManagerName('');
        setPropManagerPhone('');
        setPropBankAcc('');
        setPropBankHolder('');
        setPropAddress('');
        setPropRules('');
        setPropPin('');
        await fetchPublicPropertyList();
      } else {
        alert('Gagal membuat properti: ' + (res?.error || 'Kesalahan teknis'));
      }
    }
  };

  const handleOpenEditTenant = (t: Tenant) => {
    setEditingTenant(t);
    setTenantName(t.name);
    setTenantPhone(t.phone);
    setTenantRoom(t.room_number || '');
    setTenantRelation(t.relation || 'Istri');
    setTenantRentPrice(t.rent_price ? String(t.rent_price) : '1500000');
  };

  const handleSaveTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setSavingTenant(true);
    const parsedPrice = parseInt(tenantRentPrice.replace(/\D/g, ''), 10) || 0;

    const res = await updateTenantData(editingTenant.id, {
      name: tenantName,
      phone: tenantPhone,
      room_number: tenantRoom,
      relation: tenantRelation,
      rent_price: parsedPrice,
    });
    setSavingTenant(false);

    if (res.success) {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingTenant.id
            ? { ...t, name: tenantName, phone: tenantPhone, room_number: tenantRoom, relation: tenantRelation, rent_price: parsedPrice }
            : t
        )
      );
      setCopyMsg('Data penyewa berhasil diperbarui!');
      setTimeout(() => setCopyMsg(''), 3000);
      setEditingTenant(null);
    } else {
      alert('Gagal update data penyewa: ' + res.error);
    }
  };

  const handleTogglePaymentStatus = async (tenantId: string, currentStatus?: string) => {
    const newStatus = (currentStatus || '').toUpperCase() === 'PAID' ? 'UNPAID' : 'PAID';
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, payment_status: newStatus } : t)));
    await updateTenantPaymentStatus(tenantId, newStatus);
  };

  const handleShareWA = (prop: Property) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const checkinUrl = origin + '/checkin/' + prop.slug;
    const propNameStr = prop.name || prop.property_name;

    const message = `Halo calon penghuni *${propNameStr}*,\n\nSesuai Peraturan Wajib Lapor RT setempat, mohon melengkapi formulir lapor diri digital resmi melalui tautan berikut:\n\n👉 ${checkinUrl}\n\nProses ini wajib untuk pendataan kependudukan RT. Terima kasih.`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleSendReminderWA = (t: Tenant) => {
    if (!activeProperty) return;
    const rawPhone = (t.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const propNameStr = activeProperty.name || activeProperty.property_name;
    const roomStr = t.room_number || 'Kamar Unit';
    const nominalStr = Number(t.rent_price || 0).toLocaleString('id-ID');
    const bankInfo = activeProperty.bank_account_number
      ? `${activeProperty.bank_name} ${activeProperty.bank_account_number} a.n. ${activeProperty.bank_account_holder}`
      : 'rekening pengelola';

    const message = `Halo Kak *${t.name}*,\n\nMengingatkan tagihan sewa *${propNameStr}* (${roomStr}) sebesar *Rp ${nominalStr}* untuk periode bulan ini.\n\nPembayaran dapat ditransfer ke:\n🏦 *${bankInfo}*\n\nMohon konfirmasi jika telah melakukan transfer. Terima kasih.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
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

  const formatPhoneToWA = (phone?: string) => {
    let cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    return cleaned;
  };

  const countAll = tenants.length;
  const countPending = tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING').length;
  const countActive = tenants.filter((t) => (t.status || '').toUpperCase() === 'ACTIVE' || (t.status || '').toUpperCase() === 'VERIFIED').length;
  const totalRooms = activeProperty?.total_rooms || 10;
  const emptyRooms = Math.max(totalRooms - countActive, 0);

  const totalRentCollected = tenants
    .filter((t) => (t.payment_status || '').toUpperCase() === 'PAID')
    .reduce((sum, t) => sum + (Number(t.rent_price) || 0), 0);

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen p-3 md:p-8 bg-slate-50 text-slate-900 transition-all"
    >
      <div className="max-w-6xl mx-auto space-y-5">

        {/* HEADER BRANDING CERAH DENGAN WIDGET ZOOM BERTAHAP */}
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[1.3rem]">🏢⚡</span>
              <h1 className="text-[1.4rem] font-black text-white">Dasbor <span className="text-amber-400">Pemilik & Pengelola Kos</span></h1>
            </div>
            <p className="text-[0.8rem] text-emerald-100 mt-1 font-medium">
              Kelola Hunian, Penjaga Unit, Okupansi Kamar, & Tagihan Sewa Terintegrasi RT
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* WIDGET ZOOM TEKS BERTAHAP MULTI-STEP */}
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

            <Link
              href="/"
              className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-[0.75rem] rounded-2xl border border-emerald-700 shadow"
            >
              🚪 Keluar
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => {
              setEditingProperty(null);
              setPropName('');
              setPropOwnerName('');
              setPropOwnerPhone('');
              setPropManagerName('');
              setPropManagerPhone('');
              setPropBankAcc('');
              setPropBankHolder('');
              setPropAddress('');
              setShowAddPropModal(true);
            }}
            className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[0.85rem] rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>➕ Daftarkan Properti Kos Baru</span>
          </button>

          {isUnlocked && (
            <button
              onClick={() => { setIsUnlocked(false); setActiveProperty(null); setTenants([]); }}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[0.8rem] rounded-2xl border border-slate-300"
            >
              🔒 Kunci Dasbor
            </button>
          )}
        </div>

        {copyMsg && (
          <div className="p-3.5 bg-emerald-100 text-emerald-900 border-2 border-emerald-300 rounded-2xl text-[0.85rem] font-bold text-center">
            {copyMsg}
          </div>
        )}

        {/* DAFTAR KARTU PROPERTI (CERAH & DETAIL PENGELOLA) */}
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-[1.1rem] font-black text-slate-900">Pilih Properti Kos Anda</h2>
              <p className="text-[0.8rem] text-slate-500">Buka kunci unit menggunakan PIN 4-Digit untuk mengelola penyewa.</p>
            </div>
            <span className="text-[0.75rem] font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              {propertiesList.length} Properti Terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {propertiesList.map((prop) => {
              const isCurrentActive = isUnlocked && activeProperty?.id === prop.id;

              return (
                <div
                  key={prop.id}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between gap-3 ${
                    isCurrentActive ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.7rem] font-black px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-full uppercase">
                        {prop.type} • {prop.total_rooms || 10} Kamar
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditProp(prop)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-[0.7rem] font-bold shadow-sm cursor-pointer"
                        >
                          ✏️ Edit & Pengelola
                        </button>
                        {prop.status === 'APPROVED' ? (
                          <span className="text-[0.65rem] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                            ✅ VERIFIED RT
                          </span>
                        ) : (
                          <span className="text-[0.65rem] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                            ⚠️ MENUNGGU
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-black text-[1.1rem] text-slate-900">{prop.name || prop.property_name}</h3>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200 text-[0.75rem] space-y-1 text-slate-700">
                      <p>👤 <b>Pemilik Sah:</b> {prop.owner_name || '-'} {prop.owner_phone ? `(${prop.owner_phone})` : ''}</p>
                      <p>🔑 <b>Pengelola / Penjaga:</b> {prop.manager_name || 'Dikelola Pemilik'} {prop.manager_phone ? `(${prop.manager_phone})` : ''}</p>
                      {prop.bank_account_number && (
                        <p className="text-emerald-800 font-semibold">💳 {prop.bank_name}: {prop.bank_account_number} a.n. {prop.bank_account_holder}</p>
                      )}
                    </div>

                    <p className="text-[0.75rem] text-slate-500 font-mono break-all">/checkin/{prop.slug}</p>
                  </div>

                  <div className="pt-3 border-t-2 border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareWA(prop)}
                        className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[0.75rem] font-bold rounded-2xl transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>💬 Kirim Link WA</span>
                      </button>

                      <button
                        onClick={() => setPosterProp(prop)}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[0.75rem] font-bold rounded-2xl transition-all shadow flex items-center gap-1 cursor-pointer"
                      >
                        <span>🖨️ Poster QR</span>
                      </button>
                    </div>

                    <div>
                      {isCurrentActive ? (
                        <div className="text-[0.8rem] font-black text-amber-950 flex items-center justify-center py-2.5 bg-amber-300 rounded-2xl shadow-sm">
                          <span>🔓 Dasbor Aktif Terbuka</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenUnlockModal(prop)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[0.8rem] font-black rounded-2xl transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>🔒 Buka Dasbor Kos (PIN)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DASBOR PEMILIK BERGAYA SUPERKOS TERVERIFIKASI PIN */}
        {isUnlocked && activeProperty ? (
          <div className="space-y-5">

            {/* HERO STAT CARD PENDAPATAN BULAN INI */}
            <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 p-6 md:p-8 rounded-3xl shadow-xl text-slate-950 relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-900 bg-white/50 px-3 py-1 rounded-full">
                  Ringkasan Finansial Kos • {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
                <p className="text-[0.85rem] font-bold text-slate-800 mt-2">Total Uang Sewa Terkumpul (Lunas):</p>
                <h3 className="text-[1.8rem] md:text-[2.2rem] font-black text-slate-950 tracking-tight">
                  Rp {totalRentCollected.toLocaleString('id-ID')}
                </h3>
                <div className="pt-2 flex flex-wrap items-center gap-2 text-[0.8rem] font-bold text-slate-900">
                  <span>📈 Okupansi: {Math.round((countActive / totalRooms) * 100)}%</span>
                  <span>•</span>
                  <span>{countActive} Kamar Terisi</span>
                  <span>•</span>
                  <span className="text-emerald-950">{emptyRooms} Kamar Kosong</span>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 opacity-15 text-[8rem] select-none">
                🏠
              </div>
            </div>

            {/* 4 STATISTIK KOTAK OKUPANSI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-amber-50 border-2 border-amber-300 p-4 md:p-5 rounded-3xl shadow-sm text-center">
                <span className="text-[1.6rem] font-black text-amber-950 block">{countAll}</span>
                <span className="text-[0.75rem] font-black text-amber-800 mt-1 block">Total Penghuni</span>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 p-4 md:p-5 rounded-3xl shadow-sm text-center">
                <span className="text-[1.6rem] font-black text-blue-950 block">{totalRooms}</span>
                <span className="text-[0.75rem] font-black text-blue-800 mt-1 block">Kapasitas Kamar</span>
              </div>

              <div className="bg-purple-50 border-2 border-purple-300 p-4 md:p-5 rounded-3xl shadow-sm text-center">
                <span className="text-[1.6rem] font-black text-purple-950 block">{countActive}</span>
                <span className="text-[0.75rem] font-black text-purple-800 mt-1 block">Kamar Terisi</span>
              </div>

              <div className="bg-emerald-50 border-2 border-emerald-300 p-4 md:p-5 rounded-3xl shadow-sm text-center">
                <span className="text-[1.6rem] font-black text-emerald-950 block">{emptyRooms}</span>
                <span className="text-[0.75rem] font-black text-emerald-800 mt-1 block">Kamar Kosong</span>
              </div>
            </div>

            {/* TABEL DAFTAR PENYEWA & PENGATURAN STATUS BAYAR */}
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b-2 border-slate-100 pb-4">
                <div>
                  <h3 className="text-[1rem] font-black text-slate-900 uppercase tracking-wider">
                    Daftar Penyewa: {activeProperty.name || activeProperty.property_name}
                  </h3>
                  <p className="text-[0.8rem] text-slate-500 font-medium">Kelola status sewa, tagihan WA, kamar, dan berkas KTP</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenRulesModal(activeProperty)}
                    className="px-3.5 py-2 bg-slate-800 text-white text-[0.75rem] font-bold rounded-2xl hover:bg-slate-700 cursor-pointer"
                  >
                    📜 Tata Tertib
                  </button>
                </div>
              </div>

              {tenants.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                  <p className="text-[0.8rem] text-slate-500 font-medium">Belum ada penyewa yang mendaftar di unit ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[0.8rem]">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]">
                        <th className="p-3">Nama & Peran</th>
                        <th className="p-3">Kamar / Lokasi</th>
                        <th className="p-3">Status Tagihan</th>
                        <th className="p-3">Nominal Sewa</th>
                        <th className="p-3">Dokumen</th>
                        <th className="p-3">Status RT</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tenants.map((t) => {
                        const st = (t.status || '').toUpperCase();
                        const isPaid = (t.payment_status || '').toUpperCase() === 'PAID';
                        const locationLabel = t.room_number ? `Kamar: ${t.room_number}` : (t.full_address || activeProperty.name);

                        return (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-black text-slate-900">{t.name}</div>
                              <span className="text-[0.65rem] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 inline-block mt-0.5">
                                {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-emerald-900">{locationLabel}</td>
                            <td className="p-3">
                              <button
                                onClick={() => handleTogglePaymentStatus(t.id, t.payment_status)}
                                className={`px-2.5 py-1 rounded-xl text-[0.7rem] font-black transition-all shadow-sm cursor-pointer ${
                                  isPaid ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
                                }`}
                              >
                                {isPaid ? '✅ LUNAS' : '❌ BELUM LUNAS'}
                              </button>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900">
                              Rp {Number(t.rent_price || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleViewKtp(t)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[0.7rem] rounded-xl font-bold"
                              >
                                🪪 KTP
                              </button>
                            </td>
                            <td className="p-3">
                              <span className={'text-[0.65rem] font-black px-2 py-0.5 rounded-full uppercase ' +
                                (st === 'ACTIVE' || st === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                 st === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800')}>
                                {st}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {!isPaid && (
                                <button
                                  onClick={() => handleSendReminderWA(t)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[0.7rem] font-bold rounded-lg"
                                >
                                  💬 Tagih WA
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditTenant(t)}
                                className="px-2 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-[0.7rem] font-black rounded-lg"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDelete(t.id, t.name)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 text-[0.7rem] font-bold rounded-lg hover:bg-red-100 hover:text-red-700"
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

          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
            <p className="text-5xl">🔒</p>
            <h3 className="text-[1.1rem] font-black text-slate-900">Dasbor Kos Masih Terkunci</h3>
            <p className="text-[0.8rem] text-slate-500 max-w-md mx-auto">
              Pilih salah satu unit properti Anda di atas lalu klik tombol <b>"🔒 Buka Dasbor Kos (PIN)"</b> untuk memverifikasi hak akses kepemilikan Anda.
            </p>
          </div>
        )}

      </div>

      {/* MODAL TAMBAH & EDIT PROPERTI DENGAN FORM PENGELOLA LENGKAP */}
      {(showAddPropModal || editingProperty) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.95rem] font-black">
                {editingProperty ? '✏️ Edit Properti & Pengelola' : '🏢 Daftarkan Properti Kos Baru'}
              </h3>
              <button
                onClick={() => { setShowAddPropModal(false); setEditingProperty(null); }}
                className="text-white hover:text-amber-300 font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePropFormSubmit} className="p-5 md:p-6 space-y-4 text-[0.8rem]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nama Unit Properti *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kos Melati 1"
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-600 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Tipe & Total Kamar *</label>
                  <div className="flex gap-2">
                    <select
                      value={propType}
                      onChange={(e) => setPropType(e.target.value as 'kos' | 'kontrakan')}
                      className="p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold text-slate-800"
                    >
                      <option value="kos">Kos</option>
                      <option value="kontrakan">Kontrakan</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="Jml Kamar"
                      value={propTotalRooms}
                      onChange={(e) => setPropTotalRooms(parseInt(e.target.value, 10) || 1)}
                      className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SEKSI PEMILIK SAH */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 space-y-2">
                <span className="text-[0.7rem] font-black text-slate-600 uppercase block">1. DATA PEMILIK SAH BANGUNAN:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Pemilik (Bpk. H. Ahmad)"
                    value={propOwnerName}
                    onChange={(e) => setPropOwnerName(e.target.value)}
                    className="p-2 border-2 border-slate-200 rounded-xl bg-white"
                  />
                  <input
                    type="tel"
                    placeholder="No. WA Pemilik"
                    value={propOwnerPhone}
                    onChange={(e) => setPropOwnerPhone(e.target.value)}
                    className="p-2 border-2 border-slate-200 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              {/* SEKSI PENGELOLA / PENJAGA KOS (FOTO 4) */}
              <div className="bg-amber-50 p-3.5 rounded-2xl border-2 border-amber-300 space-y-2">
                <span className="text-[0.7rem] font-black text-amber-950 uppercase block">2. DATA PENGELOLA / PENJAGA LAPANGAN:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Pengelola (Mas Joko)"
                    value={propManagerName}
                    onChange={(e) => setPropManagerName(e.target.value)}
                    className="p-2 border-2 border-amber-200 rounded-xl bg-white font-bold"
                  />
                  <input
                    type="tel"
                    placeholder="No. WA Pengelola"
                    value={propManagerPhone}
                    onChange={(e) => setPropManagerPhone(e.target.value)}
                    className="p-2 border-2 border-amber-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <p className="text-[0.7rem] text-amber-800 font-medium">Kontak ini yang akan dihubungi langsung oleh penyewa saat butuh bantuan.</p>
              </div>

              {/* SEKSI REKENING PEMBAYARAN SEWA */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 space-y-2">
                <span className="text-[0.7rem] font-black text-slate-600 uppercase block">3. REKENING RESMI UNTUK MENERIMA SEWA:</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Bank (BCA/BRI)"
                    value={propBankName}
                    onChange={(e) => setPropBankName(e.target.value)}
                    className="p-2 border-2 border-slate-200 rounded-xl bg-white font-bold uppercase"
                  />
                  <input
                    type="text"
                    placeholder="No. Rekening"
                    value={propBankAcc}
                    onChange={(e) => setPropBankAcc(e.target.value)}
                    className="col-span-2 p-2 border-2 border-slate-200 rounded-xl bg-white font-mono font-bold"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Atas Nama Pemilik Rekening"
                  value={propBankHolder}
                  onChange={(e) => setPropBankHolder(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-xl bg-white font-medium"
                />
              </div>

              {!editingProperty && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Buat PIN 4-Digit Rahasia *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="Contoh: 1234"
                    value={propPin}
                    onChange={(e) => setPropPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-mono tracking-widest text-center text-lg font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">Alamat Lengkap Unit</label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Melati No. 88 RT 02/RW 05"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => { setShowAddPropModal(false); setEditingProperty(null); }}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 text-[0.8rem] font-bold rounded-2xl hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingProp}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[0.8rem] font-black rounded-2xl shadow disabled:bg-slate-300 cursor-pointer"
                >
                  {submittingProp ? 'Menyimpan...' : editingProperty ? 'Simpan Perubahan' : 'Daftarkan Properti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PENYEWA */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.85rem] font-black">✏️ Edit Data Penyewa</h3>
              <button onClick={() => setEditingTenant(null)} className="text-white hover:text-amber-300 font-bold text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleSaveTenantSubmit} className="p-5 space-y-3 text-[0.8rem]">
              <div>
                <label className="block font-bold mb-1 text-slate-700">Nama Penyewa *</label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">No. WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Nomor Kamar / Unit</label>
                <input
                  type="text"
                  placeholder="Kamar 04"
                  value={tenantRoom}
                  onChange={(e) => setTenantRoom(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none font-black text-emerald-900"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Harga Sewa Kamar (Rp) *</label>
                <input
                  type="text"
                  required
                  value={tenantRentPrice}
                  onChange={(e) => setTenantRentPrice(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Hubungan / Peran</label>
                <select
                  value={tenantRelation}
                  onChange={(e) => setTenantRelation(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                >
                  <option value="Penanggung Jawab">Penanggung Jawab</option>
                  <option value="Istri">Istri</option>
                  <option value="Suami">Suami</option>
                  <option value="Anak">Anak</option>
                  <option value="Saudara">Saudara</option>
                  <option value="Rekan / Teman">Rekan / Teman</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTenant}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow cursor-pointer"
                >
                  {savingTenant ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CETAK POSTER QR CODE */}
      {posterProp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center print:hidden">
              <h3 className="text-[0.85rem] font-bold">🖨️ Poster Resmi QR Wajib Lapor RT</h3>
              <button onClick={() => setPosterProp(null)} className="text-white hover:text-amber-300 font-bold text-xl leading-none">✕</button>
            </div>

            <div className="p-6 text-center space-y-4 bg-white" id="printable-poster">
              <div className="border-b-2 border-slate-900 pb-3">
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-900 text-white rounded uppercase">
                  TERDAFTAR PENGURUS RT
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2 uppercase">WAJIB LAPOR DIRI</h2>
                <p className="text-xs text-slate-600 font-bold">WARGA PENDATANG SEMENTARA</p>
              </div>

              <div className="py-2">
                <h3 className="text-lg font-bold text-slate-900">{posterProp.name || posterProp.property_name}</h3>
                <p className="text-xs text-slate-600">Pengelola: {posterProp.manager_name || posterProp.owner_name || '-'}</p>
                <p className="text-xs text-slate-500">{posterProp.address || 'Lingkungan RT Setempat'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x250&data=${encodeURIComponent(
                    (typeof window !== 'undefined' ? window.location.origin : '') + '/checkin/' + posterProp.slug
                  )}`}
                  alt="QR Code Check-in"
                  className="w-48 h-48 mx-auto rounded-xl"
                />
              </div>

              <div className="text-left bg-amber-50 p-3 rounded-2xl border border-amber-200 text-[11px] text-amber-900 space-y-1 font-semibold">
                <p className="font-bold">📢 INSTRUKSI PENGHUNI BARU:</p>
                <p>1. Pindai QR Code di atas menggunakan kamera HP Anda.</p>
                <p>2. Lengkapi formulir pendaftaran & unggah KTP dalam 1x24 jam.</p>
                <p>3. Data disimpan aman sesuai aturan UU PDP No. 27 Tahun 2022.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 flex justify-end gap-2 print:hidden">
              <button onClick={() => setPosterProp(null)} className="px-4 py-2 bg-slate-300 text-slate-700 text-xs font-bold rounded-2xl">Tutup</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-2xl hover:bg-slate-800 shadow">
                🖨️ Cetak Poster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT PIN 4-DIGIT */}
      {showPinModal && targetPropForUnlock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.85rem] font-bold">🔒 Verifikasi PIN 4-Digit</h3>
              <button onClick={() => setShowPinModal(false)} className="text-white hover:text-amber-300 font-bold text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleUnlockWithPin} className="p-5 space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-black text-slate-900 text-sm">{targetPropForUnlock.name || targetPropForUnlock.property_name}</h4>
                <p className="text-[0.75rem] text-slate-500">Masukkan PIN 4-digit unit ini:</p>
              </div>

              {pinError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold text-center">
                  {pinError}
                </div>
              )}

              <input
                type="password"
                maxLength={4}
                required
                autoFocus
                placeholder="• • • •"
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl tracking-[0.5em] p-3 border-2 border-slate-300 rounded-2xl font-mono font-bold focus:border-emerald-600 outline-none"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifyingPin || inputPin.length !== 4}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-2xl shadow disabled:bg-slate-300 cursor-pointer"
                >
                  {verifyingPin ? 'Memeriksa...' : 'Buka Dasbor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TATA TERTIB */}
      {editingRulesProp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">📜 Tata Tertib Hunian</h3>
              <button onClick={() => setEditingRulesProp(null)} className="text-white font-bold text-lg leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3 bg-slate-50">
              <textarea
                rows={7}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="w-full text-xs p-3 border rounded-2xl font-mono bg-white focus:ring-2 focus:ring-emerald-600 outline-none leading-relaxed"
              ></textarea>
            </div>
            <div className="p-3 bg-slate-100 flex justify-end gap-2 border-t">
              <button onClick={() => setEditingRulesProp(null)} className="px-4 py-2 bg-slate-300 text-slate-700 text-xs font-bold rounded-2xl">Batal</button>
              <button onClick={handleSaveRules} disabled={savingRules} className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-2xl hover:bg-emerald-800">
                {savingRules ? 'Menyimpan...' : 'Simpan Tata Tertib'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KTP VIEWER */}
      {(selectedTenantName || loadingKtp) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <span>🛡️ Dokumen KTP (UU PDP):</span>
                <span className="text-amber-300">{selectedTenantName}</span>
              </h3>
              <button onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }} className="text-white font-bold text-lg leading-none">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center min-h-[220px] bg-slate-50">
              {loadingKtp ? (
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500 font-semibold">Memuat Tautan Aman KTP...</p>
                </div>
              ) : ktpErrorMsg ? (
                <div className="text-center space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl max-w-md">
                  <p className="text-xs font-semibold text-amber-800">{ktpErrorMsg}</p>
                </div>
              ) : selectedKtpUrl ? (
                <div className="space-y-3 w-full text-center">
                  <img src={selectedKtpUrl} alt="Dokumen KTP Penghuni" className="max-h-[350px] w-auto mx-auto rounded-2xl border shadow-sm object-contain" />
                  <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 font-semibold">
                    🔒 Tautan privat ini akan kedaluwarsa secara otomatis dalam 60 detik (UU PDP).
                  </p>
                </div>
              ) : null}
            </div>
            <div className="p-3 bg-slate-100 text-right border-t">
              <button onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-2xl">Tutup Dokumen</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
