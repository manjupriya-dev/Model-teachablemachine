import { useRef, useState } from 'react'
import WebcamCapture from './WebcamCapture.jsx'

export default function ClassPanel({ cls, onRename, onRemove, onAddFiles, onAddCameraSample, onRemoveSample }) {
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(cls.name)
  const [showCam, setShowCam] = useState(false)
  const fileRef = useRef()

  const commitRename = () => {
    setEditing(false)
    if (nameVal.trim()) onRename(nameVal.trim())
    else setNameVal(cls.name)
  }

  const handleFiles = (e) => {
    try {
      const files = e.target.files;
      if (files?.length) {
        // Convert to array immediately to prevent it from being cleared when we reset the input value
        const filesArray = Array.from(files);
        onAddFiles(filesArray);
      }
      e.target.value = '';
    } catch (err) {
      alert(`ClassPanel Error: ${err.message}`);
    }
  }

  const triggerUpload = () => {
    if (fileRef.current) {
      fileRef.current.click();
    } else {
      alert(`Could not find file input ref for ${cls.name}`);
    }
  }

    const headerColor = cls.id % 2 === 0 ? 'var(--accent-pink)' : 'var(--accent-green)';
    const headerLight = cls.id % 2 === 0 ? '#fdf2f8' : '#ecfdf5';

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
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        background: headerLight,
        borderBottom: `2px solid ${headerColor}`,
        gap: 10,
      }}>
        {editing ? (
          <input
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setNameVal(cls.name) } }}
            autoFocus
            style={{
              flex: 1,
              border: 'none',
              borderBottom: '2px solid #1a73e8',
              outline: 'none',
              fontSize: '1rem',
              fontWeight: 800,
              padding: '2px 0',
              background: 'transparent',
              color: headerColor,
            }}
          />
        ) : (
          <span style={{ flex: 1, fontWeight: 800, fontSize: '1rem', color: headerColor }}>{cls.name}</span>
        )}

        {/* Edit pencil */}
        <button onClick={() => setEditing(true)} style={iconBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {/* 3-dot menu */}
        {onRemove && (
          <button onClick={onRemove} style={iconBtn} title="Remove class">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        {cls.samples.length === 0 ? (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Add Image Samples:
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <ActionBtn
                icon={<CamIcon />}
                label="Webcam"
                onClick={() => setShowCam(v => !v)}
                active={showCam}
              />
              <ActionBtn
                icon={<UploadIcon />}
                label="Upload"
                onClick={triggerUpload}
              />
            </div>
          </>
        ) : (
          <>
            {/* Sample count + add more buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {cls.samples.length} image sample{cls.samples.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <SmallBtn icon={<CamIcon small />} onClick={() => setShowCam(v => !v)} active={showCam} />
                <SmallBtn icon={<UploadIcon small />} onClick={triggerUpload} />
              </div>
            </div>

            {/* Thumbnails grid */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              maxHeight: 140,
              overflowY: 'auto',
            }}>
              {cls.samples.map(s => (
                <div key={s.id} style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                  <img
                    src={s.url}
                    alt=""
                    style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)', display: 'block', border: '2px solid var(--border-bright)' }}
                  />
                  <button
                    onClick={() => onRemoveSample(s.id)}
                    style={{
                      position: 'absolute', top: -5, right: -5,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--accent-pink)', border: 'none', color: 'white',
                      fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 0,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Webcam capture inline */}
        {showCam && (
          <div style={{ marginTop: 12 }}>
            <WebcamCapture
              onCapture={(blob, url) => {
                onAddCameraSample(blob, url)
              }}
              onClose={() => setShowCam(false)}
            />
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFiles}
        />
      </div>
    </div>
  )
}

const iconBtn = {
  background: 'white', border: 'none', cursor: 'pointer',
  padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center',
  color: 'var(--text-muted)',
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
}

function ActionBtn({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, padding: '16px 20px',
        background: active ? 'var(--primary)' : 'var(--primary-light)',
        border: 'none',
        borderRadius: 'var(--radius)', cursor: 'pointer',
        color: active ? 'white' : 'var(--primary)', 
        fontSize: '0.9rem', fontWeight: 700,
        minWidth: 100, flex: 1,
        boxShadow: active ? 'var(--shadow)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onMouseEnter={e => { if(!active) e.currentTarget.style.transform = 'scale(1.05)'; }}
      onMouseLeave={e => { if(!active) e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{ color: active ? 'white' : 'var(--primary)' }}>
        {icon}
      </div>
      {label}
    </button>
  )
}

function SmallBtn({ icon, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 12px', borderRadius: 'var(--radius)', border: 'none',
      background: active ? 'var(--primary)' : 'var(--primary-light)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', color: active ? 'white' : 'var(--primary)',
    }}>
      {icon}
    </button>
  )
}

function CamIcon({ small }) {
  const s = small ? 18 : 28
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function UploadIcon({ small }) {
  const s = small ? 18 : 28
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}
