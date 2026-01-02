import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/bulk-upload.css';
import toast from 'react-hot-toast';

const BASE_API = import.meta.env.VITE_BASE_API || '/api';
const getToken = () => localStorage.getItem('access_token');
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}` });

function BulkUploadPage() {
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleUpload() {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csv', csvFile);

      const res = await fetch(`${BASE_API}/questions/bulk/`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });

      const data = await res.json();
      setResult(data);
      
      if (data.created_count > 0) {
        toast.success(`Successfully created ${data.created_count} questions!`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const template = `topic_id,type,statement,choices,correct_answers,difficulty,marks,estimated_time,tags
1,MCQ,What is 2+2?,2|3|4|5,D,Easy,1,30,arithmetic|basic
1,MULTI,Select prime numbers,2|3|4|5,A|B,Medium,2,60,numbers|prime`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bulk-upload-container">
      <div className="bulk-header">
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
        <h1 className="bulk-title">Bulk Upload Questions</h1>
      </div>

      <div className="bulk-content">
        <div className="info-card">
          <h3>📋 CSV Format Instructions</h3>
          <ul className="info-list">
            <li><strong>topic_id:</strong> Numeric ID of the topic</li>
            <li><strong>type:</strong> MCQ, MULTI, FIB, or STRUCT</li>
            <li><strong>statement:</strong> The question text</li>
            <li><strong>choices:</strong> Options separated by | (e.g., "Option A|Option B|Option C")</li>
            <li><strong>correct_answers:</strong> Correct answer keys separated by | (e.g., "A|C" for multi-select)</li>
            <li><strong>difficulty:</strong> Easy, Medium, or Hard</li>
            <li><strong>marks:</strong> Points for the question</li>
            <li><strong>estimated_time:</strong> Time in seconds</li>
            <li><strong>tags:</strong> Tags separated by | (optional)</li>
          </ul>
          <button onClick={downloadTemplate} className="template-btn">
            📥 Download Template CSV
          </button>
        </div>

        <div className="upload-card">
          <div className="upload-area">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="file-input"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="file-label">
              <div className="upload-icon">📄</div>
              <div className="upload-text">
                {csvFile ? csvFile.name : 'Click to select CSV file'}
              </div>
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!csvFile || uploading}
            className="upload-btn"
          >
            {uploading ? '⏳ Uploading...' : '🚀 Upload Questions'}
          </button>
        </div>

        {result && (
          <div className={`result-card ${result.created_count > 0 ? 'success' : 'error'}`}>
            <h3 className="result-title">Upload Results</h3>
            <div className="result-stats">
              <div className="result-stat">
                <span className="stat-label">Created:</span>
                <span className="stat-value">{result.created_count || 0}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">Errors:</span>
                <span className="stat-value">{result.errors?.length || 0}</span>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="errors-section">
                <h4>Errors:</h4>
                <div className="errors-list">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="error-item">
                      <strong>Row {idx + 2}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkUploadPage;
