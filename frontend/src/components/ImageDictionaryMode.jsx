import { useState, useRef, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, Search, Globe, X, ZoomIn, BookOpen, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { scanImageForDictionary, lookupWord } from '../utils/api.js'
import WordDictionaryPopup from './WordDictionaryPopup.jsx'

const LANGUAGES = [
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil',     flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi',     flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',    flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',   flag: '🇮🇳' },
]

export default function ImageDictionaryMode() {
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null) // object URL
  const [scanResult, setScanResult] = useState(null)     // ImageScanResponse
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)

  const [selectedWord, setSelectedWord] = useState(null) // WordBBox entry
  const [dictEntry, setDictEntry]   = useState(null)     // DictionaryEntry
  const [loadingDict, setLoadingDict] = useState(false)

  const [hoveredWord, setHoveredWord] = useState(null)   // word string
  const [targetLang, setTargetLang] = useState('en')

  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // Image scale factors (to map bbox coords → rendered pixel coords)
  const [imgScale, setImgScale] = useState({ x: 1, y: 1, offsetX: 0, offsetY: 0 })

  // Recalculate scale when image loads / window resizes
  const recalcScale = useCallback(() => {
    if (!imgRef.current || !scanResult) return
    const el = imgRef.current
    const naturalW = scanResult.image_width
    const naturalH = scanResult.image_height
    const renderedW = el.clientWidth
    const renderedH = el.clientHeight
    const scaleX = renderedW / naturalW
    const scaleY = renderedH / naturalH
    setImgScale({ x: scaleX, y: scaleY, offsetX: 0, offsetY: 0 })
  }, [scanResult])

  useEffect(() => {
    if (!scanResult) return
    const ro = new ResizeObserver(recalcScale)
    if (imgRef.current) ro.observe(imgRef.current)
    recalcScale()
    return () => ro.disconnect()
  }, [scanResult, recalcScale])

  // Drag-and-drop handler
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setScanResult(null)
    setScanError(null)
    setSelectedWord(null)
    setDictEntry(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  // Scan image for words
  const handleScan = async () => {
    if (!imageFile) return
    setScanning(true)
    setScanError(null)
    setScanResult(null)
    setSelectedWord(null)
    setDictEntry(null)

    try {
      const result = await scanImageForDictionary(imageFile)
      setScanResult(result)
    } catch (err) {
      setScanError(err.response?.data?.detail || err.message || 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  // Click a word (from overlay or sidebar list)
  const handleWordClick = async (wordEntry) => {
    setSelectedWord(wordEntry)
    setLoadingDict(true)
    setDictEntry(null)
    try {
      const entry = await lookupWord(wordEntry.word, targetLang)
      setDictEntry({ ...entry, confidence: wordEntry.confidence })
    } catch (err) {
      setDictEntry({
        word: wordEntry.word.toUpperCase(),
        meaning: 'Meaning not available.',
        ipa: '', pos: '', synonyms: [], antonyms: [], example: '',
        translation: 'Meaning not available.',
        target_lang: targetLang,
        not_found: true,
        confidence: wordEntry.confidence,
      })
    } finally {
      setLoadingDict(false)
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setScanResult(null)
    setScanError(null)
    setSelectedWord(null)
    setDictEntry(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
  }

  // Map bbox coords to rendered pixel coords
  const mapBbox = (bbox) => {
    const [x1, y1, x2, y2] = bbox
    return {
      left:   x1 * imgScale.x,
      top:    y1 * imgScale.y,
      width:  (x2 - x1) * imgScale.x,
      height: (y2 - y1) * imgScale.y,
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>

      {/* ── Controls bar ── */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={16} color="#64748b" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Translate to:
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setTargetLang(lang.code)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: targetLang === lang.code ? '2px solid #4338ca' : '2px solid #e2e8f0',
                  backgroundColor: targetLang === lang.code ? '#eef2ff' : '#f8fafc',
                  color: targetLang === lang.code ? '#4338ca' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {imageFile && (
            <button
              onClick={clearImage}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '12px',
                border: '1.5px solid #fecaca', background: '#fef2f2',
                color: '#dc2626', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
          {imageFile && (
            <button
              onClick={handleScan}
              disabled={scanning}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 20px', borderRadius: '12px',
                background: scanning ? '#c7d2fe' : 'linear-gradient(135deg, #4338ca, #7c3aed)',
                color: '#fff', fontSize: '13px', fontWeight: 800,
                border: 'none', cursor: scanning ? 'not-allowed' : 'pointer',
                boxShadow: scanning ? 'none' : '0 4px 12px rgba(67,56,202,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {scanning ? (
                <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</>
              ) : (
                <><Search size={14} /> Scan Image</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>

        {/* ── Image panel ── */}
        <div style={{
          flex: '1 1 400px',
          backgroundColor: '#fff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <ZoomIn size={16} color="#4338ca" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
              Image Preview
            </h3>
            {scanResult && (
              <span style={{
                marginLeft: 'auto', fontSize: '11px', fontWeight: 700,
                backgroundColor: '#eef2ff', color: '#4338ca',
                padding: '3px 10px', borderRadius: '9999px',
              }}>
                {scanResult.words.length} unique word{scanResult.words.length !== 1 ? 's' : ''} detected
              </span>
            )}
          </div>

          <div style={{ flex: 1, padding: '16px', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!imagePreview ? (
              /* Dropzone */
              <div
                {...getRootProps()}
                style={{
                  width: '100%',
                  minHeight: '300px',
                  border: `2.5px dashed ${isDragActive ? '#4338ca' : '#cbd5e1'}`,
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? '#eef2ff' : '#f8fafc',
                  transition: 'all 0.2s',
                  padding: '32px',
                }}
              >
                <input {...getInputProps()} />
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: isDragActive ? '#c7d2fe' : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <Upload size={28} color={isDragActive ? '#4338ca' : '#94a3b8'} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 800, color: isDragActive ? '#4338ca' : '#334155', fontSize: '15px' }}>
                    {isDragActive ? 'Drop your image here!' : 'Drag & drop an image'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    or click to browse — JPG, PNG, WEBP, BMP
                  </p>
                </div>
              </div>
            ) : (
              /* Image with bounding box overlays */
              <div
                ref={containerRef}
                style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
              >
                <img
                  ref={imgRef}
                  src={imagePreview}
                  alt="Uploaded"
                  onLoad={recalcScale}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '500px',
                    borderRadius: '12px',
                    display: 'block',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  }}
                />

                {/* Word bounding box overlays */}
                {scanResult && scanResult.all_words.map((wordEntry, idx) => {
                  const rect = mapBbox(wordEntry.bbox)
                  const isSelected = selectedWord?.word?.toLowerCase() === wordEntry.word.toLowerCase()
                    && JSON.stringify(selectedWord?.bbox) === JSON.stringify(wordEntry.bbox)
                  const isHovered = hoveredWord?.toLowerCase() === wordEntry.word.toLowerCase()

                  return (
                    <div
                      key={idx}
                      onClick={() => handleWordClick(wordEntry)}
                      onMouseEnter={() => setHoveredWord(wordEntry.word)}
                      onMouseLeave={() => setHoveredWord(null)}
                      title={wordEntry.word}
                      style={{
                        position: 'absolute',
                        left: rect.left + 'px',
                        top: rect.top + 'px',
                        width: rect.width + 'px',
                        height: rect.height + 'px',
                        border: isSelected
                          ? '2.5px solid #f59e0b'
                          : isHovered
                            ? '2.5px solid #4338ca'
                            : '1.5px solid rgba(99,102,241,0.5)',
                        backgroundColor: isSelected
                          ? 'rgba(245,158,11,0.18)'
                          : isHovered
                            ? 'rgba(67,56,202,0.12)'
                            : 'rgba(99,102,241,0.05)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        zIndex: isSelected || isHovered ? 10 : 1,
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(245,158,11,0.3)'
                          : isHovered
                            ? '0 0 0 3px rgba(67,56,202,0.2)'
                            : 'none',
                      }}
                    />
                  )
                })}

                {/* Loading spinner overlay */}
                {scanning && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.75)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '10px', backdropFilter: 'blur(3px)',
                  }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      border: '4px solid #e0e7ff',
                      borderTop: '4px solid #4338ca',
                      animation: 'spin 0.9s linear infinite',
                    }} />
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#4338ca' }}>
                      Scanning text...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error banner */}
          {scanError && (
            <div style={{
              margin: '0 16px 16px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertCircle size={16} color="#dc2626" />
              <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>{scanError}</p>
            </div>
          )}
        </div>

        {/* ── Right sidebar: word list ── */}
        <div style={{
          width: '280px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>

          {/* Stats card */}
          {scanResult && (
            <div style={{
              backgroundColor: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
              background: 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)',
              borderRadius: '16px',
              padding: '16px 18px',
              color: '#fff',
            }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a5b4fc' }}>
                OCR Result
              </p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <Stat value={scanResult.words.length} label="Unique Words" />
                <Stat value={scanResult.all_words.length} label="Total Detections" />
              </div>
            </div>
          )}

          {/* Word list */}
          <div style={{
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <BookOpen size={14} color="#4338ca" />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Detected Words
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
              {!scanResult ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}>
                  <ImageIcon size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                    {imageFile ? 'Click "Scan Image" to detect words' : 'Upload an image to get started'}
                  </p>
                </div>
              ) : scanResult.words.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}>
                  <AlertCircle size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>No words detected.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Try a clearer image with printed text.</p>
                </div>
              ) : (
                scanResult.words.map((wordEntry, idx) => {
                  const isSelected = selectedWord?.word?.toLowerCase() === wordEntry.word.toLowerCase()
                  const conf = Math.round(wordEntry.confidence * 100)
                  return (
                    <button
                      key={idx}
                      onClick={() => handleWordClick(wordEntry)}
                      onMouseEnter={() => setHoveredWord(wordEntry.word)}
                      onMouseLeave={() => setHoveredWord(null)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        marginBottom: '4px',
                        borderRadius: '10px',
                        border: isSelected ? '1.5px solid #a5b4fc' : '1.5px solid transparent',
                        backgroundColor: isSelected ? '#eef2ff' : hoveredWord?.toLowerCase() === wordEntry.word.toLowerCase() ? '#f8fafc' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span style={{
                        flexShrink: 0,
                        width: '28px', height: '28px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#c7d2fe' : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 800, color: isSelected ? '#4338ca' : '#64748b',
                      }}>
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 800, fontSize: '13px',
                          color: isSelected ? '#4338ca' : '#1e293b',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {wordEntry.word}
                        </div>
                        {/* Confidence bar */}
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, height: '3px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '9999px',
                              width: `${conf}%`,
                              backgroundColor: conf >= 70 ? '#10b981' : conf >= 40 ? '#f59e0b' : '#ef4444',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>{conf}%</span>
                        </div>
                      </div>
                      {isSelected && loadingDict ? (
                        <Loader size={12} color="#4338ca" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                      ) : isSelected ? (
                        <CheckCircle size={14} color="#4338ca" style={{ flexShrink: 0 }} />
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dictionary popup ── */}
      {(dictEntry || loadingDict) && selectedWord && (
        loadingDict ? (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 999,
          }}>
            <div style={{
              backgroundColor: '#fff', borderRadius: '20px', padding: '40px 48px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                border: '4px solid #e0e7ff', borderTop: '4px solid #4338ca',
                animation: 'spin 0.9s linear infinite',
              }} />
              <p style={{ margin: 0, fontWeight: 800, color: '#4338ca', fontSize: '15px' }}>
                Looking up "{selectedWord.word}"...
              </p>
            </div>
          </div>
        ) : (
          <WordDictionaryPopup
            entry={dictEntry}
            targetLang={targetLang}
            onClose={() => { setDictEntry(null); setSelectedWord(null) }}
          />
        )
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#fff' }}>{value}</p>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
    </div>
  )
}
