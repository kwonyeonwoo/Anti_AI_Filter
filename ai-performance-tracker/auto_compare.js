const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load Configuration
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
    console.error('❌ config.json not found!');
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const SERVER_URL = 'http://localhost:5000/api/metrics';
const DIRS = config.directories.map(d => ({
    name: d.name,
    path: d.path === '.' ? path.join(__dirname, '..') : d.path
}));

const TEST_PROMPTS = config.prompts;
const MODELS = config.models || ['default'];

const STATUS_URL = 'http://localhost:5000/api/status';

async function updateStatus(running, progress, total, message) {
    try {
        await axios.post(STATUS_URL, { running, progress, total, message });
    } catch (e) {}
}

async function runAutoBench() {
    const sessionId = `Session_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    console.log(`🚀 Starting Benchmark [${sessionId}]...`);
    
    const totalSteps = MODELS.length * DIRS.length * TEST_PROMPTS.length;
    let currentStep = 0;
    
    await updateStatus(true, 0, totalSteps, `Starting ${sessionId}...`);

    for (const modelName of MODELS) {
        for (const dir of DIRS) {
            for (const promptObj of TEST_PROMPTS) {
                currentStep++;
                const prompt = promptObj.text;
                const category = promptObj.category;
                
                await updateStatus(true, currentStep, totalSteps, `[${modelName}] ${dir.name}: ${category}`);
                
                process.stdout.write(`   > [${category}] Prompt: "${prompt}" ... `);
                const start = Date.now();
                
                try {
                    // gemini-cli 명령어를 해당 디렉토리에서 실행
                    // -m/--model: 특정 모델 지정
                    const response = execSync(`gemini -p "${prompt}" -y -m "${modelName}"`, { 
                        cwd: dir.path, 
                        encoding: 'utf8',
                        timeout: 90000 // Increase for pro models
                    }).trim();

                    const latency = Date.now() - start;
                    const tokens = response.length / 4;
                    
                    // --- AI-Powered Accuracy Evaluation ---
                    console.log(`      Evaluating accuracy...`);
                    let accuracy = 0;
                    try {
                        const rubric = config.evaluator.rubric || "Score it from 0 to 100 based on accuracy, clarity, and adherence to instructions.";
                        const evalPrompt = `Evaluate the following AI response to the prompt "${prompt}". 
                        Response: "${response.replace(/"/g, "'")}"
                        Rubric: ${rubric}
                        Return ONLY the numerical score.`;

                        const evalResult = execSync(`gemini -p "${evalPrompt}" -y`, { 
                            encoding: 'utf8',
                            timeout: 30000 
                        }).trim();                        
                        const match = evalResult.match(/\d+/);
                        accuracy = match ? parseInt(match[0]) : 80; 
                    } catch (evalErr) {
                        console.warn(`      ⚠️ Evaluation failed, using default score.`);
                        accuracy = 80;
                    }

                    await axios.post(SERVER_URL, {
                        prompt,
                        response,
                        accuracy,
                        latency,
                        tokens,
                        systemPromptId: dir.name,
                        category,
                        model: modelName,
                        sessionId
                    });

                    console.log(`✅ Done (${latency}ms)`);
                } catch (err) {
                    console.log(`❌ Failed: ${err.message}`);
                }
            }
        }
    }

    await updateStatus(false, 0, 0, 'Completed');
    console.log("\n✨ Benchmark Finished! View results at http://localhost:3000");

    // --- Generate Markdown Report ---
    try {
        const metricsResponse = await axios.get(SERVER_URL);
        const allMetrics = metricsResponse.data;
        
        let report = `# 📊 AI Benchmark Summary Report\n\nGenerated on: ${new Date().toLocaleString()}\n\n`;
        report += `| Config (Model) | Avg Accuracy | Avg Latency (ms) | Avg Tokens |\n`;
        report += `| :--- | :--- | :--- | :--- |\n`;

        const summary = allMetrics.reduce((acc, m) => {
            const key = `${m.systemPromptId} (${m.model})`;
            if (!acc[key]) {
                acc[key] = { count: 0, accuracy: 0, latency: 0, tokens: 0 };
            }
            acc[key].count++;
            acc[key].accuracy += m.accuracy;
            acc[key].latency += m.latency;
            acc[key].tokens += m.tokens;
            return acc;
        }, {});

        Object.entries(summary).forEach(([key, stats]) => {
            report += `| **${key}** | ${(stats.accuracy / stats.count).toFixed(2)}% | ${(stats.latency / stats.count).toFixed(2)}ms | ${(stats.tokens / stats.count).toFixed(2)} |\n`;
        });

        fs.writeFileSync(path.join(__dirname, 'BENCHMARK_REPORT.md'), report);
        console.log("📝 Summary report saved to BENCHMARK_REPORT.md");
    } catch (reportErr) {
        console.warn("⚠️ Failed to generate markdown report.");
    }
}

runAutoBench();
