import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { updateArtist } from '@/lib/db';

// POST /api/artists/cover — プロフィールカバー画像アップロード
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filePath = `covers/${payload.artistId}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await updateArtist(payload.artistId, { cover_url: coverUrl });

    return NextResponse.json({ success: true, cover_url: coverUrl });
  } catch (e) {
    console.error('Cover upload error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
