import { useState, useRef, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import { 
  Camera, 
  Database, 
  Square, 
  Play, 
  FlipHorizontal,
  RotateCw, 
  Loader,
  BookOpen
} from 'lucide-react'
import { 
  performOCR, 
  getVocabulary, 
  addVocabularyWord, 
  lookupWord,
  lookupBatchWords
} from '../utils/api.js'
import OCRDictionaryTable from '../components/OCRDictionaryTable.jsx'

const LANGUAGES = [
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil',     flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi',     flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',    flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',   flag: '🇮🇳' },
]

export default function OCRWorkspacePage() {
  const [camActive, setCamActive] = useState(false)
  const [camStatus, setCamStatus] = useState('OFF') // 'OFF' | 'LOADING' | 'ACTIVE'
  const [scanning, setScanning] = useState(false)
  const [isMirrored, setIsMirrored] = useState(false) // Default to unmirrored for readable text & OCR
  
  // Scanned / detected results
  const [ocrResult, setOcrResult] = useState(null)
  const [pipelineImages, setPipelineImages] = useState(null)
  const [vocabulary, setVocabulary] = useState({})
  
  // Target translation language
  const [targetLang, setTargetLang] = useState('en')

  // Detailed dictionary data for the currently active word
  const [activeDictEntry, setActiveDictEntry] = useState(null)
  const [loadingDict, setLoadingDict] = useState(false)

  // OCR Dictionary Feature: Batch table entries for all detected words
  const [dictionaryEntries, setDictionaryEntries] = useState([])
  const [loadingBatchDict, setLoadingBatchDict] = useState(false)

  // Selected word from table or scan
  const [selectedWord, setSelectedWord] = useState(null)
  const [hoveredWord, setHoveredWord] = useState(null)

  // Manual word entry
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualWord, setManualWord] = useState('')
  const [manualMeaning, setManualMeaning] = useState('')

  // Sidebar new word entry
  const [newVocabWord, setNewVocabWord] = useState('')
  const [newVocabMeaning, setNewVocabMeaning] = useState('')

  const webcamRef = useRef(null)
  const scanIntervalRef = useRef(null)
  const scanningRef = useRef(false)

  // Refresh page state without full browser reload
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshPage = async () => {
    setIsRefreshing(true)
    setOcrResult(null)
    setPipelineImages(null)
    setActiveDictEntry(null)
    setDictionaryEntries([])
    setSelectedWord(null)
    setHoveredWord(null)
    setShowManualForm(false)
    setManualWord('')
    setManualMeaning('')

    await fetchVocabulary()

    setTimeout(() => {
      setIsRefreshing(false)
    }, 500)
  }

  // Fetch vocabulary on mount
  useEffect(() => {
    fetchVocabulary()
  }, [])

  const fetchVocabulary = async () => {
    try {
      const vocab = await getVocabulary()
      setVocabulary(vocab)
    } catch (err) {
      console.error('Failed to fetch vocabulary:', err)
    }
  }

  // Look up full dictionary details when a word is detected or language changes
  const fetchDictionaryDetails = useCallback(async (word, lang) => {
    if (!word || !word.trim()) return
    const cleanWord = word.trim().toUpperCase()

    // If activeDictEntry already matches this word & target language, skip refetching
    if (
      activeDictEntry &&
      activeDictEntry.word?.toUpperCase() === cleanWord &&
      activeDictEntry.target_lang === lang &&
      !activeDictEntry.not_found
    ) {
      return
    }

    setLoadingDict(true)
    try {
      const entry = await lookupWord(word.trim(), lang)
      setActiveDictEntry(entry)
    } catch (err) {
      setActiveDictEntry({
        word: cleanWord,
        meaning: 'Meaning not available.',
        ipa: '', pos: '', synonyms: [], antonyms: [], example: '',
        translation: 'Meaning not available.',
        target_lang: lang,
        not_found: true,
      })
    } finally {
      setLoadingDict(false)
    }
  }, [activeDictEntry])

  // Batch dictionary fetch for OCR Dictionary Table with frontend deduplication
  const lastBatchKeyRef = useRef('')

  const fetchBatchDictionary = useCallback(async (words, lang, force = false) => {
    if (!words || words.length === 0) {
      setDictionaryEntries([])
      lastBatchKeyRef.current = ''
      return
    }
    const batchKey = `${words.map(w => w.toLowerCase()).sort().join(',')}:${lang}`
    if (!force && lastBatchKeyRef.current === batchKey) {
      return // Skip redundant API calls when same words are detected across live frames
    }
    lastBatchKeyRef.current = batchKey

    setLoadingBatchDict(true)
    try {
      const res = await lookupBatchWords(words, lang)
      if (res && res.entries) {
        setDictionaryEntries(res.entries)
      }
    } catch (err) {
      console.error('Failed to fetch batch dictionary:', err)
    } finally {
      setLoadingBatchDict(false)
    }
  }, [])

  // Refetch dictionary details and batch dictionary if target language changes
  useEffect(() => {
    const currentWord = ocrResult?.text || selectedWord
    if (currentWord) {
      fetchDictionaryDetails(currentWord, targetLang)
    }
    if (dictionaryEntries.length > 0) {
      const words = dictionaryEntries.map(e => e.word)
      fetchBatchDictionary(words, targetLang)
    }
  }, [targetLang, fetchDictionaryDetails, ocrResult?.text, selectedWord])

  const handleAddWord = async (e, source = 'sidebar') => {
    e.preventDefault()
    const word = source === 'sidebar' ? newVocabWord : manualWord
    const meaning = source === 'sidebar' ? newVocabMeaning : manualMeaning
    
    if (!word.trim() || !meaning.trim()) return

    try {
      await addVocabularyWord(word, meaning)
      await fetchVocabulary()
      
      if (source === 'sidebar') {
        setNewVocabWord('')
        setNewVocabMeaning('')
      } else {
        setManualWord('')
        setManualMeaning('')
        setShowManualForm(false)
        if (ocrResult && ocrResult.text.toUpperCase() === word.toUpperCase()) {
          setOcrResult(prev => ({
            ...prev,
            status: 'MATCH FOUND',
            meaning: meaning
          }))
        }
      }
    } catch (err) {
      alert(`Error saving word: ${err.response?.data?.detail || err.message}`)
    }
  }

  // Captures webcam frame, calculates ROI, and calls OCR API
  const captureAndScan = useCallback(async () => {
    if (scanningRef.current) return // Guard against overlapping scans
    if (!webcamRef.current || !webcamRef.current.video) return
    const video = webcamRef.current.video
    if (video.readyState !== 4) return // Video not ready
    
    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    scanningRef.current = true
    setScanning(true)
    
    try {
      const blob = await fetch(imageSrc).then(res => res.blob())
      const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })

      const videoW = video.videoWidth
      const videoH = video.videoHeight
      
      const roiW = videoW * 0.6
      const roiH = videoH * 0.35
      const roiX = (videoW - roiW) / 2
      const roiY = (videoH - roiH) / 2

      const roi = {
        x: roiX,
        y: roiY,
        width: roiW,
        height: roiH,
        videoWidth: videoW,
        videoHeight: videoH
      }

      const result = await performOCR(file, roi)
      if (result.success) {
        setOcrResult(result)
        if (result.pipeline) {
          setPipelineImages(result.pipeline)
        }
        // Fetch detailed dictionary information
        if (result.text) {
          fetchDictionaryDetails(result.text, targetLang)
          const words = result.text.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length >= 2)
          if (words.length > 0) {
            fetchBatchDictionary(words, targetLang)
          }
        } else {
          setActiveDictEntry(null)
        }
        if (result.status === 'UNKNOWN WORD') {
          setManualWord(result.text)
        }
      }
    } catch (err) {
      console.error('OCR scanning error:', err)
    } finally {
      scanningRef.current = false
      setScanning(false)
    }
  }, [webcamRef, targetLang, fetchDictionaryDetails, fetchBatchDictionary])

  // Manage webcam scanning interval
  useEffect(() => {
    if (camActive && camStatus === 'ACTIVE') {
      scanIntervalRef.current = setInterval(() => {
        captureAndScan()
      }, 1500)
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
      setOcrResult(null)
      setPipelineImages(null)
      setActiveDictEntry(null)
    }
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [camActive, camStatus, captureAndScan])

  const handleUserMedia = () => {
    setCamStatus('ACTIVE')
  }

  const handleUserMediaError = (err) => {
    console.error('Webcam error:', err)
    setCamStatus('OFF')
    setCamActive(false)
    alert(`Could not start camera: ${err.message || err}`)
  }

  const toggleCamera = () => {
    if (camActive) {
      setCamActive(false)
      setCamStatus('OFF')
    } else {
      setCamActive(true)
      setCamStatus('LOADING')
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      overflow: 'hidden',
      backgroundColor: '#f8fafc',
      fontFamily: "'Nunito', sans-serif"
    }}>
      
      {/* ── Top Workspace Bar ── */}
      <div className="bg-white px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>🔍</span> OCR Learning Studio &amp; Dictionary
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Extract text in real-time from webcam to lookup pronunciations, definitions, and translations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Page Button */}
          <button
            onClick={handleRefreshPage}
            disabled={isRefreshing}
            title="Refresh OCR Studio & Dictionary workspace"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-extrabold text-xs transition-all border border-slate-200 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Main View Split ── */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* Left Side: Live Webcam Feed workspace */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* ── LIVE WEBCAM FEED ── */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md font-extrabold text-slate-800 flex items-center gap-2">
                <Camera className="text-indigo-500" size={18} /> Live Stream
              </h2>
              
              <div className="flex items-center gap-4">
                {/* Camera Status */}
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    camStatus === 'ACTIVE' ? 'bg-emerald-500 animate-ping' :
                    camStatus === 'LOADING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Webcam: {camStatus}
                  </span>
                </div>

                <button
                  onClick={() => setIsMirrored(prev => !prev)}
                  title="Toggle webcam mirror effect"
                  className="flex items-center gap-1.5 font-bold py-2 px-3 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
                >
                  <FlipHorizontal size={14} />
                  {isMirrored ? 'Mirrored' : 'Unmirrored'}
                </button>

                <button
                  onClick={toggleCamera}
                  className={`flex items-center gap-1.5 font-bold py-2 px-4 rounded-xl text-xs text-white transition-all shadow-sm ${
                    camActive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {camActive ? <><Square size={12} /> Stop</> : <><Play size={12} /> Start Stream</>}
                </button>
              </div>
            </div>

            {/* Viewport container */}
            <div style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              backgroundColor: '#0f172a',
              border: '4px solid #f1f5f9',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}>
              {camActive ? (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    mirrored={isMirrored}
                    onUserMedia={handleUserMedia}
                    onUserMediaError={handleUserMediaError}
                    videoConstraints={{ width: { ideal: 1280 }, height: { ideal: 720 } }}
                    className="w-full h-full object-contain bg-slate-950"
                  />
                  
                  {/* Centered Yellow Box ROI overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div style={{
                      width: '60%',
                      height: '35%',
                      border: '4px dashed #facc15',
                      borderRadius: '12px',
                      position: 'relative',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)'
                    }}>
                      {/* Corner markers */}
                      <div style={{ position: 'absolute', top: '-6px', left: '-6px', width: '16px', height: '16px', borderTop: '6px solid #facc15', borderLeft: '6px solid #facc15', borderRadius: '3px 0 0 0' }} />
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', borderTop: '6px solid #facc15', borderRight: '6px solid #facc15', borderRadius: '0 3px 0 0' }} />
                      <div style={{ position: 'absolute', bottom: '-6px', left: '-6px', width: '16px', height: '16px', borderBottom: '6px solid #facc15', borderLeft: '6px solid #facc15', borderRadius: '0 0 0 3px' }} />
                      <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '16px', height: '16px', borderBottom: '6px solid #facc15', borderRight: '6px solid #facc15', borderRadius: '0 0 3px 0' }} />

                      {ocrResult?.text && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/85 text-emerald-400 font-extrabold text-xs px-4 py-1.5 rounded-full shadow-lg border border-emerald-900/30 whitespace-nowrap">
                          SCANNED: {ocrResult.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {scanning && (
                    <div className="absolute top-4 left-4 bg-indigo-600/90 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 z-20">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                      SCANNING...
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <p className="font-extrabold text-slate-300">Webcam Stream Inactive</p>
                  <p className="text-xs text-slate-500 mt-1">Click "Start Stream" above to read words in real time.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── OCR DICTIONARY TABLE (Word | Meaning) ── */}
          <OCRDictionaryTable
            dictionaryEntries={dictionaryEntries}
            loading={loadingBatchDict}
            targetLang={targetLang}
            selectedWord={selectedWord || ocrResult?.text}
            onSelectWord={(entry) => {
              setSelectedWord(entry.word)
              fetchDictionaryDetails(entry.word, targetLang)
            }}
            onHoverWord={setHoveredWord}
          />
        </div>

        {/* Right Side: Rich OCR Scanner Results & Dictionary panel */}
        <div className="w-full lg:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col overflow-hidden shrink-0">
          
          {/* Header Language Selector & Heading */}
          <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Database className="text-indigo-500" size={16} /> Scanner Dictionary Results
              </h2>
            </div>

            {/* Translation Language Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Translation Target:</label>
              <div className="flex flex-wrap gap-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setTargetLang(lang.code)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      targetLang === lang.code 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {lang.flag} {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable Results area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            
            {ocrResult || selectedWord ? (
              <div className="space-y-5">
                
                {/* Active Detected Word Details */}
                {(ocrResult?.text || selectedWord) ? (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center relative overflow-hidden">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Detected Word</span>
                    <h3 className="text-2xl font-black text-slate-800 tracking-wide mt-1 uppercase">
                      {selectedWord || ocrResult?.text}
                    </h3>
                    
                    {/* Confidence bar */}
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">Confidence:</span>
                      <span className="text-[11px] font-black text-indigo-600">
                        {Math.round((ocrResult?.confidence || 1.0) * 100)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100 text-center relative">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-1">Live Scanner Active</span>
                    <p className="text-xs text-indigo-900 font-bold">Scanning for text...</p>
                    <p className="text-[11px] text-indigo-600 mt-1">Place paper with printed text inside the yellow box.</p>
                  </div>
                )}

                {/* ── RICH DICTIONARY CARD ── */}
                {loadingDict ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Loader className="animate-spin text-indigo-600" size={24} />
                    <span className="text-xs font-bold">Querying Dictionary API...</span>
                  </div>
                ) : activeDictEntry ? (
                  <div className="space-y-4">
                    
                    {/* Header info: IPA & Part of Speech */}
                    <div className="flex items-center gap-2">
                      {activeDictEntry.pos && (
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                          {activeDictEntry.pos}
                        </span>
                      )}
                      {activeDictEntry.ipa && (
                        <span className="text-xs text-slate-500 font-serif italic">{activeDictEntry.ipa}</span>
                      )}
                    </div>

                    {/* Definition meaning */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1">Definition</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        {activeDictEntry.meaning}
                      </p>
                    </div>

                    {/* Translation */}
                    {targetLang !== 'en' && activeDictEntry.translation && (
                      <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50">
                        <span className="text-[9px] font-black text-emerald-600 uppercase block tracking-wider mb-1">Translation</span>
                        <p className="text-xs text-emerald-800 font-black leading-relaxed">
                          {activeDictEntry.translation}
                        </p>
                      </div>
                    )}

                    {/* Example Sentence */}
                    {activeDictEntry.example && (
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1">Example</span>
                        <p className="text-xs text-slate-500 italic pl-3 border-l-2 border-indigo-300">
                          "{activeDictEntry.example}"
                        </p>
                      </div>
                    )}

                    {/* Synonyms & Antonyms */}
                    {activeDictEntry.synonyms?.length > 0 && (
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1.5">Synonyms</span>
                        <div className="flex flex-wrap gap-1">
                          {activeDictEntry.synonyms.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs font-semibold">
                    Meaning not available.
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <BookOpen className="mx-auto opacity-30 mb-2" size={24} />
                <p className="text-xs font-bold">Waiting for OCR Scan</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Align a word in the camera stream yellow box.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
