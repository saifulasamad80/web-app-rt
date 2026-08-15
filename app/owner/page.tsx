'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  loginOwnerDashboard,
  getOwnerPropertyDetails,
  createProperty,
  updateProperty,
  deleteProperty,
  updateTenantData,
  deleteTenant,
  updateHouseRules,
  updateTenantPaymentStatus,
  addPropertyExpense,
  deletePropertyExpense,
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
  property_id?: string;
  marriage_doc_url?: string;
  kk_doc_url?: string;
  ktp_path?: string;
}

interface Expense {
  id: string;
  property_id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  notes?: string;
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
  pin_code?: string;
}

function cleanDigits(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function isPhoneMatch(phoneA?: string, phoneB?: string): boolean {
  const a = cleanDigits(phoneA);
  const b = cleanDigits(phoneB);
  if (!a || !b) return false;
  if (a === b) return true;
  const suffixA = a.length >= 8 ? a.slice(-9) : a;
  const suffixB = b.length >= 8 ? b.slice(-9) : b;
  return suffixA === suffixB;
}

function parseRoomNumber(roomStr?: string): number | null {
  if (!roomStr) return null;
  const match = roomStr.match(/(?:kamar|unit|no\.?)\s*(\d+)/i) || roomStr.match(/^(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

function getThreeMonthStatus(paymentStatus?: string) {
  const today = new Date();
  const months = [];
  const isPaidCurrent = (paymentStatus || '').toUpperCase() === 'PAID';
  for (let i = 2; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
    const isCurrent = i === 0;
    const isPaid = isCurrent ? isPaidCurrent : true;
    months.push({ label: monthName, isPaid, isCurrent });
  }
  return months;
}

export default function OwnerDashboard() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'penyewa' | 'pengeluaran' | 'matrix'>('penyewa');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

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

  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Listrik');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingExpense, setSavingExpense] = useState(false);

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

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginPin) return;

    setLoginLoading(true);
    setLoginError('');

    const res = await loginOwnerDashboard(loginPhone, loginPin);
    setLoginLoading(false);

    if (res.success && res.properties && res.properties.length > 0) {
      setMyProperties(res.properties);
      setIsLoggedIn(true);
      const firstProp = res.properties[0];
      await handleSelectProperty(firstProp);
    } else {
      setLoginError(res.error || 'Nomor WhatsApp atau PIN 4-Digit salah.');
    }
  };

  const handleSelectProperty = async (prop: Property) => {
    setLoadingDetails(true);
    setActiveProperty(prop);
    const details = await getOwnerPropertyDetails(prop.id);
    setLoadingDetails(false);

    if (details.success) {
      setTenants(details.tenants || []);
      setExpenses(details.expenses || []);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginPhone('');
    setLoginPin('');
    setMyProperties([]);
    setActiveProperty(null);
    setTenants([]);
    setExpenses([]);
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
    setPropPin(prop.pin_code || '1234');
    setShowAddPropModal(true);
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
        pin_code: propPin,
      });
      setSubmittingProp(false);

      if (res.success) {
        setCopyMsg('Data properti & PIN unit berhasil diperbarui!');
        setTimeout(() => setCopyMsg(''), 3000);
        setEditingProperty(null);
        setShowAddPropModal(false);

        const updatedList = myProperties.map((p) =>
          p.id === editingProperty.id
            ? {
                ...p,
                name: propName,
                property_name: propName,
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
                pin_code: propPin,
              }
            : p
        );
        setMyProperties(updatedList);

        if (activeProperty && activeProperty.id === editingProperty.id) {
          setActiveProperty({
            ...activeProperty,
            name: propName,
            property_name: propName,
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
            pin_code: propPin,
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
        propOwnerName || loginPhone,
        propOwnerPhone || loginPhone,
        propManagerName,
        propManagerPhone,
        propTotalRooms,
        propBankName,
        propBankAcc,
        propBankHolder
      );
      setSubmittingProp(false);

      if (res && res.success && res.data) {
        setCopyMsg('Properti "' + propName + '" berhasil didaftarkan!');
        setTimeout(() => setCopyMsg(''), 4000);
        setShowAddPropModal(false);

        const newPropList = [res.data, ...myProperties];
        setMyProperties(newPropList);
        await handleSelectProperty(res.data);

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
      } else {
        alert('Gagal membuat properti: ' + (res?.error || 'Kesalahan teknis'));
      }
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty || !expenseTitle || !expenseAmount) return;

    setSavingExpense(true);
    const parsedAmount = parseInt(expenseAmount.replace(/\D/g, ''), 10) || 0;

    const res = await addPropertyExpense(
      activeProperty.id,
      expenseTitle,
      expenseCategory,
      parsedAmount,
      expenseDate
    );
    setSavingExpense(false);

    if (res.success && res.data) {
      setExpenses([res.data, ...expenses]);
      setCopyMsg('Biaya operasional berhasil dicatat!');
      setTimeout(() => setCopyMsg(''), 3000);
      setShowAddExpenseModal(false);
      setExpenseTitle('');
      setExpenseAmount('');
    } else {
      alert('Gagal mencatat pengeluaran: ' + res.error);
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Hapus catatan pengeluaran "${title}"?`)) {
      setExpenses(expenses.filter((e) => e.id !== id));
      await deletePropertyExpense(id);
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
      setCopyMsg(`Data kamar ${tenantRoom || 'Penyewa'} (${tenantName}) berhasil disetel ke Rp ${parsedPrice.toLocaleString('id-ID')}!`);
      setTimeout(() => setCopyMsg(''), 3500);
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

  const handleDeleteTenantRow = async (id: string, name: string) => {
    if (confirm(`Hapus data penghuni "${name}" dari sistem?`)) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      await deleteTenant(id);
    }
  };

  const handleOpenRulesModal = (prop: Property) => {
    setEditingRulesProp(prop);
    setRulesText(
      prop.house_rules ||
        `1. Wajib menjaga ketertiban, ketenangan, dan kebersihan lingkungan.
2. Dilarang membawa barang terlarang (narkoba, miras, senjata tajam).
3. Jam bertamu maksimal pukul 22.00 WIB demi keamanan lingkungan.
4. Pembayaran sewa paling lambat tanggal 5 setiap bulannya.`
    );
  };

  const handleSaveRules = async () => {
    if (!editingRulesProp) return;
    setSavingRules(true);
    const res = await updateHouseRules(editingRulesProp.id, rulesText);
    setSavingRules(false);

    if (res && res.success) {
      setCopyMsg('Tata tertib hunian berhasil diperbarui!');
      setTimeout(() => setCopyMsg(''), 3000);
      setEditingRulesProp(null);
      if (activeProperty) {
        setActiveProperty({ ...activeProperty, house_rules: rulesText });
      }
    } else {
      alert('Gagal menyimpan tata tertib: ' + (res?.error || 'Kesalahan database'));
    }
  };

  const totalRooms = activeProperty?.total_rooms || 10;
  const occupiedRoomSet = new Set<string>();

  tenants.forEach((t) => {
    const st = (t.status || '').toUpperCase();
    if (st === 'ACTIVE' || st === 'VERIFIED' || st === 'PENDING') {
      const parsedNum = parseRoomNumber(t.room_number);
      if (parsedNum !== null) {
        occupiedRoomSet.add(`room-${parsedNum}`);
      } else if (t.room_number) {
        occupiedRoomSet.add(t.room_number.trim().toLowerCase());
      }
    }
  });

  const countActiveRooms = occupiedRoomSet.size;
  const emptyRooms = Math.max(totalRooms - countActiveRooms, 0);

  const totalRentCollected = tenants
    .filter((t) => (t.payment_status || '').toUpperCase() === 'PAID')
    .reduce((sum, t) => sum + (Number(t.rent_price) || 0), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalRentCollected - totalExpenses;

  const isOwner = isPhoneMatch(loginPhone, activeProperty?.owner_phone);

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen p-3 md:p-8 bg-slate-50 text-slate-900 transition-all font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-5">

        {/* HEADER BRANDING CERAH */}
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[1.3rem]">🏢⚡</span>
              <h1 className="text-[1.4rem] font-black text-white">Portal <span className="text-amber-400">Pemilik Kos & Kontrakan</span></h1>
            </div>
            <p className="text-[0.8rem] text-emerald-100 mt-1 font-medium">
              Sistem Manajemen Properti Privat & Terintegrasi RT (Kepatuhan UU PDP)
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

            <Link
              href="/"
              className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-[0.75rem] rounded-2xl border border-emerald-700 shadow"
            >
              🚪 Keluar
            </Link>
          </div>
        </header>

        {copyMsg && (
          <div className="p-3.5 bg-emerald-100 text-emerald-900 border-2 border-emerald-300 rounded-2xl text-[0.85rem] font-bold text-center">
            {copyMsg}
          </div>
        )}

        {!isLoggedIn ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-slate-200 space-y-4 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-900 rounded-3xl flex items-center justify-center text-[1.8rem] mx-auto shadow-inner">
                🏢
              </div>

              <div>
                <h2 className="text-[1.2rem] font-black text-slate-900">Masuk Dasbor Pemilik / Pengelola</h2>
                <p className="text-[0.8rem] text-slate-500 mt-1">
                  Masukkan nomor WhatsApp dan PIN 4-Digit untuk mengelola unit kos Anda.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl text-[0.8rem] font-bold leading-relaxed">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[0.85rem] font-bold text-slate-800 mb-1">Nomor WhatsApp Anda *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08xxxxxxxxxx"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3.5 border-2 border-slate-200 focus:border-emerald-600 rounded-2xl outline-none font-mono text-[1rem] font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[0.85rem] font-bold text-slate-800 mb-1">PIN 4-Digit Unit *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="• • • •"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3.5 border-2 border-slate-200 focus:border-emerald-600 rounded-2xl outline-none font-mono text-[1.2rem] font-bold tracking-[0.4em] text-center bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading || !loginPhone || loginPin.length !== 4}
                  className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[0.95rem] rounded-2xl transition-all shadow-md disabled:bg-slate-300 cursor-pointer"
                >
                  {loginLoading ? 'Memeriksa Hak Akses...' : 'Buka Dasbor Saya →'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* DROPDOWN UNIT AKTIF */}
            <div className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border-2 border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.85rem] font-black text-slate-700">Unit Aktif:</span>
                
                <select
                  value={activeProperty?.id || ''}
                  onChange={(e) => {
                    const selected = myProperties.find((p) => p.id === e.target.value);
                    if (selected) handleSelectProperty(selected);
                  }}
                  className="p-2.5 border-2 border-emerald-400 focus:border-emerald-600 rounded-2xl font-black text-emerald-950 bg-emerald-50 text-[0.9rem] outline-none shadow-sm cursor-pointer"
                >
                  {myProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      🏠 {p.name || p.property_name} ({p.type})
                    </option>
                  ))}
                </select>

                <span className={`text-[0.7rem] font-black px-3 py-1.5 rounded-full uppercase ${
                  isOwner ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}>
                  {isOwner ? '👑 PEMILIK (OWNER)' : '🔑 PENGELOLA'}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => activeProperty && handleOpenEditProp(activeProperty)}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-[0.8rem] font-black rounded-xl border border-amber-500 cursor-pointer shadow-sm"
                  >
                    ✏️ Edit Properti & Pengelola
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 text-[0.8rem] font-bold rounded-xl border border-red-300 cursor-pointer"
                >
                  🔒 Kunci Dasbor (Logout)
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-12 text-center bg-white rounded-3xl border-2 border-slate-200 space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[0.85rem] font-bold text-slate-600">Memuat Data Finansial & Kamar...</p>
              </div>
            ) : activeProperty ? (
              <div className="space-y-5">

                {/* HERO FINANSIAL */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg space-y-1">
                    <span className="text-[0.7rem] font-black uppercase tracking-wider text-emerald-200 bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                      SEWA MASUK (LUNAS)
                    </span>
                    <h3 className="text-[1.6rem] font-black text-white mt-1">
                      Rp {totalRentCollected.toLocaleString('id-ID')}
                    </h3>
                    <p className="text-[0.75rem] text-emerald-100 font-medium">Dari kamar-kamar berstatus lunas</p>
                  </div>

                  <div className="bg-red-800 text-white p-6 rounded-3xl shadow-lg space-y-1">
                    <span className="text-[0.7rem] font-black uppercase tracking-wider text-red-200 bg-red-950/60 px-2.5 py-0.5 rounded-full">
                      PENGELUARAN BULAN INI
                    </span>
                    <h3 className="text-[1.6rem] font-black text-white mt-1">
                      Rp {totalExpenses.toLocaleString('id-ID')}
                    </h3>
                    <p className="text-[0.75rem] text-red-100 font-medium">Listrik, air, WiFi, sampah & servis</p>
                  </div>

                  {isOwner ? (
                    <div className="bg-amber-400 text-slate-950 p-6 rounded-3xl shadow-lg space-y-1 border-2 border-amber-500">
                      <span className="text-[0.7rem] font-black uppercase tracking-wider text-slate-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                        LABA BERSIH BULAN INI (KHUSUS PEMILIK)
                      </span>
                      <h3 className="text-[1.6rem] font-black text-slate-950 mt-1">
                        Rp {netProfit.toLocaleString('id-ID')}
                      </h3>
                      <p className="text-[0.75rem] text-slate-800 font-bold">
                        Okupansi: {Math.round((countActiveRooms / totalRooms) * 100)}% ({countActiveRooms}/{totalRooms} Terisi)
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-200 text-slate-600 p-6 rounded-3xl shadow-sm space-y-1 border-2 border-slate-300 flex flex-col justify-center items-center text-center">
                      <span className="text-[0.7rem] font-black uppercase tracking-wider text-slate-700 bg-slate-300 px-2.5 py-0.5 rounded-full">
                        LABA BERSIH (DISEMBUNYIKAN)
                      </span>
                      <p className="text-[0.8rem] font-bold mt-2">🔒 Akses laba bersih hanya dapat dilihat oleh Pemilik Sah.</p>
                    </div>
                  )}
                </div>

                <div className="flex border-b-2 border-slate-200 gap-2">
                  <button
                    onClick={() => setActiveTab('penyewa')}
                    className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer ${
                      activeTab === 'penyewa'
                        ? 'bg-white border-slate-300 text-emerald-800 shadow-sm -mb-0.5'
                        : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    👥 Daftar Penyewa ({tenants.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('pengeluaran')}
                    className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer ${
                      activeTab === 'pengeluaran'
                        ? 'bg-white border-slate-300 text-red-800 shadow-sm -mb-0.5'
                        : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    📈 Catatan Pengeluaran ({expenses.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('matrix')}
                    className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 transition-all cursor-pointer ${
                      activeTab === 'matrix'
                        ? 'bg-white border-slate-300 text-slate-900 shadow-sm -mb-0.5'
                        : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🏠 Matrix Kamar ({emptyRooms} Kosong)
                  </button>
                </div>

                {/* TAB 1: DAFTAR PENYEWA (TAGIHAN HANYA PADA PENANGGUNG JAWAB) */}
                {activeTab === 'penyewa' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b pb-3">
                      <div>
                        <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                          Penghuni: {activeProperty.name || activeProperty.property_name}
                        </h3>
                        <p className="text-[0.75rem] text-slate-500">Klik status tagihan pada Penanggung Jawab untuk mengubah status bayar sewa.</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleShareWA(activeProperty)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[0.75rem] font-bold rounded-2xl shadow flex items-center gap-1 cursor-pointer"
                        >
                          💬 Link WA Check-in
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosterProp(activeProperty)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[0.75rem] font-bold rounded-2xl shadow flex items-center gap-1 cursor-pointer"
                        >
                          🖨️ Poster QR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRulesModal(activeProperty)}
                          className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-[0.75rem] font-black rounded-2xl shadow cursor-pointer"
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
                              <th className="p-3">Kamar</th>
                              <th className="p-3">Status Tagihan</th>
                              <th className="p-3">Riwayat Sewa (3 Bulan)</th>
                              <th className="p-3">Nominal Sewa</th>
                              <th className="p-3">Status RT & Catatan</th>
                              <th className="p-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {tenants.map((t) => {
                              const st = (t.status || '').toUpperCase();
                              const isPaid = (t.payment_status || '').toUpperCase() === 'PAID';
                              const isPending = st === 'PENDING';
                              const isMarriedWithoutDoc = t.marital_status === 'Menikah' && (!t.marriage_doc_url || !t.kk_doc_url);
                              const threeMonthHistory = getThreeMonthStatus(t.payment_status);
                              const isHeadPerson = t.is_head || (t.relation || '').toLowerCase().includes('penanggung');

                              return (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3">
                                    <div className="font-black text-slate-900">{t.name}</div>
                                    <span className="text-[0.65rem] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 inline-block mt-0.5">
                                      {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                                    </span>
                                  </td>
                                  <td className="p-3 font-bold text-emerald-900">{t.room_number || '-'}</td>

                                  {/* STATUS TAGIHAN HANYA DISEMATKAN PADA PENANGGUNG JAWAB */}
                                  <td className="p-3">
                                    {isHeadPerson ? (
                                      <button
                                        onClick={() => handleTogglePaymentStatus(t.id, t.payment_status)}
                                        className={`px-2.5 py-1 rounded-xl text-[0.7rem] font-black transition-all shadow-sm cursor-pointer ${
                                          isPaid ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
                                        }`}
                                      >
                                        {isPaid ? '✅ LUNAS' : '❌ BELUM LUNAS'}
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 font-bold text-[0.7rem] italic">
                                        - (Ikut Tagihan PJ)
                                      </span>
                                    )}
                                  </td>

                                  {/* RIWAYAT 3 BULAN HANYA PADA PENANGGUNG JAWAB */}
                                  <td className="p-3">
                                    {isHeadPerson ? (
                                      <div className="flex gap-1">
                                        {threeMonthHistory.map((m, idx) => (
                                          <span
                                            key={idx}
                                            className={`text-[0.65rem] font-black px-2 py-0.5 rounded-lg border ${
                                              m.isPaid
                                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                                : 'bg-red-50 text-red-900 border-red-300'
                                            }`}
                                            title={`Bulan ${m.label}: ${m.isPaid ? 'Lunas' : 'Belum Lunas'}`}
                                          >
                                            {m.label} {m.isPaid ? '✓' : '✗'}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-bold text-[0.7rem]">-</span>
                                    )}
                                  </td>

                                  <td className="p-3 font-mono font-bold text-slate-900">
                                    {isHeadPerson ? `Rp ${Number(t.rent_price || 0).toLocaleString('id-ID')}` : 'Rp 0'}
                                  </td>

                                  <td className="p-3 space-y-1">
                                    <span className={'text-[0.65rem] font-black px-2 py-0.5 rounded-full uppercase inline-block ' +
                                      (st === 'ACTIVE' || st === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                       st === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-900')}>
                                      {st === 'VERIFIED' ? '✅ TERVERIFIKASI' : st}
                                    </span>

                                    {isPending && (
                                      <p className="text-[0.7rem] text-amber-900 font-semibold leading-tight bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                                        ⚠️ Menunggu tinjauan & persetujuan Pengurus RT.
                                      </p>
                                    )}
                                    {isMarriedWithoutDoc && (
                                      <p className="text-[0.7rem] text-red-800 font-semibold leading-tight bg-red-50 p-1.5 rounded-lg border border-red-200">
                                        ⚠️ Buku Nikah / KK belum diunggah.
                                      </p>
                                    )}
                                  </td>

                                  <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                    {isHeadPerson && !isPaid && (
                                      <button
                                        onClick={() => handleSendReminderWA(t)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[0.7rem] font-bold rounded-lg cursor-pointer"
                                      >
                                        💬 Tagih WA
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenEditTenant(t)}
                                      className="px-2 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-[0.7rem] font-black rounded-lg cursor-pointer"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTenantRow(t.id, t.name)}
                                      className="px-2 py-1 bg-slate-200 text-slate-700 text-[0.7rem] font-bold rounded-lg hover:bg-red-100 hover:text-red-700 cursor-pointer"
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

                {/* TAB 2: PENGELUARAN */}
                {activeTab === 'pengeluaran' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                          Buku Kas Pengeluaran Kos
                        </h3>
                        <p className="text-[0.75rem] text-slate-500">Catat semua biaya operasional unit ini.</p>
                      </div>

                      <button
                        onClick={() => setShowAddExpenseModal(true)}
                        className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-[0.8rem] font-black rounded-2xl shadow cursor-pointer"
                      >
                        ➕ Catat Pengeluaran Baru
                      </button>
                    </div>

                    {expenses.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50">
                        <p className="text-[0.8rem] text-slate-500 font-medium">Belum ada pengeluaran yang dicatat bulan ini.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[0.8rem]">
                          <thead>
                            <tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]">
                              <th className="p-3">Tanggal</th>
                              <th className="p-3">Kategori</th>
                              <th className="p-3">Keterangan</th>
                              <th className="p-3">Nominal (Rp)</th>
                              <th className="p-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {expenses.map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-semibold">{exp.expense_date}</td>
                                <td className="p-3">
                                  <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-lg text-[0.7rem] font-bold">
                                    {exp.category}
                                  </span>
                                </td>
                                <td className="p-3 font-medium text-slate-800">{exp.title}</td>
                                <td className="p-3 font-mono font-black text-red-700">
                                  - Rp {Number(exp.amount || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id, exp.title)}
                                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg font-bold cursor-pointer"
                                  >
                                    ✕ Hapus
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: MATRIX KAMAR */}
                {activeTab === 'matrix' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="border-b pb-3">
                      <h3 className="text-[1rem] font-black text-slate-900 uppercase">
                        Matrix Okupansi Kamar ({activeProperty.total_rooms || 10} Total Unit)
                      </h3>
                      <p className="text-[0.75rem] text-slate-500">Peta ketersediaan dan nominal sewa masing-masing kamar.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                      {Array.from({ length: activeProperty.total_rooms || 10 }).map((_, idx) => {
                        const targetRoomNum = idx + 1;
                        const roomLabel = `Kamar ${String(targetRoomNum).padStart(2, '0')}`;

                        const occupant = tenants.find((t) => {
                          const pNum = parseRoomNumber(t.room_number);
                          if (pNum !== null) {
                            return pNum === targetRoomNum;
                          }
                          const raw = (t.room_number || '').trim().toLowerCase();
                          return raw === roomLabel.toLowerCase() || raw === `kamar ${targetRoomNum}`.toLowerCase();
                        });

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border-2 space-y-2 ${
                              occupant
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                : 'bg-slate-50 border-slate-300 text-slate-500 border-dashed'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-black text-[0.85rem]">{roomLabel}</span>
                              <span className={`text-[0.65rem] font-extrabold px-2 py-0.5 rounded-full ${
                                occupant ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {occupant ? 'TERISI' : 'KOSONG'}
                              </span>
                            </div>

                            {occupant ? (
                              <div className="text-[0.75rem] space-y-0.5">
                                <p className="font-bold text-slate-900 truncate">👤 {occupant.name}</p>
                                <p className="font-mono text-emerald-800 font-bold">
                                  Rp {Number(occupant.rent_price || 0).toLocaleString('id-ID')} /bln
                                </p>
                              </div>
                            ) : (
                              <p className="text-[0.75rem] font-medium text-slate-400 pt-2">Siap ditempati</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : null}

          </div>
        )}

      </div>

      {/* MODAL POSTER CETAK RESMI QR CODE */}
      {posterProp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center print:hidden">
              <h3 className="text-[0.85rem] font-bold">🖨️ Poster Resmi QR Wajib Lapor RT</h3>
              <button
                type="button"
                onClick={() => setPosterProp(null)}
                className="text-white hover:text-amber-300 font-bold text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center space-y-4 bg-white">
              <div className="border-b-2 border-slate-900 pb-3">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-slate-900 text-white rounded-md uppercase">
                  TERDAFTAR PENGURUS RT
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2 uppercase">WAJIB LAPOR DIRI</h2>
                <p className="text-xs text-slate-600 font-bold">WARGA PENDATANG SEMENTARA</p>
              </div>

              <div className="py-2 space-y-1">
                <h3 className="text-lg font-black text-slate-900">{posterProp.name || posterProp.property_name}</h3>
                <p className="text-xs text-slate-600">Pengelola: {posterProp.manager_name || posterProp.owner_name || '-'}</p>
                <p className="text-xs text-slate-500">{posterProp.address || 'Lingkungan RT Setempat'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    (typeof window !== 'undefined' ? window.location.origin : '') + '/checkin/' + posterProp.slug
                  )}`}
                  alt="QR Code Check-in"
                  className="w-48 h-48 mx-auto rounded-xl"
                />
              </div>

              <div className="text-left bg-amber-50 p-3 rounded-2xl border border-amber-200 text-[11px] text-amber-900 space-y-1 font-semibold">
                <p className="font-bold">📢 INSTRUKSI PENGHUNI BARU:</p>
                <p>1. Pindai QR Code di atas menggunakan kamera HP Anda.</p>
                <p>2. Lengkapi formulir pendaftaran & persetujuan RT dalam 1x24 jam.</p>
                <p>3. Data disimpan aman sesuai aturan UU PDP No. 27 Tahun 2022.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 flex justify-end gap-2 print:hidden border-t">
              <button
                type="button"
                onClick={() => setPosterProp(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow cursor-pointer"
              >
                🖨️ Cetak Poster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TATA TERTIB HUNIAN */}
      {editingRulesProp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">📜 Tata Tertib Hunian ({editingRulesProp.name})</h3>
              <button
                type="button"
                onClick={() => setEditingRulesProp(null)}
                className="text-white hover:text-amber-300 font-bold text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 bg-slate-50">
              <p className="text-[11px] text-slate-600 font-medium">
                Tulis aturan hunian Anda. Teks ini akan langsung muncul di formulir lapor diri warga dan di portal penghuni.
              </p>
              <textarea
                rows={7}
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="w-full text-xs p-3 border rounded-2xl font-mono bg-white focus:ring-2 focus:ring-emerald-600 outline-none leading-relaxed"
              ></textarea>
            </div>
            <div className="p-3 bg-slate-100 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setEditingRulesProp(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRules}
                disabled={savingRules}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:bg-slate-300"
              >
                {savingRules ? 'Menyimpan...' : 'Simpan Tata Tertib'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PROPERTI & PIN UNIT */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.95rem] font-black">
                {editingProperty ? '✏️ Edit Properti, Pengelola, & PIN Unit' : '🏢 Daftarkan Properti Kos Baru'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddPropModal(false); setEditingProperty(null); }}
                className="text-white hover:text-amber-300 font-bold text-xl leading-none cursor-pointer"
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
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Total Kamar *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={propTotalRooms}
                    onChange={(e) => setPropTotalRooms(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-bold bg-white"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 space-y-2">
                <span className="text-[0.7rem] font-black text-slate-600 uppercase block">1. DATA PEMILIK SAH:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Pemilik"
                    value={propOwnerName}
                    onChange={(e) => setPropOwnerName(e.target.value)}
                    className="p-2 border-2 border-slate-200 rounded-xl bg-white font-bold"
                  />
                  <input
                    type="tel"
                    placeholder="No. WA Pemilik"
                    value={propOwnerPhone}
                    onChange={(e) => setPropOwnerPhone(e.target.value)}
                    className="p-2 border-2 border-slate-200 rounded-xl bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-2xl border-2 border-amber-300 space-y-2">
                <span className="text-[0.7rem] font-black text-amber-950 uppercase block">2. DATA PENGELOLA / PENJAGA LAPANGAN:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Pengelola"
                    value={propManagerName}
                    onChange={(e) => setPropManagerName(e.target.value)}
                    className="p-2 border-2 border-amber-200 rounded-xl bg-white font-bold"
                  />
                  <input
                    type="tel"
                    placeholder="No. WA Pengelola"
                    value={propManagerPhone}
                    onChange={(e) => setPropManagerPhone(e.target.value)}
                    className="p-2 border-2 border-amber-200 rounded-xl bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border-2 border-emerald-300 space-y-1.5">
                <span className="text-[0.7rem] font-black text-emerald-950 uppercase block">3. PIN 4-DIGIT AKSES UNIT PROPERTI INI:</span>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="Contoh: 1234"
                  value={propPin}
                  onChange={(e) => setPropPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 border-2 border-emerald-400 rounded-xl bg-white font-mono font-black text-center text-lg tracking-widest text-emerald-950 outline-none"
                />
                <p className="text-[0.7rem] text-emerald-800 font-medium">PIN ini digunakan oleh Owner & Pengelola untuk membuka unit kos ini.</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 space-y-2">
                <span className="text-[0.7rem] font-black text-slate-600 uppercase block">4. REKENING BANK RESMI:</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Bank (BCA)"
                    value={propBankName}
                    onChange={(e) => setPropBankName(e.target.value)}
                    className="p-2 border-2 border-slate-200 rounded-xl bg-white font-bold"
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

              <div>
                <label className="block font-bold text-slate-800 mb-1">Alamat Unit</label>
                <input
                  type="text"
                  placeholder="Alamat Lengkap Kos"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => { setShowAddPropModal(false); setEditingProperty(null); }}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingProp}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl shadow cursor-pointer disabled:bg-slate-300"
                >
                  {submittingProp ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT PENGELUARAN */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-red-800 text-white flex justify-between items-center">
              <h3 className="text-[0.85rem] font-black">➕ Catat Biaya Pengeluaran Kos</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-white hover:text-amber-300 font-bold text-lg leading-none cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="p-5 space-y-3 text-[0.8rem]">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan Biaya *</label>
                <input
                  type="text"
                  required
                  placeholder="Token Listrik"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none font-bold bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori *</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                  >
                    <option value="Listrik">Listrik</option>
                    <option value="Air / PDAM">Air / PDAM</option>
                    <option value="WiFi">WiFi</option>
                    <option value="Kebersihan">Sampah</option>
                    <option value="Gaji Penjaga">Gaji Penjaga</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal (Rp) *</label>
                <input
                  type="text"
                  required
                  placeholder="350000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-mono font-bold text-red-700 bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 bg-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-4 py-2 bg-red-700 text-white font-black rounded-xl shadow cursor-pointer"
                >
                  Simpan
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
              <h3 className="text-[0.85rem] font-black">✏️ Edit Kamar & Nominal Sewa</h3>
              <button onClick={() => setEditingTenant(null)} className="text-white font-bold text-lg leading-none cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTenantSubmit} className="p-5 space-y-3 text-[0.8rem]">
              <div>
                <label className="block font-bold mb-1 text-slate-700">Nama Penyewa *</label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-bold bg-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">No. WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">Nomor / Lokasi Kamar</label>
                <input
                  type="text"
                  value={tenantRoom}
                  onChange={(e) => setTenantRoom(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-bold bg-white text-emerald-900"
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border-2 border-emerald-300 space-y-1">
                <label className="block font-black text-emerald-950 text-[0.75rem]">
                  💰 Harga Sewa Kamar Ini (Rp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 800000 atau 1000000"
                  value={tenantRentPrice}
                  onChange={(e) => setTenantRentPrice(e.target.value)}
                  className="w-full p-2.5 border-2 border-emerald-400 rounded-xl font-mono font-black text-emerald-950 bg-white text-base"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setEditingTenant(null)} className="px-4 py-2 bg-slate-200 font-bold rounded-xl cursor-pointer">Batal</button>
                <button type="submit" disabled={savingTenant} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow cursor-pointer">Simpan Harga</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
