import { CheckCircle, Clock, TrendingUp } from 'lucide-react'

const confidenceColor = (conf) => {
  if (conf >= 0.8) return '#10b981'
  if (conf >= 0.5) return '#3b82f6'
  if (conf >= 0.3) return '#f59e0b'
  return '#ef4444'
}

function ConfidenceBar({ label, confidence, isTop }) {
  const pct = Math.round(confidence * 100)
  const color = confidenceColor(confidence)

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: '0.88rem',
          fontWeight: isTop ? 700 : 400,
          color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {isTop && <CheckCircle size={14} color={color} />}
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          fontWeight: 600,
          color,
        }}>
          {pct}%
        </span>
      </div>
      <div style={{
        height: 8,
        background: 'var(--bg-base)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: isTop
            ? `linear-gradient(90deg, ${color}, ${color}aa)`
            : color + '88',
          borderRadius: 4,
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isTop ? `0 0 8px ${color}66` : 'none',
        }} />
      </div>
    </div>
  )
}

export default function ResultCard({ result }) {
  if (!result) return null

  const topConf = Math.round(result.confidence * 100)
  const color = confidenceColor(result.confidence)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid var(--border-bright)`,
      borderRadius: 'var(--radius-lg)',
      padding: 28,
      animation: 'fadeIn 0.4s ease',
    }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; }}`}</style>

      {/* Top prediction hero */}
      <div style={{
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}33`,
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
        marginBottom: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Top Prediction
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color }}>
          {result.top_prediction}
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color }}>
          {topConf}%
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>confidence</div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{
          flex: 1,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Clock size={16} color="var(--text-muted)" />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Processing</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 600 }}>
              {result.processing_time_ms}ms
            </div>
          </div>
        </div>
        <div style={{
          flex: 1,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <TrendingUp size={16} color="var(--text-muted)" />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Model</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {result.model_name}
            </div>
          </div>
        </div>
      </div>

      {/* All class probabilities */}
      <div>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          All Classes
        </h4>
        {result.all_predictions.map((pred, i) => (
          <ConfidenceBar
            key={pred.label}
            label={pred.label}
            confidence={pred.confidence}
            isTop={i === 0}
          />
        ))}
      </div>
    </div>
  )
}
