const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, '../data/metrics.json');

app.use(cors());
app.use(bodyParser.json());

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Initialize metrics file if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

let currentStatus = { running: false, progress: 0, total: 0, message: 'Idle' };

const { execSync } = require('child_process');

// Load Configuration for Live Playground
const getConfig = () => {
    const configPath = path.join(__dirname, '../config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

app.get('/api/config', (req, res) => {
    const configPath = path.join(__dirname, '../config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.json(config);
});

app.post('/api/config', (req, res) => {
    const configPath = path.join(__dirname, '../config.json');
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Configuration updated' });
});

app.post('/api/run-live', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const config = getConfig();
    const results = [];

    for (const model of config.models) {
        for (const dir of config.directories) {
            const dirPath = dir.path === '.' ? path.join(__dirname, '../..') : dir.path;
            const start = Date.now();
            try {
                const response = execSync(`gemini -p "${prompt}" -y -m "${model}"`, { 
                    cwd: dirPath, 
                    encoding: 'utf8',
                    timeout: 60000 
                }).trim();
                
                results.push({
                    config: `${dir.name} (${model})`,
                    response,
                    latency: Date.now() - start,
                    tokens: Math.ceil(response.length / 4)
                });
            } catch (err) {
                results.push({
                    config: `${dir.name} (${model})`,
                    response: `Error: ${err.message}`,
                    latency: Date.now() - start,
                    tokens: 0
                });
            }
        }
    }
    res.json(results);
});

app.get('/api/status', (req, res) => {
    res.json(currentStatus);
});

app.post('/api/status', (req, res) => {
    currentStatus = { ...currentStatus, ...req.body };
    res.json(currentStatus);
});

app.get('/api/metrics', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
});

app.delete('/api/metrics', (req, res) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    res.status(200).json({ message: 'Metrics cleared' });
});

app.get('/api/sessions', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const sessions = [...new Set(data.map(m => m.sessionId))].sort().reverse();
    res.json(sessions);
});

app.post('/api/metrics', (req, res) => {
    const { prompt, response, accuracy, latency, tokens, systemPromptId, category, model, sessionId } = req.body;
    
    const newMetric = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        prompt,
        response,
        accuracy: parseFloat(accuracy) || 0,
        latency: parseFloat(latency) || 0,
        tokens: parseInt(tokens) || 0,
        systemPromptId: systemPromptId || 'default',
        category: category || 'General',
        model: model || 'default',
        sessionId: sessionId || 'manual'
    };

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data.push(newMetric);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.status(201).json(newMetric);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
