const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:5000/api/metrics';
const TEST_PROMPTS = [
    "Explain the concept of React hooks.",
    "Write a function to find the factorial of a number in JavaScript.",
    "What are the benefits of using TypeScript over JavaScript?"
];

async function runBenchmark(systemPromptId, systemPromptContent) {
    console.log(`--- Running Benchmark for: ${systemPromptId} ---`);
    
    // 1. Set the system prompt (Update GEMINI.md in the current dir for the test)
    // Note: In a real scenario, this script would run in a separate workspace
    // or use a specific policy file.
    const geminiMdPath = path.join(__dirname, '../GEMINI.md');
    const originalContent = fs.existsSync(geminiMdPath) ? fs.readFileSync(geminiMdPath, 'utf8') : '';
    
    fs.writeFileSync(geminiMdPath, `# System Prompt: ${systemPromptId}\n\n${systemPromptContent}`);

    for (const prompt of TEST_PROMPTS) {
        console.log(`Prompt: ${prompt}`);
        
        const start = Date.now();
        
        // This is a placeholder for running the actual CLI.
        // Since we are INSIDE the CLI, we might need to use a different approach.
        // For demonstration, we simulate the CLI response or use a specific command.
        // In a real comparison, the user would run this script against different CLI installations.
        
        // Mocking for now as we can't easily trigger the parent CLI binary synchronously 
        // with a new system prompt state without a fresh session.
        const response = `Simulated response for ${systemPromptId}: ${prompt}`;
        const latency = Date.now() - start;
        const tokens = response.length / 4; // Rough estimate
        
        // For accuracy, we could use an 'Evaluator' agent or manual input.
        // Here we simulate an evaluator giving a score between 70-100.
        const accuracy = Math.floor(Math.random() * 30) + 70;

        await axios.post(SERVER_URL, {
            prompt,
            response,
            accuracy,
            latency,
            tokens,
            systemPromptId
        });
        
        console.log(`Logged: Latency ${latency}ms, Accuracy ${accuracy}%`);
    }

    // Restore original GEMINI.md
    fs.writeFileSync(geminiMdPath, originalContent);
}

async function start() {
    try {
        await runBenchmark('Config_A', 'You are a concise assistant.');
        await runBenchmark('Config_B', 'You are a detailed and verbose assistant.');
        console.log('Benchmark completed! Check the dashboard at http://localhost:3000');
    } catch (error) {
        console.error('Benchmark failed:', error.message);
    }
}

start();
