'use server';

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

export async function uploadAndWatermarkKTP(formData: FormData) {
  try {
    const file = (formData.get('ktp') || formData.get('file')) as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return { error: 'File KTP tidak ditemukan.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const resizedBuffer = await sharp(buffer)
      .resize(800, undefined, { fit: 'inside' })
      .toBuffer();

    const metadata = await sharp(resizedBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 500;

    const svgWatermark = Buffer.from(
      '<svg width="' + width + '" height="' + height + '">' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="' + Math.round(width * 0.035) + '" font-weight="bold" fill="rgba(220, 38, 38, 0.45)" transform="rotate(-20 ' + (width / 2) + ' ' + (height / 2) + ')">DOKUMEN RT - UU PDP COMPLIANT</text>' +
      '<rect x="' + Math.round(width * 0.2) + '" y="' + Math.round(height * 0.18) + '" width="' + Math.round(width * 0.6) + '" height="' + Math.round(height * 0.12) + '" fill="black" opacity="0.95"/>' +
      '<text x="' + Math.round(width * 0.5) + '" y="' + Math.round(height * 0.24) + '" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="' + Math.round(width * 0.022) + '" fill="white" font-weight="bold">[NIK DILINDUNGI UU PDP]</text>' +
      '</svg>'
    );

    const processedImageBuffer = await sharp(resizedBuffer)
      .composite([{ input: svgWatermark, top: 0, left: 0 }])
      .jpeg({ quality: 80 })
      .toBuffer();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const fileName = 'private_ktp_' + Date.now() + '.jpg';

        const { data, error } = await supabase.storage
          .from('ktp-documents')
          .upload(fileName, processedImageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!error && data) {
          const { data: signedData, error: signedErr } = await supabase.storage
            .from('ktp-documents')
            .createSignedUrl(data.path, 60);

          if (!signedErr && signedData) {
            return {
              url: signedData.signedUrl,
              path: data.path,
              expiresIn: 60,
              isPrivateSigned: true,
              source: 'Supabase Storage (Signed URL)'
            };
          }
        } else if (error) {
          console.error('Supabase Storage Upload Error:', error.message);
        }
      } catch (e) {
        console.error('Supabase Client Error:', e);
      }
    }

    // Fallback lokal dengan simulasi Signed URL
    const base64Image = processedImageBuffer.toString('base64');
    return {
      url: 'data:image/jpeg;base64,' + base64Image,
      path: 'local-mock-path-' + Date.now(),
      expiresIn: 60,
      isPrivateSigned: false,
      source: 'Local Fallback (Simulasi Signed URL)'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses gambar.';
    return { error: msg };
  }
}
