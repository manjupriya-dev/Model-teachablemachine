import { useRef, useEffect, useState, useCallback } from 'react'
import Webcam from 'react-webcam'

export default function PreviewPanel({ trained, classes, predicting, prediction, onPredict }) {
  const [mode, setMode] = useState('webcam') // 'webcam' | 'file'
  const [camActive, setCamActive] = useState(false)
  const [camError, setCamError] = useState(null)
  const webcamRef = useRef(null)
  const intervalRef = useRef()
  const fileRef = useRef()
  const [filePreview, setFilePreview] = useState(null)

  const captureFrame = useCallback(() => {
    if (!webcamRef.current) return
    const imageSrc = webcamRef.current.getScreenshot()
    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
          onPredict(file)
        })
        .catch(err => console.warn('Frame capture failed:', err))
    }
  }, [webcamRef, onPredict])

  // Start/stop webcam predictions
  useEffect(() => {
    setCamError(null)
    if (mode === 'webcam' && trained && camActive) {
      intervalRef.current = setInterval(() => {
        captureFrame()
      }, 700)
    } else {
      stopCam()
    }
    return stopCam
  }, [mode, trained, camActive, captureFrame])

  const stopCam = () => {
    clearInterval(intervalRef.current)
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFilePreview(URL.createObjectURL(f))
    onPredict(f)
    e.target.value = ''
  }

  const bars = classes.map(cls => {
    const conf = prediction?.all_predictions?.find(p =>
      p.label.toLowerCase() === cls.name.toLowerCase()
    )?.confidence ?? (prediction?.top_prediction === cls.name ? prediction?.confidence : 0) ?? 0
    return { name: cls.name, conf }
  })

  const isTop = (name) =>
    prediction?.top_prediction?.toLowerCase() === name.toLowerCase()

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
      border: '2px solid var(--white)',
      transition: 'box-shadow 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-hover)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--accent-purple)',
        borderBottom: '2px solid #7c3aed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Preview</h3>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {!trained ? (
          <p style={{ fontSize: '0.8rem', color: '#5f6368', lineHeight: 1.5 }}>
            You must train a model on the left before you can preview it here.
          </p>
        ) : (
          <>
            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {['webcam', 'file'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setCamActive(false); setFilePreview(null) }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: mode === m ? 'var(--primary)' : 'var(--primary-light)',
                    color: mode === m ? 'white' : 'var(--primary)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: mode === m ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                  onMouseEnter={e => { if(mode !== m) e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { if(mode !== m) e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {m === 'webcam' ? (
                    <><CamSvg /> Webcam</>
                  ) : (
                    <><FileSvg /> File</>
                  )}
                </button>
              ))}
            </div>

            {/* Input area */}
            {mode === 'webcam' && (
              <div style={{ marginBottom: 14 }}>
                {camError && (
                  <div style={{ padding: 10, marginBottom: 10, background: '#fce8e6', color: '#d93025', borderRadius: 6, fontSize: '0.82rem' }}>
                    Camera unavailable: {camError}
                  </div>
                )}
                {!camActive ? (
                  <button
                    onClick={() => setCamActive(true)}
                    style={{
                      width: '100%', padding: '16px',
                      background: 'var(--primary)', color: 'white',
                      border: 'none', borderRadius: 'var(--radius)',
                      fontSize: '1.1rem', fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                      transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Start Webcam
                  </button>
                ) : (
                  <div style={{ borderRadius: 8, overflow: 'hidden', background: '#000', position: 'relative' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      mirrored={true}
                      videoConstraints={{
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                      }}
                      onUserMediaError={(err) => {
                        const msg = typeof err === 'string' ? err : err?.message || err?.name || 'Permission denied'
                        setCamError(`Permission blocked or camera unavailable (${msg}). Please switch to File mode or allow camera access.`)
                        setCamActive(false)
                      }}
                      style={{ width: '100%', minHeight: 180, display: 'block', maxHeight: 260, objectFit: 'cover' }}
                    />
                    {predicting && (
                      <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem',
                      }}>
                        Analyzing…
                      </div>
                    )}
                    <button
                      onClick={() => setCamActive(false)}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.6)', border: 'none',
                        borderRadius: 4, color: 'white', padding: '4px 8px',
                        fontSize: '0.75rem', cursor: 'pointer',
                      }}
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'file' && (
              <div style={{ marginBottom: 14 }}>
                <div
                  onClick={() => fileRef.current.click()}
                  style={{
                    border: '3px dashed var(--border-bright)', borderRadius: 'var(--radius)',
                    padding: '30px', textAlign: 'center',
                    cursor: 'pointer', background: 'var(--primary-light)',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {filePreview ? (
                    <img src={filePreview} alt="" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 12, border: '4px solid white', boxShadow: 'var(--shadow-md)' }} />
                  ) : (
                    <>
                      <div style={{
                        background: 'white', width: 64, height: 64, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                        boxShadow: 'var(--shadow)'
                      }}>
                        <FileSvg big color="var(--primary)" />
                      </div>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginTop: 16 }}>Click to upload image</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </div>
            )}

            {/* Results */}
            {(prediction || predicting) && (
              <div>
                <p style={{ fontSize: '0.75rem', color: '#80868b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                  Output
                </p>

                {bars.map(({ name, conf }, index) => {
                  const colors = ['var(--accent-pink)', 'var(--accent-green)', 'var(--accent-purple)', 'var(--accent-yellow)', 'var(--accent-orange)'];
                  const barColor = colors[index % colors.length];
                  
                  return (
                  <div key={name} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.95rem' }}>
                      <span style={{ fontWeight: 800, color: isTop(name) ? barColor : 'var(--text)' }}>
                        {name}
                      </span>
                      <span style={{ fontWeight: 800, color: isTop(name) ? barColor : 'var(--text-light)' }}>
                        {`${Math.round(conf * 100)}%`}
                      </span>
                    </div>
                    <div style={{ height: 16, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round(conf * 100)}%`,
                        background: barColor,
                        borderRadius: 8,
                        transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        opacity: isTop(name) ? 1 : 0.6,
                      }} />
                    </div>
                  </div>
                )})}

                {prediction?.error && (
                  <p style={{ color: '#d93025', fontSize: '0.8rem', marginTop: 8 }}>
                    {prediction.error}
                  </p>
                )}
              </div>
            )}

            {!prediction && !predicting && (
              <p style={{ fontSize: '0.8rem', color: '#80868b' }}>
                {mode === 'webcam' ? 'Start webcam to see live predictions.' : 'Upload an image to see predictions.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CamSvg() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
}

function FileSvg({ big, color = "currentColor" }) {
  const s = big ? 36 : 18
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
}
