const axios = require('axios');

const args = process.argv.slice(2);
const params = {};

args.forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.split('=');
        params[key.slice(2)] = value;
    }
});

const { prompt, response, accuracy, latency, tokens, id } = params;

if (!prompt || !response) {
    console.error('Usage: node logger.js --prompt="question" --response="answer" --accuracy=90 --latency=1000 --tokens=200 --id="config_name"');
    process.exit(1);
}

axios.post('http://localhost:5000/api/metrics', {
    prompt,
    response,
    accuracy: parseFloat(accuracy) || 0,
    latency: parseFloat(latency) || 0,
    tokens: parseInt(tokens) || 0,
    systemPromptId: id || 'manual'
})
.then(() => console.log('Successfully logged to tracker.'))
.catch(err => console.error('Failed to log:', err.message));
