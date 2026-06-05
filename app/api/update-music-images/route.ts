import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges (use Server Client in production)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Add this to your .env.local
);

export async function POST() {
  // Fetch all music entries that lack a proper image_url
  const { data: musicItems, error } = await supabaseAdmin
    .from('content')
    .select('id, title, artist')
    .eq('type', 'music')
    .is('image_url', null); // Or .like('image_url', '%placeholder%')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updatedCount = 0;

  for (const item of musicItems || []) {
    const searchTerm = item.artist || item.title;
    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/music?query=${encodeURIComponent(searchTerm)}`;
    
    const res = await fetch(apiUrl);
    const musicData = await res.json();

    if (musicData.artistThumb) {
      // Update the record with the correct image URL
      const { error: updateError } = await supabaseAdmin
        .from('content')
        .update({ 
          image_url: musicData.artistThumb,
          backdrop_url: musicData.artistFanart || musicData.artistThumb
        })
        .eq('id', item.id);

      if (!updateError) updatedCount++;
    }

    // Small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return NextResponse.json({ message: `Updated ${updatedCount} music items.` });
}
