// scripts/test-gemini.ts
import { getAIProvider } from '../services/ai/provider';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testGemini() {
  console.log('🧠 Testing Gemini AI...');
  console.log('📝 API Key present:', !!process.env.GEMINI_API_KEY);
  
  const aiProvider = getAIProvider();

  try {
    console.log('📊 Sending test request...');
    const result = await aiProvider.generateRecommendations({
      userId: 'test-user',
      userTasteProfile: {
        genreAffinities: {
          'Action': 0.9,
          'Sci-Fi': 0.8,
          'Drama': 0.7,
          'Comedy': 0.3
        },
        mood_preferences: ['mind-bending', 'action-packed']
      },
      watchHistory: [],
      limit: 5,
    });

    console.log('✅ Gemini Response:');
    console.log('📊 Recommendations:', result.recommendations.length);
    console.log('📊 Metadata:', result.metadata);
    
    if (result.recommendations.length > 0) {
      console.log('🎉 Gemini is working!');
      console.log('📝 First recommendation:', JSON.stringify(result.recommendations[0], null, 2));
    } else {
      console.log('⚠️ Gemini returned no recommendations');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGemini();
