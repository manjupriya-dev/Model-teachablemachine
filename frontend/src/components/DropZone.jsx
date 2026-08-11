import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, ImageIcon, X } from 'lucide-react'

export default function DropZone({ onFileSelected, preview, onClear }) {
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onFileSelected(accepted[0])
  }, [onFileSelected])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp'] },
    maxFiles: 1,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false),
  })

  if (preview) {
    return (
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-bright)',
        aspectRatio: '4/3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={preview}
          alt="Preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
        <button
          onClick={onClear}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.7)',
            border: 'none',
            borderRadius: '50%',
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
          }}
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-bright)'}`,
        borderRadius: 'var(--radius-lg)',
        aspectRatio: '4/3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        cursor: 'pointer',
        background: dragActive ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
        transition: 'all 0.2s',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <input {...getInputProps()} />
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: dragActive ? 'var(--accent-glow)' : 'var(--bg-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        {dragActive
          ? <ImageIcon size={28} color="var(--accent-primary)" />
          : <Upload size={28} color="var(--text-muted)" />
        }
      </div>
      <div>
        <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          {dragActive ? 'Drop it here' : 'Drop an image here'}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          or <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>click to browse</span>
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
          JPG, PNG, WebP, BMP — max 10MB
        </p>
      </div>
    </div>
  )
}
