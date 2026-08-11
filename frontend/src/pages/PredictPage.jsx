import { useState, useCallback } from 'react'
import { Upload, Camera, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import DropZone from '../components/DropZone.jsx'
import CameraCapture from '../components/CameraCapture.jsx'
import ResultCard from '../components/ResultCard.jsx'
import { predictImage } from '../utils/api.js'

const TAB_UPLOAD = 'upload'
const TAB_CAMERA = 'camera'

export default function PredictPage() {
  const [tab, setTab] = useState(TAB_UPLOAD)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)

  const handleFileSelected = useCallback((f) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }, [])

  const handleCameraCapture = useCallback((f, imageSrc) => {
    setFile(f)
    setPreview(imageSrc)
    setResult(null)
    setError(null)
    setCameraActive(false)
  }, [])

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const handlePredict = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await predictImage(file)
      setResult(data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Prediction failed. Is the backend running?'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const toggleCamera = () => {
    setCameraActive(v => !v)
    if (!cameraActive) {
      setTab(TAB_CAMERA)
      handleClear()
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      padding: '40px 2rem 60px',
      maxWidth: 1100,
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}>
          Image Classifier
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Upload or capture an image to get AI predictions.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 32,
        alignItems: 'start',
      }}>
        {/* Left panel: Input */}
        <div>
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            padding: 4,
            marginBottom: 20,
            border: '1px solid var(--border)',
          }}>
            {[
              { id: TAB_UPLOAD, icon: Upload, label: 'Upload File' },
              { id: TAB_CAMERA, icon: Camera, label: 'Use Camera' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id)
                  if (id === TAB_CAMERA) {
                    setCameraActive(true)
                    handleClear()
                  } else {
                    setCameraActive(false)
                  }
                }}
                style={{
                  flex: 1,
                  background: tab === id ? 'var(--accent-primary)' : 'transparent',
                  color: tab === id ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'calc(var(--radius-md) - 4px)',
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Upload zone or camera */}
          {tab === TAB_UPLOAD && (
            <DropZone
              onFileSelected={handleFileSelected}
              preview={preview}
              onClear={handleClear}
            />
          )}
          {tab === TAB_CAMERA && (
            <>
              {!preview ? (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  isActive={cameraActive}
                />
              ) : (
                <div style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-bright)',
                  aspectRatio: '4/3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={preview} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button
                    onClick={handleClear}
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none', borderRadius: '50%',
                      width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'white', fontSize: 18,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </>
          )}

          {/* File info */}
          {file && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {file.name}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}

          {/* Predict button */}
          <button
            onClick={handlePredict}
            disabled={!file || loading}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '16px',
              background: file && !loading
                ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                : 'var(--bg-hover)',
              color: file && !loading ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: file && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s',
              boxShadow: file && !loading ? '0 0 30px rgba(59,130,246,0.3)' : 'none',
              letterSpacing: '0.01em',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Analyzing image...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Run Prediction
              </>
            )}
          </button>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); }}`}</style>
        </div>

        {/* Right panel: Results */}
        <div>
          {!result && !loading && !error && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-bright)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 32px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}>
              <Sparkles size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
              <p style={{ fontWeight: 500, fontSize: '1rem', marginBottom: 8 }}>Results will appear here</p>
              <p style={{ fontSize: '0.85rem' }}>Upload an image and click "Run Prediction"</p>
            </div>
          )}

          {loading && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-bright)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 32px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 60, height: 60,
                border: '3px solid var(--border-bright)',
                borderTop: '3px solid var(--accent-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 20px',
              }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Running inference…</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>The model is analyzing your image</p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: 28,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}>
              <AlertCircle size={20} color="var(--accent-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 600, color: '#fca5a5', marginBottom: 4 }}>Prediction failed</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{error}</p>
              </div>
            </div>
          )}

          {result && <ResultCard result={result} />}
        </div>
      </div>
    </div>
  )
}
