// scripts/test-tmdb.ts
import { TMDBClient } from '../services/tmdb/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testTMDB() {
  console.log('🔑 Testing TMDB API...');
  
  const client = new TMDBClient();

  try {
    console.log('\n📊 Getting trending movies...');
    const trending = await client.getTrendingMovies('week');
    console.log(`✅ Found ${trending.results.length} movies`);
    console.log(`Top 3: ${trending.results.slice(0, 3).map((m: any) => m.title).join(', ')}`);

    console.log('\n🔍 Searching for "Inception"...');
    const search = await client.searchMovies('Inception');
    console.log(`✅ Found "${search.results[0]?.title}"`);

    console.log('\n🎬 Getting movie details...');
    const details = await client.getMovieDetails(27205);
    console.log(`✅ ${details.title} (${details.release_date})`);
    console.log(`   Rating: ${details.vote_average}/10`);
    console.log(`   Runtime: ${details.runtime} min`);
    console.log(`   Genres: ${details.genres?.map((g: any) => g.name).join(', ')}`);

    console.log('\n🎉 TMDB API is working!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testTMDB();
