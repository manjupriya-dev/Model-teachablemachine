export default function Topbar() {
  return (
    <header style={{
      height: 64,
      background: 'linear-gradient(135deg, var(--accent-purple), var(--primary))',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      flexShrink: 0,
      boxShadow: 'var(--shadow)',
      borderRadius: '0 0 24px 24px',
      marginBottom: '16px',
      zIndex: 10,
    }}>
      {/* Hamburger */}
      <button style={{
        background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
        padding: 8, borderRadius: 12, cursor: 'pointer', display: 'flex',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <rect x="3" y="6" width="18" height="3" rx="1.5"/>
          <rect x="3" y="11.5" width="18" height="3" rx="1.5"/>
          <rect x="3" y="17" width="18" height="3" rx="1.5"/>
        </svg>
      </button>

      <span style={{
        color: 'white',
        fontWeight: 800,
        fontSize: '1.4rem',
        letterSpacing: '0.5px',
        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        ✨ NeuralLens Kids
      </span>

      <div style={{ flex: 1 }} />

      <button style={{
        background: 'white', border: 'none',
        color: 'var(--primary)',
        fontSize: '0.9rem',
        fontWeight: 700,
        padding: '8px 16px',
        borderRadius: '20px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        Image Project
      </button>
    </header>
  )
}
