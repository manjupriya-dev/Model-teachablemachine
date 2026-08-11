import { useEffect, useRef } from 'react'
import { X, Volume2, BookOpen, ArrowLeftRight, MessageSquare, Globe } from 'lucide-react'

const LANG_LABELS = {
  en: '🇬🇧 English',
  ta: '🇮🇳 Tamil',
  hi: '🇮🇳 Hindi',
  te: '🇮🇳 Telugu',
  ml: '🇮🇳 Malayalam',
  kn: '🇮🇳 Kannada',
}

const POS_COLORS = {
  noun:        { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  verb:        { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  adjective:   { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  adverb:      { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  pronoun:     { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  preposition: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  conjunction: { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' },
  default:     { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
}

function getPosStyle(pos) {
  const key = (pos || '').toLowerCase()
  return POS_COLORS[key] || POS_COLORS.default
}

export default function WordDictionaryPopup({ entry, onClose, targetLang }) {
  const popupRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!entry) return null

  const posStyle = getPosStyle(entry.pos)
  const isNotFound = entry.not_found
  const confidence = entry.confidence != null ? Math.round(entry.confidence * 100) : null

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <div
        ref={popupRef}
        style={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          scrollbarWidth: 'thin',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: isNotFound
            ? 'linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%)'
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          padding: '28px 28px 24px',
          borderRadius: '24px 24px 0 0',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: isNotFound ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isNotFound ? '#64748b' : '#e0e7ff',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = isNotFound ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.target.style.background = isNotFound ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'}
          >
            <X size={18} />
          </button>

          {/* Word + IPA */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '0.02em',
              color: isNotFound ? '#dc2626' : '#fff',
              margin: 0,
              textTransform: 'uppercase',
              fontFamily: "'Outfit', 'Nunito', sans-serif",
            }}>
              {entry.word}
            </h2>
            {entry.ipa && (
              <span style={{
                fontSize: '1rem',
                color: isNotFound ? '#64748b' : '#a5b4fc',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
              }}>
                {entry.ipa}
              </span>
            )}
          </div>

          {/* POS badge + confidence */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {entry.pos && (
              <span style={{
                backgroundColor: isNotFound ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)',
                color: isNotFound ? '#475569' : '#c7d2fe',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '4px 12px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                border: isNotFound ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.2)',
              }}>
                {entry.pos}
              </span>
            )}
            {confidence != null && (
              <span style={{
                backgroundColor: confidence >= 70 ? 'rgba(16,185,129,0.15)' : confidence >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                color: confidence >= 70 ? '#10b981' : confidence >= 40 ? '#f59e0b' : '#ef4444',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
              }}>
                OCR: {confidence}%
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {isNotFound ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              backgroundColor: '#fef2f2',
              borderRadius: '16px',
              border: '1px solid #fecaca',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
              <p style={{ fontWeight: 700, color: '#dc2626', margin: 0 }}>Meaning not available.</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                This word was not found in the dictionary. It may be a proper noun, abbreviation, or OCR error.
              </p>
            </div>
          ) : (
            <>
              {/* Meaning */}
              <Section icon={<BookOpen size={15} />} label="Meaning" color="#4338ca">
                <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: 1.7 }}>
                  {entry.meaning}
                </p>
              </Section>

              {/* Synonyms */}
              {entry.synonyms && entry.synonyms.length > 0 && (
                <Section icon={<ArrowLeftRight size={15} />} label="Synonyms" color="#059669">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {entry.synonyms.map((s, i) => (
                      <Chip key={i} text={s} colorScheme="green" />
                    ))}
                  </div>
                </Section>
              )}

              {/* Antonyms */}
              {entry.antonyms && entry.antonyms.length > 0 && (
                <Section icon={<ArrowLeftRight size={15} style={{ transform: 'scaleX(-1)' }} />} label="Antonyms" color="#dc2626">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {entry.antonyms.map((a, i) => (
                      <Chip key={i} text={a} colorScheme="red" />
                    ))}
                  </div>
                </Section>
              )}

              {/* Example Sentence */}
              {entry.example && (
                <Section icon={<MessageSquare size={15} />} label="Example" color="#7c3aed">
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#475569',
                    fontStyle: 'italic',
                    lineHeight: 1.7,
                    borderLeft: '3px solid #c4b5fd',
                    paddingLeft: '12px',
                  }}>
                    "{entry.example}"
                  </p>
                </Section>
              )}

              {/* Translation */}
              {entry.translation && targetLang !== 'en' && (
                <Section icon={<Globe size={15} />} label={`Translation (${LANG_LABELS[targetLang] || targetLang})`} color="#0369a1">
                  <div style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}>
                    <p style={{ margin: 0, fontSize: '15px', color: '#0c4a6e', fontWeight: 600, lineHeight: 1.7 }}>
                      {entry.translation}
                    </p>
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(24px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ icon, label, color, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#94a3b8',
        }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function Chip({ text, colorScheme }) {
  const schemes = {
    green: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    red:   { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  }
  const s = schemes[colorScheme] || schemes.green
  return (
    <span style={{
      backgroundColor: s.bg,
      color: s.text,
      border: `1px solid ${s.border}`,
      borderRadius: '9999px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'default',
      transition: 'all 0.15s',
    }}>
      {text}
    </span>
  )
}
