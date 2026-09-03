// scripts/test-gemini.ts
import { getAIProvider } from '../services/ai/provider';

async function testGemini() {
  console.log('🧠 Testing Gemini AI...');
  
  const aiProvider = getAIProvider();

  try {
    const result = await aiProvider.generateRecommendations({
      userId: 'test-user',
      userTasteProfile: {
        genreAffinities: {
          'Action': 0.9,
          'Sci-Fi': 0.8,
          'Drama': 0.7,
          'Comedy': 0.3
        }
      },
      watchHistory: [],
      limit: 3,
    });

    console.log('✅ Gemini Response:', JSON.stringify(result, null, 2));
    
    if (result.recommendations.length > 0) {
      console.log('🎉 Gemini is working!');
    } else {
      console.log('⚠️ Gemini returned no recommendations');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testGemini();
