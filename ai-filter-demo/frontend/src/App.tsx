import React, { useState, useRef } from 'react';
import { Upload, Shield, Download, Image as ImageIcon, RefreshCcw, Eye } from 'lucide-react';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [protectedPreview, setProtectedPreview] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number>(0.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<{orig: string, prot: string, origHeatmap: string, protHeatmap: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setOriginalPreview(URL.createObjectURL(selectedFile));
      setProtectedPreview(null);
      setAiAnalysis(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const applyFilter = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('intensity', intensity.toString());
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${API_URL}/protect`, { method: 'POST', body: formData });
      const data = await response.json();
      setProtectedPreview(data.image);
      setAiAnalysis({ orig: data.original_ai, prot: data.protected_ai, origHeatmap: data.original_heatmap, protHeatmap: data.protected_heatmap });
    } catch (error) { alert('Error. Is the backend running?'); } finally { setLoading(false); }
  };

  const downloadImage = () => {
    if (!protectedPreview) return;
    const link = document.createElement('a');
    link.href = protectedPreview;
    link.download = `protected_${file?.name || 'image.png'}`;
    link.click();
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo"><Shield size={32} color="#00ff88" /><h1>AI-Guard <span>v2.2</span></h1></div>
        <p>Professional AI-resistant filter. High visual fidelity with robust style protection.</p>
      </header>

      <main>
        <div className="control-panel">
          <div className="upload-section" onClick={handleUploadClick}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            {originalPreview ? (
              <div className="preview-box"><img src={originalPreview} alt="Original" /><div className="overlay"><RefreshCcw size={24} /><span>Change Image</span></div></div>
            ) : (
              <div className="drop-zone"><Upload size={48} /><p>Click or Drag to Upload Image</p></div>
            )}
          </div>

          <div className="settings-section">
            <label>Protection Intensity: {intensity}</label>
            <input type="range" min="0.1" max="1.0" step="0.1" value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value))} />
            <button className="apply-btn" onClick={applyFilter} disabled={!file || loading}>{loading ? 'Calculating Adversarial Cloak...' : 'Apply Protection'}</button>
          </div>

          {aiAnalysis && (
            <div className="ai-report">
              <h3><Shield size={16} /> AI Detection Report</h3>
              <div className="report-item"><span>AI Prediction (Original):</span><strong style={{color: '#ff4444'}}>{aiAnalysis.orig}</strong></div>
              <div className="report-item"><span>AI Prediction (Protected):</span><strong style={{color: '#00ff88'}}>{aiAnalysis.prot}</strong></div>
            </div>
          )}
        </div>

        <div className="display-panel">
          <div className="image-comparison">
            <div className="comparison-item"><h3>Original Image</h3><div className="image-wrapper">{originalPreview ? <img src={originalPreview} alt="Original" /> : <div className="placeholder"><ImageIcon size={48} opacity={0.3}/></div>}</div></div>
            <div className="comparison-item"><h3>Protected Image</h3><div className="image-wrapper">{protectedPreview ? <img src={protectedPreview} alt="Protected" /> : <div className="placeholder"><Shield size={48} opacity={0.3}/></div>}</div></div>
          </div>

          {aiAnalysis && (
            <div className="vision-explorer">
              <h3><Eye size={20} /> AI Vision Explorer</h3>
              <div className="heatmap-comparison">
                <div className="heatmap-item"><img src={aiAnalysis.origHeatmap} alt="Original Heatmap" /><p>Original AI Attention</p></div>
                <div className="heatmap-item"><img src={aiAnalysis.protHeatmap} alt="Protected Heatmap" /><p>Confused AI Vision</p></div>
              </div>
            </div>
          )}

          {protectedPreview && <button className="download-btn" onClick={downloadImage}><Download size={20} />Download Protected Image</button>}
        </div>
      </main>
      <footer><p>&copy; 2026 AI-Guard. Built for artists.</p></footer>
    </div>
  );
}

export default App;
