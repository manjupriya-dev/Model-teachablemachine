import { useState } from 'react'

export default function TrainingPanel({ canTrain, training, trained, classCount, totalSamples, onTrain }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [epochs, setEpochs] = useState(50)
  const [batchSize, setBatchSize] = useState(16)
  const [learningRate, setLearningRate] = useState(0.001)

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
      <div style={{ padding: '10px 14px', background: 'var(--accent-yellow)', borderBottom: '2px solid #f59e0b' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#b45309' }}>Training</h3>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {!canTrain && (
          <p style={{ fontSize: '0.78rem', color: '#5f6368', marginBottom: 10, lineHeight: 1.4 }}>
            Add at least 1 image sample to each class before training.
          </p>
        )}

        {/* Training progress */}
        {training && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-orange)', marginBottom: 6 }}>Training in progress...</div>
            <div style={{ height: 10, background: 'var(--border-light)', borderRadius: 5, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{
                height: '100%',
                width: '70%',
                background: 'linear-gradient(90deg, var(--accent-yellow), var(--accent-orange))',
                borderRadius: 5,
                animation: 'pulse-bar 1s ease-in-out infinite alternate',
              }} />
            </div>
            <style>{`@keyframes pulse-bar { 0% { opacity: 0.7; transform: scaleX(0.95); } 100% { opacity: 1; transform: scaleX(1); } }`}</style>
          </div>
        )}

        {trained && !training && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#dcfce7', borderRadius: 'var(--radius)', padding: '8px 12px',
            marginBottom: 12, border: '2px solid #86efac'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 800 }}>Model trained!</span>
          </div>
        )}

        <button
          onClick={canTrain ? () => onTrain({ epochs, batchSize, learningRate }) : undefined}
          disabled={!canTrain || training}
          style={{
            width: '100%',
            padding: '12px',
            background: canTrain && !training ? 'var(--accent-orange)' : 'var(--border)',
            color: canTrain && !training ? 'white' : 'var(--text-light)',
            border: 'none',
            borderRadius: 'var(--radius-xl)',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: canTrain && !training ? 'pointer' : 'not-allowed',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s, background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: canTrain && !training ? '0 4px 14px rgba(245, 158, 11, 0.4)' : 'none',
          }}
          onMouseEnter={e => { if (canTrain && !training) { e.currentTarget.style.background = '#d97706'; e.currentTarget.style.transform = 'scale(1.02)'; } }}
          onMouseLeave={e => { if (canTrain && !training) { e.currentTarget.style.background = 'var(--accent-orange)'; e.currentTarget.style.transform = 'scale(1)'; } }}
        >
          {training ? (
            <>
              <Spinner /> Training…
            </>
          ) : 'Train Model'}
        </button>

        {/* Stats */}
        {totalSamples > 0 && (
          <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#80868b', lineHeight: 1.6 }}>
            <div>{classCount} class{classCount !== 1 ? 'es' : ''}</div>
            <div>{totalSamples} total sample{totalSamples !== 1 ? 's' : ''}</div>
          </div>
        )}

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '8px 0',
            background: 'none',
            border: 'none',
            borderTop: '2px dashed var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Advanced Settings
          <div style={{
            background: showAdvanced ? 'var(--primary)' : 'var(--border)',
            color: showAdvanced ? 'white' : 'var(--text-muted)',
            borderRadius: '50%',
            padding: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3"
              style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SliderField label="Epochs" value={epochs} min={10} max={200} step={10} onChange={setEpochs} />
            <SliderField label="Batch Size" value={batchSize} min={8} max={256} step={8} onChange={setBatchSize} />
            <SliderField label="Learning Rate" value={learningRate} min={0.0001} max={0.01} step={0.0001} onChange={setLearningRate} format={v => v.toFixed(4)} />
          </div>
        )}
      </div>
    </div>
  )
}

function SliderField({ label, value, min, max, step, onChange, format }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.75rem', color: '#5f6368' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 500, color: '#202124' }}>{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#1a73e8', height: 4 }}
      />
    </div>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2a10 10 0 0110 10" />
    </svg>
  )
}
