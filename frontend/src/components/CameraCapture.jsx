import { useRef, useCallback, useState } from 'react'
import Webcam from 'react-webcam'
import { Camera, CameraOff, RefreshCw } from 'lucide-react'

export default function CameraCapture({ onCapture, isActive }) {
  const webcamRef = useRef(null)
  const [camError, setCamError] = useState(null)
  const [facingMode, setFacingMode] = useState('user')

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      fetch(imageSrc)
        .then(r => r.blob())
        .then(blob => {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
          onCapture(file, imageSrc)
        })
    }
  }, [onCapture])

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode,
  }

  if (!isActive) return null

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-bright)',
      aspectRatio: '4/3',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {camError ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          color: '#f8fafc', padding: 20, textAlign: 'center'
        }}>
          <CameraOff size={40} color="#f43f5e" />
          <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>Camera Permission Blocked</p>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: 260 }}>{camError}</p>
        </div>
      ) : (
        <>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            mirrored={true}
            videoConstraints={videoConstraints}
            onUserMediaError={(e) => {
              const msg = typeof e === 'string' ? e : e?.message || e?.name || 'Permission denied'
              setCamError(`Permission blocked (${msg}). Allow camera access in browser settings.`)
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', flex: 1 }}
          />
          {/* Controls overlay */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}>
            <button
              onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={capture}
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                border: '3px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                width: 64, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer',
                boxShadow: '0 0 24px rgba(59,130,246,0.5)',
              }}
            >
              <Camera size={24} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
