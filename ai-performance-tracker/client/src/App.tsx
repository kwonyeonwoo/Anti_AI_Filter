import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

interface Metric {
  id: number;
  timestamp: string;
  prompt: string;
  response: string;
  accuracy: number;
  latency: number;
  tokens: number;
  systemPromptId: string;
  category: string;
  model: string;
  sessionId: string;
}

interface Status {
  running: boolean;
  progress: number;
  total: number;
  message: string;
}

function App() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [status, setStatus] = useState<Status>({ running: false, progress: 0, total: 0, message: 'Idle' });
  const [sessions, setSessions] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('All');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [configJson, setConfigJson] = useState<string>('');

  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [livePrompt, setLivePrompt] = useState<string>('');
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isLiveRunning, setIsLiveRunning] = useState<boolean>(false);

  useEffect(() => {
    fetchMetrics();
    fetchStatus();
    fetchSessions();
    fetchConfig();
    const interval = setInterval(() => {
      fetchMetrics();
      fetchStatus();
      fetchSessions();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sessions');
      setSessions(response.data);
    } catch (e) {}
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/config');
      setConfigJson(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/status');
      setStatus(response.data);
    } catch (e) {}
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const filteredMetrics = selectedSession === 'All' 
    ? metrics 
    : metrics.filter(m => m.sessionId === selectedSession);

  const saveConfig = async () => {
    try {
      const parsedConfig = JSON.parse(configJson);
      await axios.post('http://localhost:5000/api/config', parsedConfig);
      alert('Configuration saved successfully!');
    } catch (error) {
      alert('Invalid JSON format or server error');
    }
  };

  const clearMetrics = async () => {
    if (window.confirm('Are you sure you want to clear all data?')) {
      try {
        await axios.delete('http://localhost:5000/api/metrics');
        setMetrics([]);
      } catch (error) {
        console.error('Error clearing metrics:', error);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'SystemPromptId', 'Category', 'Model', 'Prompt', 'Response', 'Accuracy', 'Latency', 'Tokens'];
    const rows = filteredMetrics.map(m => [
      m.timestamp,
      m.systemPromptId,
      m.category,
      m.model,
      `"${m.prompt.replace(/"/g, '""')}"`,
      `"${m.response.replace(/"/g, '""')}"`,
      m.accuracy,
      m.latency,
      m.tokens
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ai_performance_metrics_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSummaryStats = () => {
    return Object.entries(
      filteredMetrics.reduce((acc, m) => {
        const key = `${m.systemPromptId} (${m.model})`;
        if (!acc[key]) {
          acc[key] = { count: 0, accuracy: 0, latency: 0, tokens: 0, id: m.systemPromptId, model: m.model };
        }
        acc[key].count++;
        acc[key].accuracy += m.accuracy;
        acc[key].latency += m.latency;
        acc[key].tokens += m.tokens;
        return acc;
      }, {} as Record<string, any>)
    ).map(([key, stats]: [string, any]) => ({
      key,
      id: stats.id,
      model: stats.model,
      accuracy: (stats.accuracy / stats.count).toFixed(2),
      latency: (stats.latency / stats.count).toFixed(2),
      tokens: (stats.tokens / stats.count).toFixed(2),
    }));
  };

  const getCategoryStats = () => {
    const categories = filteredMetrics.reduce((acc, m) => {
      const key = `${m.systemPromptId} (${m.model}) - ${m.category}`;
      if (!acc[key]) {
        acc[key] = { id: m.systemPromptId, model: m.model, category: m.category, count: 0, accuracy: 0 };
      }
      acc[key].count++;
      acc[key].accuracy += m.accuracy;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(categories).map((c: any) => ({
      name: `${c.id} (${c.model}) - ${c.category}`,
      accuracy: (c.accuracy / c.count).toFixed(2),
    }));
  };

  const getOptimizationInsights = () => {
    if (filteredMetrics.length === 0) return null;
    const stats = getSummaryStats();
    if (stats.length === 0) return null;
    const bestAccuracy = [...stats].sort((a, b) => parseFloat(b.accuracy) - parseFloat(a.accuracy))[0];
    const bestLatency = [...stats].sort((a, b) => parseFloat(a.latency) - parseFloat(b.latency))[0];
    const bestEfficiency = [...stats].sort((a, b) => (parseFloat(b.accuracy) / parseFloat(b.tokens)) - (parseFloat(a.accuracy) / parseFloat(a.tokens)))[0];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#eef2ff', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #4f46e5' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5', fontSize: '1rem' }}>🎯 Best for Accuracy</h3>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem' }}>{bestAccuracy.id}</p>
          <span style={{ fontSize: '0.9rem', color: '#6366f1' }}>Model: {bestAccuracy.model} | Score: {bestAccuracy.accuracy}%</span>
        </div>
        <div style={{ background: '#ecfdf5', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #10b981' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#059669', fontSize: '1rem' }}>⚡ Best for Speed</h3>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem' }}>{bestLatency.id}</p>
          <span style={{ fontSize: '0.9rem', color: '#10b981' }}>Model: {bestLatency.model} | Time: {bestLatency.latency}ms</span>
        </div>
        <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #f59e0b' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#d97706', fontSize: '1rem' }}>💰 Most Cost-Efficient</h3>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem' }}>{bestEfficiency.id}</p>
          <span style={{ fontSize: '0.9rem', color: '#f59e0b' }}>Model: {bestEfficiency.model} | Acc/Token Optimized</span>
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    const stats = getSummaryStats();
    const configA = stats.find(s => s.key === compareA);
    const configB = stats.find(s => s.key === compareB);

    if (!configA || !configB) return <p style={{ color: '#666', fontStyle: 'italic' }}>Select two configurations to compare...</p>;

    const getDiff = (valA: string, valB: string, higherIsBetter: boolean = true) => {
      const a = parseFloat(valA);
      const b = parseFloat(valB);
      if (b === 0) return null;
      const diff = a - b;
      const percent = ((diff / b) * 100).toFixed(1);
      const color = (diff > 0 === higherIsBetter) ? '#166534' : '#991b1b';
      return <span style={{ color, marginLeft: '10px', fontSize: '0.85rem', fontWeight: 'bold' }}>
        {diff > 0 ? '+' : ''}{percent}% {diff > 0 === higherIsBetter ? '▲' : '▼'}
      </span>;
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {[configA, configB].map((c, idx) => (
          <div key={idx} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>{c.key}</h4>
            <div style={{ marginBottom: '10px' }}>
              <strong>Accuracy:</strong> {c.accuracy}% {idx === 0 ? getDiff(c.accuracy, configB.accuracy) : getDiff(c.accuracy, configA.accuracy)}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Latency:</strong> {c.latency}ms {idx === 0 ? getDiff(c.latency, configB.latency, false) : getDiff(c.latency, configA.latency, false)}
            </div>
            <div>
              <strong>Avg Tokens:</strong> {c.tokens} {idx === 0 ? getDiff(c.tokens, configB.tokens, false) : getDiff(c.tokens, configA.tokens, false)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResponseMatrix = () => {
    const uniquePrompts = [...new Set(filteredMetrics.map(m => m.prompt))];
    const uniqueConfigs = [...new Set(filteredMetrics.map(m => `${m.systemPromptId} (${m.model})`))];

    return (
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '40px', overflowX: 'auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '25px' }}>Side-by-Side Response Matrix</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ border: '1px solid #e2e8f0', padding: '12px', width: '250px' }}>Prompt</th>
              {uniqueConfigs.map(config => (
                <th key={config} style={{ border: '1px solid #e2e8f0', padding: '12px' }}>{config}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniquePrompts.map(prompt => (
              <tr key={prompt}>
                <td style={{ border: '1px solid #e2e8f0', padding: '12px', fontSize: '0.9rem', verticalAlign: 'top', background: '#fcfcfc' }}>
                  <strong>{prompt}</strong>
                </td>
                {uniqueConfigs.map(config => {
                  const metric = filteredMetrics.find(m => m.prompt === prompt && `${m.systemPromptId} (${m.model})` === config);
                  if (!metric) return <td key={config} style={{ border: '1px solid #e2e8f0', padding: '12px', color: '#ccc', textAlign: 'center' }}>N/A</td>;
                  
                  const isLowAccuracy = metric.accuracy < 90;
                  const isHighLatency = metric.latency > 10000;

                  return (
                    <td key={config} style={{ border: '1px solid #e2e8f0', padding: '12px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#64748b' }}>
                        <span style={{ color: isLowAccuracy ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{metric.accuracy}%</span> | 
                        <span style={{ color: isHighLatency ? '#ef4444' : '#64748b' }}> {metric.latency}ms</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', background: '#f1f5f9', padding: '8px', borderRadius: '4px' }}>
                        {metric.response}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const runLiveTest = async () => {
    if (!livePrompt) return;
    setIsLiveRunning(true);
    try {
      const response = await axios.post('http://localhost:5000/api/run-live', { prompt: livePrompt });
      setLiveResults(response.data);
    } catch (error) {
      console.error('Live test failed:', error);
    } finally {
      setIsLiveRunning(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', maxWidth: '1400px', margin: '0 auto', background: '#fafafa', minHeight: '100vh' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center', position: 'relative' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#333' }}>AI Performance Dashboard</h1>
        <p style={{ color: '#666' }}>Comparing Models & System Prompts in Real-time</p>
        <div style={{ position: 'absolute', left: 0, top: '10px', display: 'flex', gap: '10px' }}>
            <button 
                onClick={() => setShowSettings(!showSettings)}
                style={{ padding: '10px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                {showSettings ? '🔙 Back to Stats' : '⚙️ Settings'}
            </button>
        </div>
        <div style={{ position: 'absolute', right: 0, top: '10px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={exportToCSV}
            style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Export CSV
          </button>
          <button 
            onClick={clearMetrics}
            style={{ padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Data
          </button>
        </div>
      </header>

      {showSettings ? (
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>⚙️ System Configuration</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>Edit `config.json` directly below. Update models, directories, prompts, and SLA targets.</p>
          <textarea 
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            style={{ width: '100%', height: '500px', padding: '15px', fontFamily: 'monospace', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button 
                onClick={saveConfig}
                style={{ padding: '12px 30px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                Save Configuration
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>📂 Historical Session:</span>
            <select 
              value={selectedSession} 
              onChange={(e) => setSelectedSession(e.target.value)}
              style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', flex: 1 }}
            >
              <option value="All">All Sessions (Global Trend)</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>⚡ Live Playground</h2>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <input 
                type="text" 
                value={livePrompt} 
                onChange={(e) => setLivePrompt(e.target.value)}
                placeholder="Enter a prompt to test across all environments..."
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              />
              <button 
                onClick={runLiveTest} 
                disabled={isLiveRunning}
                style={{ padding: '0 30px', background: isLiveRunning ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isLiveRunning ? 'Running...' : 'Run Test'}
              </button>
            </div>
            
            {liveResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {liveResults.map((res, idx) => (
                  <div key={idx} style={{ padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#4f46e5' }}>{res.config}</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', minHeight: '100px', whiteSpace: 'pre-wrap' }}>{res.response}</div>
                    <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                      Latency: <strong>{res.latency}ms</strong> | Tokens: <strong>{res.tokens}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status.running && (
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '30px', border: '1px solid #4f46e5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#4f46e5' }}>🚀 Benchmark in Progress...</span>
                <span style={{ color: '#666' }}>{status.progress} / {status.total} ({Math.round((status.progress / status.total) * 100)}%)</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ width: `${(status.progress / status.total) * 100}%`, height: '100%', background: '#4f46e5', transition: 'width 0.5s ease' }}></div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                <strong>Current:</strong> {status.message}
              </div>
            </div>
          )}

          {getOptimizationInsights()}

          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Head-to-Head Comparison</h2>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <select value={compareA} onChange={(e) => setCompareA(e.target.value)} style={{ padding: '10px', borderRadius: '6px', flex: 1, border: '1px solid #cbd5e1' }}>
                <option value="">Select Config A</option>
                {getSummaryStats().map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
              </select>
              <div style={{ alignSelf: 'center', fontWeight: 'bold', color: '#64748b' }}>VS</div>
              <select value={compareB} onChange={(e) => setCompareB(e.target.value)} style={{ padding: '10px', borderRadius: '6px', flex: 1, border: '1px solid #cbd5e1' }}>
                <option value="">Select Config B</option>
                {getSummaryStats().map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
              </select>
            </div>
            {renderComparison()}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px', marginBottom: '40px' }}>
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Accuracy by Category & Model (%)</h2>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getCategoryStats()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={180} style={{ fontSize: '0.7rem' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="accuracy" fill="#6366f1" radius={[0, 4, 4, 0]} name="Avg Accuracy" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Latency Distribution (ms)</h2>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredMetrics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="id" hide />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="latency" fill="#10b981" radius={[4, 4, 0, 0]} name="Response Time" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', gridColumn: 'span 2' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Efficiency: Latency vs Tokens</h2>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="latency" name="Latency" unit="ms" />
                    <YAxis type="number" dataKey="tokens" name="Tokens" />
                    <ZAxis type="category" dataKey="systemPromptId" name="Config" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Execution Points" data={filteredMetrics} fill="#f59e0b" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '25px' }}>Comparison Summary Table</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ borderBottom: '2px solid #e2e8f0', padding: '15px 10px' }}>System Prompt ID</th>
                  <th style={{ borderBottom: '2px solid #e2e8f0', padding: '15px 10px' }}>Avg Accuracy</th>
                  <th style={{ borderBottom: '2px solid #e2e8f0', padding: '15px 10px' }}>Avg Latency</th>
                  <th style={{ borderBottom: '2px solid #e2e8f0', padding: '15px 10px' }}>Avg Tokens</th>
                </tr>
              </thead>
              <tbody>
                {getSummaryStats().map((stats) => (
                  <tr key={stats.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#1e293b' }}>{stats.key}</td>
                    <td style={{ padding: '15px 10px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>
                        {stats.accuracy}%
                      </span>
                    </td>
                    <td style={{ padding: '15px 10px', color: '#64748b' }}>{stats.latency}ms</td>
                    <td style={{ padding: '15px 10px', color: '#64748b' }}>{stats.tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderResponseMatrix()}

          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '25px' }}>Detailed Interaction Log</h2>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {filteredMetrics.slice().reverse().map((m) => (
                <div key={m.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '20px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#4f46e5' }}>[{m.systemPromptId}]</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(m.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#1e293b' }}>Q:</strong> <span style={{ color: '#475569' }}>{m.prompt}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #e2e8f0' }}>
                    <strong style={{ color: '#1e293b' }}>A:</strong> <pre style={{ whiteSpace: 'pre-wrap', margin: '5px 0 0 0', color: '#334155', fontSize: '0.9rem' }}>{m.response}</pre>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b' }}>
                    Score: <span style={{ color: '#166534', fontWeight: 'bold' }}>{m.accuracy}%</span> | 
                    Latency: <strong>{m.latency}ms</strong> | 
                    Tokens: <strong>{m.tokens}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
