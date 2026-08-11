import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, RefreshCw, Video, ShieldAlert } from 'lucide-react'

export default function WebcamCapture({ onCapture, onClose }) {
  const webcamRef = useRef(null)
  const [holding, setHolding] = useState(false)
  const [camError, setCamError] = useState(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [useFallbackConstraints, setUseFallbackConstraints] = useState(false)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const holdInterval = useRef(null)

  // Enumerate video devices to allow device switching
  const handleDevices = useCallback((mediaDevices) => {
    const videoDevs = mediaDevices.filter(({ kind }) => kind === 'videoinput')
    setDevices(videoDevs)
    if (videoDevs.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(videoDevs[0].deviceId)
    }
  }, [selectedDeviceId])

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(handleDevices).catch(() => {})
    }
  }, [handleDevices])

  const handleUserMediaError = useCallback((err) => {
    const errName = typeof err === 'string' ? err : err?.name || err?.message || ''
    
    if (errName.includes('NotAllowed') || errName.includes('Permission')) {
      setCamError('Permission Denied by Browser. Click the Lock 🔒 icon next to localhost:5173 in your address bar, select Camera -> Allow, then click Grant Camera Permission below.')
    } else if (!useFallbackConstraints) {
      setUseFallbackConstraints(true)
    } else {
      setCamError(`Camera Error (${errName}). Ensure no other application (Zoom, Teams, OBS) is locking your webcam.`)
    }
  }, [useFallbackConstraints])

  const handleUserMedia = useCallback(() => {
    setCamError(null)
    setIsRetrying(false)
  }, [])

  const captureFrame = useCallback(() => {
    if (!webcamRef.current) return
    const imageSrc = webcamRef.current.getScreenshot()
    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          onCapture(blob, url)
        })
        .catch(err => console.error('Failed to capture frame:', err))
    }
  }, [webcamRef, onCapture])

  // Hold to record frames rapidly
  const startHold = () => {
    setHolding(true)
    captureFrame()
    holdInterval.current = setInterval(captureFrame, 150)
  }

  const stopHold = () => {
    setHolding(false)
    if (holdInterval.current) {
      clearInterval(holdInterval.current)
      holdInterval.current = null
    }
  }

  // Explicit user gesture to trigger Chrome permission prompt
  const requestPermissionAndRetry = async () => {
    setIsRetrying(true)
    setUseFallbackConstraints(false)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop())
        setCamError(null)
      }
    } catch (err) {
      setCamError('Permission Denied. Please click the Lock 🔒 icon next to localhost:5173 in your address bar, set Camera to "Allow", and click Grant Camera Permission again.')
    } finally {
      setIsRetrying(false)
    }
  }

  // Determine optimal video constraints
  const getVideoConstraints = () => {
    if (selectedDeviceId) {
      return { deviceId: { exact: selectedDeviceId } }
    }
    if (useFallbackConstraints) {
      return true
    }
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    }
  }

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #1e293b',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      {/* Device Selector header if multiple cameras found */}
      {devices.length > 1 && !camError && (
        <div style={{ padding: '8px 12px', background: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Video size={14} color="#94a3b8" />
          <select
            value={selectedDeviceId}
            onChange={e => setSelectedDeviceId(e.target.value)}
            style={{
              background: '#0f172a', color: '#f8fafc', border: '1px solid #334155',
              borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', outline: 'none', flex: 1
            }}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ position: 'relative', background: '#000', width: '100%', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!camError && !isRetrying ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            mirrored={true}
            videoConstraints={getVideoConstraints()}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            style={{ width: '100%', height: '100%', minHeight: 220, maxHeight: 320, objectFit: 'cover' }}
          />
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#f8fafc' }}>
            <ShieldAlert size={36} color="#f43f5e" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>
              Camera Permission Blocked
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 16, maxWidth: 280, margin: '0 auto 16px', lineHeight: 1.4 }}>
              {camError || 'Requesting camera access...'}
            </p>
            <button
              onClick={requestPermissionAndRetry}
              disabled={isRetrying}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none',
                padding: '10px 18px', borderRadius: 8, fontSize: '0.82rem',
                fontWeight: 800, cursor: isRetrying ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Checking Camera...' : 'Grant Camera Permission / Retry'}
            </button>
          </div>
        )}

        {holding && !camError && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: '#ef4444', color: 'white',
            borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
            animation: 'pulse 1s infinite'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }}></span>
            RECORDING
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: 10, background: '#0f172a' }}>
        <button
          onMouseDown={startHold}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={startHold}
          onTouchEnd={stopHold}
          disabled={!!camError}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: holding ? '#ef4444' : camError ? '#334155' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: camError ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: holding ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(59, 130, 246, 0.3)',
          }}
        >
          <Camera size={18} />
          {holding ? 'Recording Samples...' : 'Hold to Record'}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '12px 16px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: '#94a3b8',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
