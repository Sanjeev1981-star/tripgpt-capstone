require('dotenv').config();
const { fetchWikivoyageArticle, searchCityKnowledge, getCityTravelTips } = require('../services/ragService');

async function testRAG() {
    console.log('🧪 Testing RAG Service...\n');

    // Test 1: Fetch article
    console.log('📖 Test 1: Fetching Wikivoyage article for Paris...');
    const article = await fetchWikivoyageArticle('Paris');
    if (article) {
        console.log(`✅ Success! Found ${article.sections.length} sections`);
        console.log(`   Title: ${article.title}`);
        console.log(`   URL: ${article.url}`);
        console.log(`   Sample sections: ${article.sections.slice(0, 3).map(s => s.title).join(', ')}\n`);
    } else {
        console.log('❌ Failed to fetch article\n');
    }

    // Test 2: Search for specific knowledge
    console.log('🔍 Test 2: Searching for "safety" information in Paris...');
    const knowledge = await searchCityKnowledge('Paris', 'safety');
    if (knowledge.length > 0) {
        console.log(`✅ Found ${knowledge.length} relevant sections`);
        knowledge.forEach((k, i) => {
            console.log(`   ${i + 1}. ${k.title} (relevance: ${k.relevance})`);
            console.log(`      ${k.content.substring(0, 100)}...`);
        });
        console.log();
    } else {
        console.log('❌ No knowledge found\n');
    }

    // Test 3: Get travel tips
    console.log('💡 Test 3: Getting travel tips for Tokyo...');
    const tips = await getCityTravelTips('Tokyo');
    console.log(`   Source: ${tips.source}`);
    console.log(`   URL: ${tips.url}`);
    if (tips.safety) console.log(`   ✓ Safety info available`);
    if (tips.etiquette) console.log(`   ✓ Etiquette info available`);
    if (tips.practical) console.log(`   ✓ Practical info available`);
    if (tips.climate) console.log(`   ✓ Climate info available`);
    console.log();

    console.log('✨ RAG Service test complete!');
}

testRAG().catch(console.error);
