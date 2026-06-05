// app/actions/deezer.ts
'use server'

export async function searchDeezerServer(query: string) {
  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Deezer Server Action Error:', error);
    return { success: false, error: 'Failed to search Deezer via Server' };
  }
}
