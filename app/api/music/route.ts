import { NextResponse } from 'next/server';

// TheAudioDB API URL (using test key '1', replace with your own key later)
const API_BASE_URL = 'https://theaudiodb.com/api/v1/json/1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query'); // Search term (artist name or song title)

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    // Search for the artist based on the song/artist name
    const searchUrl = `${API_BASE_URL}/search.php?s=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: response.status });
    }

    const data = await response.json();

    if (data.artists && data.artists.length > 0) {
      const artist = data.artists[0];
      
      // Fetch albums for this artist to get album art
      const albumUrl = `${API_BASE_URL}/searchalbum.php?s=${encodeURIComponent(artist.strArtist)}`;
      const albumResponse = await fetch(albumUrl);
      const albumData = await albumResponse.json();

      // Prepare the response with relevant images
      const musicData = {
        artistName: artist.strArtist,
        artistThumb: artist.strArtistThumb, // Artist thumbnail image
        artistFanart: artist.strArtistFanart, // High-res artist background
        albums: (albumData.album || []).map((album: any) => ({
          title: album.strAlbum,
          year: album.intYearReleased,
          thumb: album.strAlbumThumb, // Album cover thumbnail
        })),
      };

      return NextResponse.json(musicData);
    } else {
      // If no artist found, return a placeholder or fallback
      return NextResponse.json({ 
        artistThumb: null, 
        albums: [],
        message: 'No artist found. Try a different search.'
      });
    }

  } catch (error) {
    console.error('Error fetching from TheAudioDB:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
