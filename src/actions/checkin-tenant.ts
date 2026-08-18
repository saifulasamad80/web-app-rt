'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ============================================================================
// Paksa Supabase agar selalu real-time (tanpa cache memori)
// ============================================================================
const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
  auth: { persistSession: false },
  global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
});

function cleanDigits(phone?: string): string { return phone ? phone.replace(/\D/g, '') : ''; }

export async function getRtDashboardBundle() {
  try {
    const [tRes, pRes, oRes, dRes, aRes] = await Promise.all([
      supabase.from('tenants').select('*').order('created_at', { ascending: false }),
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('dues').select('*').order('created_at', { ascending: false }),
      supabase.from('dues_audit_logs').select('*').order('created_at', { ascending: false }).limit(30)
    ]);

    const propMap = new Map((pRes.data || []).map((p) => [p.id, p]));
    const mergedTenants = (tRes.data || []).map((t) => ({ ...t, properties: propMap.get(t.property_id) || null }));

    let officersList = oRes.data || [];
    if (officersList.length === 0) {
      officersList = [{ id: '1', full_name: 'Saiful Anwar Samad (Ajip)', role: 'SUPER_ADMIN', phone_number: '082113546883', email: 'ajipsas@gmail.com' }];
    }
    return { success: true, tenants: mergedTenants, properties: pRes.data || [], officers: officersList, dues: dRes.data || [], auditLogs: aRes.data || [] };
  } catch (err: any) {
    return { success: false, tenants: [], properties: [], officers: [], dues: [], auditLogs: [], error: err.message };
  }
}

export async function getOwnerAuditLogs() {
  const { data } = await supabase.from('dues_audit_logs').select('*').or('performed_by.ilike.%Owner%,performed_by.ilike.%Pemilik%,performed_by.ilike.%Pengelola%').order('created_at', { ascending: false }).limit(30);
  return { success: true, logs: data || [] };
}

export async function loginRtAdminAction(emailInput: string, passwordInput: string) {
  if (!emailInput || !passwordInput) return { success: false, error: 'Email dan kata sandi pengurus wajib diisi.' };
  try {
    const clientAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseServiceKey);
    const { data, error } = await clientAuth.auth.signInWithPassword({ email: emailInput.trim(), password: passwordInput });
    if (error || !data.user) return { success: false, error: error?.message || 'Email atau kata sandi pengurus RT tidak sesuai.' };
    return { success: true, user: data.user };
  } catch (err: any) { return { success: false, error: err.message }; }
}

export async function resetOfficerPasswordBySuperAdmin(targetEmail: string, newPassword: string, requesterEmail: string = 'ajipsas@gmail.com') {
  if (!targetEmail || !newPassword) return { success: false, error: 'Email target dan kata sandi baru wajib diisi.' };
  if (requesterEmail.trim().toLowerCase() !== 'ajipsas@gmail.com') return { success: false, error: '⛔ Akses Ditolak.' };
  try {
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr || !users) { await supabase.rpc('reset_admin_password_direct', { target_email: targetEmail.trim().toLowerCase(), new_plain_password: newPassword }); return { success: true }; }
    const targetUser = users.users.find((u) => u.email?.toLowerCase() === targetEmail.trim().toLowerCase());
    if (!targetUser) return { success: false, error: `Akun tidak ditemukan.` };
    await supabase.auth.admin.updateUserById(targetUser.id, { password: newPassword });
    await supabase.from('dues_audit_logs').insert({ action_type: 'RESET_PASSWORD', performed_by: 'Super Admin (ajipsas@gmail.com)', details: `Mereset kata sandi akun pengurus: ${targetEmail}` });
    return { success: true };
  } catch (err: any) { return { success: false, error: err?.message }; }
}

export async function addRtOfficer(fullName: string, role: string, phone: string, email: string, initialPassword?: string) {
  if (!fullName || !phone || !email) return { success: false, error: 'Wajib diisi.' };
  if (initialPassword && initialPassword.length >= 6) { try { await supabase.auth.admin.createUser({ email: email.trim().toLowerCase(), password: initialPassword, email_confirm: true, user_metadata: { name: fullName, role } }); } catch (e) {} }
  const { data, error } = await supabase.from('profiles').insert({ full_name: fullName, role, phone_number: phone.trim(), email: email.trim().toLowerCase() }).select();
  if (!error) try { revalidatePath('/rt'); } catch (e) {}
  return { success: !error, data: data ? data[0] : null, error: error?.message };
}

export async function updateRtOfficer(id: string, fullName: string, role: string, phone: string, email: string) {
  const { error } = await supabase.from('profiles').update({ full_name: fullName, role, phone_number: phone.trim(), email: email.trim().toLowerCase() }).eq('id', id);
  if (!error) try { revalidatePath('/rt'); } catch (e) {}
  return { success: !error, error: error?.message };
}

export async function deleteRtOfficer(id: string) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (!error) try { revalidatePath('/rt'); } catch (e) {}
  return { success: !error, error: error?.message };
}

export async function loginOwnerDashboard(phoneInput: string, pinInput: string) {
  if (!phoneInput || !pinInput) return { success: false, properties: [], initialDetails: null, error: 'Wajib diisi.' };
  try {
    const rawClean = cleanDigits(phoneInput);
    const suffix = rawClean.length >= 7 ? rawClean.slice(-8) : rawClean;
    const { data: properties, error } = await supabase.from('properties').select('*').or(`owner_phone.ilike.%${suffix}%,manager_phone.ilike.%${suffix}%,owner_phone.eq.${phoneInput.trim()},manager_phone.eq.${phoneInput.trim()}`).order('created_at', { ascending: false });
    if (error || !properties || properties.length === 0) return { success: false, properties: [], initialDetails: null, error: `Nomor belum terdaftar.` };
    if (!properties.some((p) => p.pin_code === pinInput)) return { success: false, properties: [], initialDetails: null, error: '🔒 PIN 4-Digit salah.' };
    const firstProp = properties[0];
    const [tenantsRes, expensesRes] = await Promise.all([
      supabase.from('tenants').select('*').eq('property_id', firstProp.id).order('entry_date', { ascending: false }),
      supabase.from('property_expenses').select('*').eq('property_id', firstProp.id).order('expense_date', { ascending: false })
    ]);
    return { success: true, properties, initialDetails: { property: firstProp, tenants: tenantsRes.data || [], expenses: expensesRes.data || [] }, error: undefined };
  } catch (err: any) { return { success: false, properties: [], initialDetails: null, error: err.message }; }
}

export async function getOwnerPropertyDetails(propertyId: string) {
  if (!propertyId) return { success: false, property: null, tenants: [], expenses: [], error: 'ID kosong.' };
  try {
    const [propRes, tenantsRes, expensesRes] = await Promise.all([
      supabase.from('properties').select('*').eq('id', propertyId).single(),
      supabase.from('tenants').select('*').eq('property_id', propertyId).order('entry_date', { ascending: false }),
      supabase.from('property_expenses').select('*').eq('property_id', propertyId).order('expense_date', { ascending: false })
    ]);
    if (propRes.error || !propRes.data) return { success: false, property: null, tenants: [], expenses: [], error: 'Properti tidak ditemukan.' };
    return { success: true, property: propRes.data, tenants: tenantsRes.data || [], expenses: expensesRes.data || [], error: undefined };
  } catch (err: any) { return { success: false, property: null, tenants: [], expenses: [], error: err.message }; }
}

export async function createProperty(name: string, type: 'kos' | 'kontrakan', address: string, house_rules: string, pin_code: string, owner_name?: string, owner_phone?: string, manager_name?: string, manager_phone?: string, total_rooms: number = 1, bank_name?: string, bank_account_number?: string, bank_account_holder?: string) {
  if (!name || !pin_code) return { success: false, error: 'Nama & PIN wajib diisi.' };
  const slugBase = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const slug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data, error } = await supabase.from('properties').insert({ name, property_name: name, type, slug, address, house_rules, pin_code, owner_name: owner_name || '', owner_phone: owner_phone || '', manager_name: manager_name || '', manager_phone: manager_phone || '', total_rooms: total_rooms || 1, bank_name: bank_name || '', bank_account_number: bank_account_number || '', bank_account_holder: bank_account_holder || '', status: 'APPROVED' }).select();
  if (error) return { success: false, error: error.message };
  try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
  return { success: true, data: data ? data[0] : null };
}

export async function updateProperty(propertyId: string, payload: any, performedBy: string = 'Owner Kos') {
  const updateFields: any = { ...payload };
  if (payload.name !== undefined) updateFields.property_name = payload.name;
  const { error } = await supabase.from('properties').update(updateFields).eq('id', propertyId);
  if (!error) {
    await supabase.from('dues_audit_logs').insert({ action_type: 'UPDATE_PROPERTI', performed_by: performedBy, details: `Memperbarui data unit kos` });
    try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
  }
  return { success: !error, error: error?.message };
}

export async function deleteProperty(propertyId: string) {
  await supabase.from('property_expenses').delete().eq('property_id', propertyId);
  await supabase.from('tenants').delete().eq('property_id', propertyId);
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);
  if (!error) try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
  return { success: !error, error: error?.message };
}

export async function addPropertyExpense(propertyId: string, title: string, category: string, amount: number, expenseDate?: string, notes?: string, performedBy: string = 'Owner Kos') {
  if (!propertyId || !title || !amount) return { success: false, error: 'Wajib diisi.' };
  const { data, error } = await supabase.from('property_expenses').insert({ property_id: propertyId, title, category: category || 'Lainnya', amount, expense_date: expenseDate || new Date().toISOString().slice(0, 10), notes: notes || '' }).select();
  if (!error) {
    await supabase.from('dues_audit_logs').insert({ action_type: 'TAMBAH_BIAYA_KOS', performed_by: performedBy, details: `Menambah pengeluaran: "${title}" (${category}) Rp ${amount.toLocaleString('id-ID')}` });
    try { revalidatePath('/owner'); } catch (e) {}
  }
  return { success: !error, data: data ? data[0] : null, error: error?.message };
}

export async function deletePropertyExpense(expenseId: string, title?: string, amount?: number, performedBy: string = 'Owner Kos') {
  const { error } = await supabase.from('property_expenses').delete().eq('id', expenseId);
  if (!error) {
    await supabase.from('dues_audit_logs').insert({ action_type: 'HAPUS_BIAYA_KOS', performed_by: performedBy, details: `Menghapus pengeluaran: "${title || 'Tidak ada judul'}" Rp ${(amount||0).toLocaleString('id-ID')}` });
    try { revalidatePath('/owner'); } catch (e) {}
  }
  return { success: !error, error: error?.message };
}

export async function getTenantPortalData(phoneInput: string) {
  if (!phoneInput) return { success: false, error: 'Wajib diisi.' };
  try {
    const rawClean = cleanDigits(phoneInput);
    const suffix = rawClean.length >= 7 ? rawClean.slice(-8) : rawClean;
    const { data: tenantRecords, error: tenantErr } = await supabase.from('tenants').select('*').or(`phone.ilike.%${suffix}%,phone.eq.${phoneInput.trim()},phone.eq.${rawClean}`).order('created_at', { ascending: false });
    if (tenantErr || !tenantRecords || tenantRecords.length === 0) return { success: false, error: `Belum terdaftar.` };
    const headRooms = tenantRecords.filter((t) => t.is_head);
    const primary = headRooms.length > 0 ? headRooms[0] : tenantRecords[0];
    let propertyData = null;
    if (primary.property_id) { const { data: pData } = await supabase.from('properties').select('*').eq('id', primary.property_id).single(); propertyData = pData; }
    let householdMembers = [primary];
    if (primary.household_id) { const { data: members } = await supabase.from('tenants').select('*').eq('household_id', primary.household_id).order('is_head', { ascending: false }); if (members && members.length > 0) householdMembers = members; }
    return { success: true, tenant: { ...primary, properties: propertyData }, allRooms: headRooms.length > 0 ? headRooms : [primary], household: householdMembers };
  } catch (err: any) { return { success: false, error: err.message }; }
}

export async function addMemberSusulan(formData: FormData) {
  try {
    const household_id = formData.get('household_id') as string; const property_id = formData.get('property_id') as string; const room_number = formData.get('room_number') as string;
    const entry_date = (formData.get('entry_date') as string) || new Date().toISOString().slice(0, 10);
    const name = formData.get('name') as string; const phone = (formData.get('phone') as string || '').trim(); const birth_date = formData.get('birth_date') as string; const relation = formData.get('relation') as string;
    let memberMaritalStatus = (relation === 'Istri' || relation === 'Suami') ? 'Menikah' : 'Belum Menikah';
    let ktp_path = null; const ktpFile = formData.get('ktp');
    if (ktpFile instanceof File && ktpFile.size > 0) {
      const { data: upData, error: upErr } = await supabase.storage.from('ktp-documents').upload(`ktp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`, Buffer.from(await ktpFile.arrayBuffer()), { contentType: ktpFile.type, upsert: true });
      if (!upErr && upData) ktp_path = upData.path;
    }
    const { data, error } = await supabase.from('tenants').insert({ household_id, property_id, room_number, entry_date, name, phone, birth_date, relation, is_head: false, marital_status: memberMaritalStatus, rent_price: 0, payment_status: 'UNPAID', status: 'PENDING', ktp_path }).select();
    if (error) return { success: false, error: error.message };
    try { revalidatePath('/portal-warga'); revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
    return { success: true, data: data ? data[0] : null };
  } catch (err: any) { return { success: false, error: err.message }; }
}

export async function checkRoomAvailability(propertyId: string, roomNumber: string) {
  if (!propertyId || !roomNumber) return { available: true };
  
  // HAPUS SINTAKS ANEH. Panggil bersih ke database.
  const { data, error } = await supabase
    .from('tenants')
    .select('room_number, status')
    .eq('property_id', propertyId);
    
  if (error || !data) return { available: true }; 
  
  const activeStatuses = ['PENDING', 'VERIFIED', 'ACTIVE'];
  const targetRoom = String(roomNumber).toLowerCase().trim();

  const isTaken = data.some(t => {
    const tStatus = String(t.status || '').toUpperCase().trim();
    if (!activeStatuses.includes(tStatus)) return false;
    const tRoom = String(t.room_number || '').toLowerCase().trim();
    return tRoom === targetRoom;
  });
  
  return { available: !isTaken };
}

export async function submitMultiTenantsStrict(formData: FormData) {
  try {
    const property_id = formData.get('property_id') as string; 
    const room_number = (formData.get('room_number') as string) || ''; 
    const entry_date = (formData.get('entry_date') as string) || new Date().toISOString().slice(0, 10);
    
    // ============================================================================
    // FIX MUTLAK (FAIL CLOSED): Jika Database Error, Pendaftaran Gagal Total!
    // ============================================================================
    if (room_number) {
        const { data: exist, error: existErr } = await supabase
           .from('tenants')
           .select('room_number, status')
           .eq('property_id', property_id);
           
        // CEGAH FAIL OPEN: Jika database error, tolak! Jangan anggap aman.
        if (existErr) {
            return { success: false, data: [], error: 'Sistem Gagal Memverifikasi Keamanan Kamar. Silakan coba lagi.' };
        }

        if (exist && exist.length > 0) {
            const targetRoom = String(room_number).toLowerCase().trim();
            const activeStatuses = ['PENDING', 'VERIFIED', 'ACTIVE'];
            
            const isTaken = exist.some(t => {
                const tStatus = String(t.status || '').toUpperCase().trim();
                if (!activeStatuses.includes(tStatus)) return false;
                const tRoom = String(t.room_number || '').toLowerCase().trim();
                return tRoom === targetRoom;
            });

            if (isTaken) {
                // TENDANG BALIK KE LANGKAH 1 DARI IDE JENIUS LU!
                return { success: false, data: [], error: `KAMAR_BENTROK` };
            }
        }
    }

    const rent_price = parseInt((formData.get('rent_price') as string || '0').replace(/\D/g, ''), 10) || 0; const marital_status = (formData.get('marital_status') as string) || 'Belum Menikah'; const occupation = (formData.get('occupation') as string) || '';
    const occupantsRaw = formData.get('occupants') as string; const household_id = `HH-${Date.now()}`;
    const uploadFile = async (file: File, prefix: string) => { const { data, error } = await supabase.storage.from('ktp-documents').upload(`${prefix}_${Date.now()}.jpg`, Buffer.from(await file.arrayBuffer()), { contentType: file.type || 'image/jpeg', upsert: true }); return error ? null : data?.path; };
    const ktpFile = formData.get('ktp'); const marriageDoc = formData.get('marriage_doc'); const kkDoc = formData.get('kk_doc');
    const [ktp_path, marriage_doc_url, kk_doc_url] = await Promise.all([ (ktpFile instanceof File && ktpFile.size > 0) ? uploadFile(ktpFile, 'ktp') : Promise.resolve(null), (marriageDoc instanceof File && marriageDoc.size > 0) ? uploadFile(marriageDoc, 'doc') : Promise.resolve(null), (kkDoc instanceof File && kkDoc.size > 0) ? uploadFile(kkDoc, 'kk') : Promise.resolve(null) ]);
    let occupants: any[] = []; try { occupants = JSON.parse(occupantsRaw || '[]'); } catch (e) {}
    if (occupants.length === 0) occupants = [{ name: formData.get('name'), phone: formData.get('phone'), address_ktp: formData.get('address_ktp'), relation: 'Penanggung Jawab', is_head: true }];
    const insertPayload = await Promise.all(occupants.map(async (occ: any, index: number) => {
      let member_ktp_path = index === 0 ? ktp_path : null;
      if (index > 0) { const memberFile = formData.get(`member_ktp_${index - 1}`); if (memberFile instanceof File && memberFile.size > 0) member_ktp_path = await uploadFile(memberFile, `ktp_member_${index}`); }
      let currentMaritalStatus = occ.marital_status || 'Belum Menikah'; if (index === 0) { currentMaritalStatus = marital_status; } else if (occ.relation === 'Istri' || occ.relation === 'Suami') { currentMaritalStatus = 'Menikah'; }
      return { property_id, room_number, entry_date, household_id, name: occ.name, phone: (occ.phone || (index === 0 ? (formData.get('phone') as string) : '')).trim(), address_ktp: occ.address_ktp || (formData.get('address_ktp') as string) || '', relation: occ.relation || (index === 0 ? 'Penanggung Jawab' : 'Anggota'), is_head: index === 0, birth_date: occ.birth_date || (index === 0 ? (formData.get('birth_date') as string) : null), marital_status: currentMaritalStatus, occupation: index === 0 ? occupation : '', rent_price: index === 0 ? rent_price : 0, payment_status: 'UNPAID', status: 'PENDING', ktp_path: member_ktp_path, marriage_doc_url: marriage_doc_url || null, kk_doc_url: kk_doc_url || null };
    }));
    const { data, error } = await supabase.from('tenants').insert(insertPayload).select();
    if (error) return { success: false, data: [], error: error.message };
    try { revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
    return { success: true, data: data || [], household_id, error: undefined };
  } catch (err: any) { return { success: false, data: [], error: err?.message }; }
}

export async function uploadPendingDocument(tenantId: string, docType: 'marriage' | 'kk' | 'ktp', formData: FormData) {
  const file = formData.get('file'); if (!(file instanceof File)) return { success: false, error: 'Berkas tidak valid.' };
  try {
    const { data: uploadData, error: uploadErr } = await supabase.storage.from('ktp-documents').upload(`${docType}_susulan_${Date.now()}.jpg`, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
    if (uploadErr || !uploadData) return { success: false, error: 'Gagal mengunggah.' };
    const updateField = docType === 'marriage' ? { marriage_doc_url: uploadData.path } : docType === 'kk' ? { kk_doc_url: uploadData.path } : { ktp_path: uploadData.path };
    const { error: dbErr } = await supabase.from('tenants').update(updateField).eq('id', tenantId);
    if (dbErr) return { success: false, error: dbErr.message };
    try { revalidatePath('/portal-warga'); revalidatePath('/owner'); revalidatePath('/rt'); } catch (e) {}
    return { success: true, path: uploadData.path };
  } catch (err: any) { return { success: false, error: err.message }; }
}

export async function updateTenantPaymentStatus(tenantId: string, payment_status: 'PAID' | 'UNPAID', performedBy: string = 'Owner Kos') {
  const { error } = await supabase.from('tenants').update({ payment_status }).eq('id', tenantId);
  if (!error) {
    await supabase.from('dues_audit_logs').insert({ action_type: 'UPDATE_PEMBAYARAN', performed_by: performedBy, details: `Mengubah tagihan penyewa menjadi ${payment_status}` });
    try { revalidatePath('/owner'); revalidatePath('/portal-warga'); } catch (e) {}
  }
  return { success: !error, error: error?.message };
}

export async function updateTenantStatus(tenantId: string, status: 'active' | 'checked_out' | 'verified' | 'rejected') {
  const finalStatus = status === 'active' || status === 'verified' ? 'VERIFIED' : status === 'rejected' ? 'REJECTED' : status.toUpperCase();
  const { error } = await supabase.from('tenants').update({ status: finalStatus }).eq('id', tenantId);
  if (!error) try { revalidatePath('/owner'); revalidatePath('/rt'); revalidatePath('/portal-warga'); } catch (e) {}
  return { success: !error, error: error?.message };
}

export async function updateTenantData(tenantId: string, payload: any, performedBy: string = 'Owner Kos') {
  const { error } = await supabase.from('tenants').update(payload).eq('id', tenantId);
  if (!error) {
    await supabase.from('dues_audit_logs').insert({ action_type: 'EDIT_PENYEWA', performed_by: performedBy, details: `Mengubah rincian data / harga sewa penyewa` });
    try { revalidatePath('/owner'); revalidatePath('/rt'); revalidatePath('/portal-warga'); } catch (e) {}
  }
  return { success: !error, error: error?.message };
}

export async function deleteTenant(tenantId: string, performedBy: string = 'Owner Kos') {
  const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
  if (!error) {
    await supabase.from('dues_audit_logs').insert({ action_type: 'HAPUS_PENYEWA', performed_by: performedBy, details: `Menghapus data penyewa` });
    try { revalidatePath('/owner'); revalidatePath('/rt'); revalidatePath('/portal-warga'); } catch (e) {}
  }
  return { success: !error, error: error?.message };
}

export async function updateHouseRules(propertyId: string, house_rules: string) {
  const { error } = await supabase.from('properties').update({ house_rules }).eq('id', propertyId);
  return { success: !error, error: error?.message };
}

export async function getDocumentSignedUrl(filePath: string) {
  if (!filePath) return { success: false, error: 'Path kosong.' };
  try {
    const cleanPath = filePath.replace(/^ktp-documents\//, '');
    const { data, error } = await supabase.storage.from('ktp-documents').createSignedUrl(cleanPath, 60);
    if (error || !data?.signedUrl) return { success: false, error: 'Gagal URL.' };
    return { success: true, url: data.signedUrl };
  } catch (err: any) { return { success: false, error: err.message }; }
}

export async function recordRtDues(payerName: string, blockNumber: string, amount: number, month: string, year: string, performedBy: string = 'Admin RT') {
  if (!payerName || !amount) return { success: false, error: 'Wajib diisi.' };
  const periodStr = `${month} ${year}`;
  const { data, error } = await supabase.from('dues').insert({ payer_name: payerName, resident_name: payerName, block_number: blockNumber, house_number: blockNumber, amount, period: periodStr, period_month: month, month, year, status: 'PAID', paid_at: new Date().toISOString() }).select();
  if (error) return { success: false, error: error.message };
  await supabase.from('dues_audit_logs').insert({ dues_id: data && data[0] ? data[0].id : null, action_type: 'INPUT_KAS', performed_by: performedBy, details: `Mencatat iuran Rp ${amount.toLocaleString('id-ID')} (${periodStr}) dari warga: ${payerName} (Unit: ${blockNumber})` });
  try { revalidatePath('/rt'); } catch (e) {}
  return { success: true, data: data ? data[0] : null };
}

export async function deleteRtDues(duesId: string, payerName: string, amount: number) {
  const { error } = await supabase.from('dues').delete().eq('id', duesId);
  if (!error) {
    await supabase.from('dues_audit_logs').insert({ action_type: 'HAPUS_KAS', performed_by: 'Pengurus RT', details: `Menghapus transaksi iuran Rp ${amount.toLocaleString('id-ID')} dari: ${payerName}` });
    try { revalidatePath('/rt'); } catch (e) {}
  }
  return { success: !error, error: error?.message };
}