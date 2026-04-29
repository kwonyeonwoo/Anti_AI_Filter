const { execSync } = require('child_process');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Usage: node proxy.js "your question" [--model=...] [--category=...]
const args = process.argv.slice(2);
const query = args.find(a => !a.startsWith('--'));
const modelArg = args.find(a => a.startsWith('--model='))?.split('=')[1] || 'gemini-1.5-flash';
const categoryArg = args.find(a => a.startsWith('--category='))?.split('=')[1] || 'Real-Work';

if (!query) {
    console.error('Usage: node proxy.js "your prompt" [--model=...] [--category=...]');
    process.exit(1);
}

const SERVER_URL = 'http://localhost:5000/api/metrics';
const start = Date.now();

console.log(`🤖 Executing Gemini [${modelArg}]...`);

try {
    const response = execSync(`gemini -p "${query}" -y -m "${modelArg}"`, { 
        encoding: 'utf8' 
    }).trim();

    const latency = Date.now() - start;
    const tokens = Math.ceil(response.length / 4);

    console.log('--- Response ---');
    console.log(response);
    console.log('----------------');

    // Log to tracker
    axios.post(SERVER_URL, {
        prompt: query,
        response,
        accuracy: 100, // Manual flag for review later
        latency,
        tokens,
        systemPromptId: 'Production_Usage',
        category: categoryArg,
        model: modelArg,
        sessionId: 'Real_Time_Tracking'
    }).catch(e => console.warn('⚠️ Failed to log to metrics server.'));

    console.log(`✅ Logged: ${latency}ms`);
} catch (err) {
    console.error('❌ Execution failed:', err.message);
}
