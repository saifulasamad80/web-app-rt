'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export async function getPublicPropertiesList() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  return { success: !error, properties: data || [], error: error?.message };
}

export async function getPropertyRules(slug: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return { success: false, property: null, error: 'Properti tidak ditemukan: ' + (error?.message || '') };
  return { success: true, property: data, error: undefined };
}

export async function createProperty(
  name: string,
  type: 'kos' | 'kontrakan',
  address: string,
  house_rules: string,
  pin_code: string,
  owner_name?: string,
  owner_phone?: string,
  manager_name?: string,
  manager_phone?: string,
  total_rooms: number = 1,
  bank_name?: string,
  bank_account_number?: string,
  bank_account_holder?: string
) {
  if (!name || !pin_code) return { success: false, error: 'Nama properti & PIN wajib diisi.' };

  const slugBase = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const slug = `${slugBase}-${randomCode}`;

  const { data, error } = await supabase.from('properties').insert({
    name,
    property_name: name,
    type,
    slug,
    address,
    house_rules,
    pin_code,
    owner_name: owner_name || '',
    owner_phone: owner_phone || '',
    manager_name: manager_name || '',
    manager_phone: manager_phone || '',
    total_rooms: total_rooms || 1,
    bank_name: bank_name || '',
    bank_account_number: bank_account_number || '',
    bank_account_holder: bank_account_holder || '',
    status: 'APPROVED'
  }).select();

  if (error) return { success: false, error: error.message };

  try {
    revalidatePath('/owner');
    revalidatePath('/rt');
  } catch (e) {}

  return { success: true, data };
}

export async function updateProperty(
  propertyId: string,
  payload: {
    name?: string;
    owner_name?: string;
    owner_phone?: string;
    manager_name?: string;
    manager_phone?: string;
    total_rooms?: number;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_holder?: string;
    address?: string;
    type?: string;
    pin_code?: string;
  }
) {
  const { error } = await supabase
    .from('properties')
    .update({
      name: payload.name,
      property_name: payload.name,
      owner_name: payload.owner_name,
      owner_phone: payload.owner_phone,
      manager_name: payload.manager_name,
      manager_phone: payload.manager_phone,
      total_rooms: payload.total_rooms,
      bank_name: payload.bank_name,
      bank_account_number: payload.bank_account_number,
      bank_account_holder: payload.bank_account_holder,
      address: payload.address,
      type: payload.type,
      pin_code: payload.pin_code
    })
    .eq('id', propertyId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function deleteProperty(propertyId: string) {
  await supabase.from('property_expenses').delete().eq('property_id', propertyId);
  await supabase.from('tenants').delete().eq('property_id', propertyId);
  const { error } = await supabase.from('properties').delete().eq('id', propertyId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function getTenantsByPropertyPin(propertyId: string, pinInput: string) {
  const { data: prop, error: propErr } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propErr || !prop) return { success: false, property: null, tenants: [], expenses: [], error: 'Properti tidak ditemukan.' };

  if (prop.pin_locked_until && new Date(prop.pin_locked_until) > new Date()) {
    return { success: false, property: null, tenants: [], expenses: [], error: '🔒 Unit ini terkunci sementara akibat 3x PIN salah. Hubungi RT untuk reset PIN.' };
  }

  if (prop.pin_code !== pinInput) {
    const attempts = (prop.failed_pin_attempts || 0) + 1;
    let lockTime = null;

    if (attempts >= 3) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      lockTime = lockUntil.toISOString();
    }

    await supabase
      .from('properties')
      .update({ failed_pin_attempts: attempts, pin_locked_until: lockTime })
      .eq('id', propertyId);

    if (attempts >= 3) {
      return { success: false, property: null, tenants: [], expenses: [], error: '🔒 Terlalu banyak percobaan PIN salah. Terkunci 15 menit.' };
    }

    return { success: false, property: null, tenants: [], expenses: [], error: `🔒 PIN salah (${attempts}/3 percobaan).` };
  }

  await supabase
    .from('properties')
    .update({ failed_pin_attempts: 0, pin_locked_until: null })
    .eq('id', propertyId);

  const { data: tenants, error: tenErr } = await supabase
    .from('tenants')
    .select('*')
    .eq('property_id', propertyId)
    .order('entry_date', { ascending: false });

  const { data: expenses } = await supabase
    .from('property_expenses')
    .select('*')
    .eq('property_id', propertyId)
    .order('expense_date', { ascending: false });

  return { success: true, property: prop, tenants: tenants || [], expenses: expenses || [], error: tenErr?.message };
}

export async function addPropertyExpense(propertyId: string, title: string, category: string, amount: number, expenseDate?: string, notes?: string) {
  if (!propertyId || !title || !amount) {
    return { success: false, error: 'Judul dan nominal biaya pengeluaran wajib diisi.' };
  }

  const { data, error } = await supabase.from('property_expenses').insert({
    property_id: propertyId,
    title,
    category: category || 'Lainnya',
    amount,
    expense_date: expenseDate || new Date().toISOString().slice(0, 10),
    notes: notes || ''
  }).select();

  if (!error) {
    try {
      revalidatePath('/owner');
    } catch (e) {}
  }

  return { success: !error, data: data ? data[0] : null, error: error?.message };
}

export async function deletePropertyExpense(expenseId: string) {
  const { error } = await supabase.from('property_expenses').delete().eq('id', expenseId);
  if (!error) {
    try {
      revalidatePath('/owner');
    } catch (e) {}
  }
  return { success: !error, error: error?.message };
}

export async function getTenantPortalData(phoneInput: string) {
  if (!phoneInput) return { success: false, error: 'Nomor WhatsApp wajib diisi.' };

  const rawClean = phoneInput.replace(/\D/g, '');
  const suffix = rawClean.length >= 7 ? rawClean.slice(-8) : rawClean;

  const { data: tenantRecords, error: tenantErr } = await supabase
    .from('tenants')
    .select('*')
    .or(`phone.ilike.%${suffix}%,phone.eq.${phoneInput.trim()},phone.eq.${rawClean}`)
    .order('created_at', { ascending: false });

  if (tenantErr) {
    return { success: false, error: `[Database Error]: ${tenantErr.message}` };
  }

  if (!tenantRecords || tenantRecords.length === 0) {
    return {
      success: false,
      error: `Nomor WhatsApp (${phoneInput}) belum terdaftar di sistem warga RT. Pastikan data sudah masuk di tabel tenants.`
    };
  }

  const primary = tenantRecords[0];

  let propertyData = null;
  if (primary.property_id) {
    const { data: propData } = await supabase
      .from('properties')
      .select('*')
      .eq('id', primary.property_id)
      .single();
    propertyData = propData;
  }

  let householdMembers = [primary];
  if (primary.household_id) {
    const { data: members } = await supabase
      .from('tenants')
      .select('*')
      .eq('household_id', primary.household_id)
      .order('is_head', { ascending: false });
    if (members && members.length > 0) {
      householdMembers = members;
    }
  }

  return {
    success: true,
    tenant: { ...primary, properties: propertyData },
    household: householdMembers
  };
}

export async function submitMultiTenantsStrict(formData: FormData) {
  try {
    const property_id = formData.get('property_id') as string;
    const room_number = (formData.get('room_number') as string) || '';
    const entry_date = (formData.get('entry_date') as string) || new Date().toISOString().slice(0, 10);
    const rent_price = parseInt((formData.get('rent_price') as string || '0').replace(/\D/g, ''), 10) || 0;
    const marital_status = (formData.get('marital_status') as string) || 'Belum Menikah';
    const occupation = (formData.get('occupation') as string) || '';
    const occupantsRaw = formData.get('occupants') as string;

    const household_id = `HH-${Date.now()}`;
    const registered_at = new Date().toISOString();

    const ktpData = formData.get('ktp');
    let ktp_path = '';
    if (ktpData && ktpData instanceof File && ktpData.size > 0) {
      const fileExt = ktpData.name.split('.').pop() || 'jpg';
      const fileName = `ktp_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const buffer = Buffer.from(await ktpData.arrayBuffer());

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('ktp-documents')
        .upload(fileName, buffer, { contentType: ktpData.type || 'image/jpeg', upsert: true });

      if (!uploadErr && uploadData) {
        ktp_path = uploadData.path;
      }
    }

    const marriageDoc = formData.get('marriage_doc');
    let marriage_doc_url = '';
    if (marriageDoc && marriageDoc instanceof File && marriageDoc.size > 0) {
      const fileExt = marriageDoc.name.split('.').pop() || 'jpg';
      const fileName = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const buffer = Buffer.from(await marriageDoc.arrayBuffer());

      const { data: uploadDocData, error: uploadDocErr } = await supabase.storage
        .from('ktp-documents')
        .upload(fileName, buffer, { contentType: marriageDoc.type || 'image/jpeg', upsert: true });

      if (!uploadDocErr && uploadDocData) {
        marriage_doc_url = uploadDocData.path;
      }
    }

    let occupants = [];
    if (occupantsRaw) {
      try {
        occupants = JSON.parse(occupantsRaw);
      } catch (e) {}
    }

    if (!occupants || occupants.length === 0) {
      const name = formData.get('name') as string;
      const phone = formData.get('phone') as string;
      const address_ktp = formData.get('address_ktp') as string;

      if (!name || !phone) {
        return { success: false, data: [], household_id: '', registered_at: '', error: 'Nama dan WhatsApp wajib diisi.' };
      }

      occupants = [{ name, phone, address_ktp, relation: 'Penanggung Jawab', is_head: true }];
    }

    const insertPayload = [];
    for (let index = 0; index < occupants.length; index++) {
      const occ = occupants[index];
      let member_ktp_path = index === 0 ? ktp_path : null;

      if (index > 0) {
        const memberKtpFile = formData.get(`member_ktp_${index}`);
        if (memberKtpFile && memberKtpFile instanceof File && memberKtpFile.size > 0) {
          const fileExt = memberKtpFile.name.split('.').pop() || 'jpg';
          const fileName = `ktp_member_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const buffer = Buffer.from(await memberKtpFile.arrayBuffer());

          const { data: upData, error: upErr } = await supabase.storage
            .from('ktp-documents')
            .upload(fileName, buffer, { contentType: memberKtpFile.type || 'image/jpeg', upsert: true });

          if (!upErr && upData) {
            member_ktp_path = upData.path;
          }
        }
      }

      insertPayload.push({
        property_id,
        room_number,
        entry_date,
        household_id,
        name: occ.name,
        phone: (occ.phone || (index === 0 ? (formData.get('phone') as string) : '')).trim(),
        address_ktp: occ.address_ktp || occ.address || (formData.get('address_ktp') as string) || '',
        relation: occ.relation || (index === 0 ? 'Penanggung Jawab' : 'Anggota'),
        is_head: index === 0,
        birth_date: occ.birth_date || (index === 0 ? (formData.get('birth_date') as string) : null),
        marital_status: index === 0 ? marital_status : (occ.marital_status || 'Belum Menikah'),
        occupation: index === 0 ? occupation : (occ.occupation || ''),
        rent_price: index === 0 ? rent_price : 0,
        payment_status: 'UNPAID',
        ktp_path: member_ktp_path,
        marriage_doc_url: index === 0 ? marriage_doc_url : null,
        status: 'PENDING',
      });
    }

    const { data, error } = await supabase.from('tenants').insert(insertPayload).select();

    if (error) {
      return { success: false, data: [], household_id: '', registered_at: '', error: 'Gagal menyimpan data: ' + error.message };
    }

    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
      revalidatePath('/portal-warga');
    } catch (e) {}

    return { success: true, data: data || [], household_id, registered_at, error: undefined };
  } catch (err: any) {
    return { success: false, data: [], household_id: '', registered_at: '', error: err?.message || 'Terjadi kesalahan teknis.' };
  }
}

export async function uploadPendingDocument(tenantId: string, docType: 'marriage' | 'ktp', formData: FormData) {
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return { success: false, error: 'Berkas tidak valid.' };
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${docType}_susulan_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('ktp-documents')
    .upload(fileName, buffer, { contentType: file.type || 'image/jpeg', upsert: true });

  if (uploadErr || !uploadData) {
    return { success: false, error: 'Gagal mengunggah dokumen: ' + uploadErr?.message };
  }

  const updateField = docType === 'marriage' ? { marriage_doc_url: uploadData.path } : { ktp_path: uploadData.path };
  const { error: dbErr } = await supabase.from('tenants').update(updateField).eq('id', tenantId);

  if (dbErr) return { success: false, error: dbErr.message };

  try {
    revalidatePath('/portal-warga');
    revalidatePath('/owner');
    revalidatePath('/rt');
  } catch (e) {}

  return { success: true, path: uploadData.path };
}

export async function updateTenantPaymentStatus(tenantId: string, payment_status: 'PAID' | 'UNPAID') {
  const { error } = await supabase
    .from('tenants')
    .update({ payment_status })
    .eq('id', tenantId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/portal-warga');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function updateTenantStatus(tenantId: string, status: 'active' | 'checked_out' | 'verified') {
  const finalStatus = status === 'active' || status === 'verified' ? 'VERIFIED' : status.toUpperCase();
  const { error } = await supabase
    .from('tenants')
    .update({ status: finalStatus })
    .eq('id', tenantId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
      revalidatePath('/portal-warga');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function updateTenantData(
  tenantId: string,
  payload: {
    name?: string;
    phone?: string;
    room_number?: string;
    relation?: string;
    rent_price?: number;
  }
) {
  const { error } = await supabase
    .from('tenants')
    .update(payload)
    .eq('id', tenantId);

  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
      revalidatePath('/portal-warga');
    } catch (e) {}
  }

  return { success: !error, error: error?.message };
}

export async function deleteTenant(tenantId: string) {
  const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
  if (!error) {
    try {
      revalidatePath('/owner');
      revalidatePath('/rt');
      revalidatePath('/portal-warga');
    } catch (e) {}
  }
  return { success: !error, error: error?.message };
}

export async function updateHouseRules(propertyId: string, house_rules: string) {
  const { error } = await supabase
    .from('properties')
    .update({ house_rules })
    .eq('id', propertyId);

  return { success: !error, error: error?.message };
}

export async function getTenantKtpUrl(filePath: string) {
  if (!filePath) return { success: false, error: 'Path berkas kosong.' };
  const cleanPath = filePath.replace(/^ktp-documents\//, '');
  const { data, error } = await supabase.storage.from('ktp-documents').createSignedUrl(cleanPath, 60);

  if (error || !data?.signedUrl) return { success: false, error: 'Gagal membuat signed URL berkas.' };
  return { success: true, url: data.signedUrl };
}
