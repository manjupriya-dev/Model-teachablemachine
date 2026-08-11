import React, { useState } from 'react'
import { Volume2, Search, Copy, Check, BookOpen, Sparkles } from 'lucide-react'

export default function OCRDictionaryTable({
  dictionaryEntries = [],
  loading = false,
  targetLang = 'en',
  selectedWord = null,
  onSelectWord = () => {},
  onHoverWord = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)

  // Audio Text-To-Speech handler
  const handleSpeak = (e, text) => {
    e.stopPropagation()
    if (!text || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel() // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  // Filter entries based on search input
  const filteredEntries = dictionaryEntries.filter(entry => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      entry.word?.toLowerCase().includes(term) ||
      entry.meaning?.toLowerCase().includes(term) ||
      entry.translation?.toLowerCase().includes(term) ||
      entry.pos?.toLowerCase().includes(term)
    )
  })

  // Copy Word & Meaning table as text
  const handleCopyTable = () => {
    if (!dictionaryEntries.length) return
    let text = "Word\tMeaning\n"
    dictionaryEntries.forEach(entry => {
      const meaningText = targetLang !== 'en' && entry.translation ? entry.translation : entry.meaning
      text += `${entry.word}\t${meaningText}\n`
    })
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              OCR Dictionary Table
              {dictionaryEntries.length > 0 && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-black">
                  {dictionaryEntries.length} {dictionaryEntries.length === 1 ? 'Word' : 'Words'}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Retrieved dictionary meanings for detected OCR text
            </p>
          </div>
        </div>

        {/* Action Controls: Search & Copy */}
        <div className="flex items-center gap-2 shrink-0">
          {dictionaryEntries.length > 0 && (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search words..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44 transition-all"
                />
              </div>

              <button
                onClick={handleCopyTable}
                title="Copy Word & Meaning table"
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table Content Area */}
      <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Retrieving Dictionary Meanings...</span>
          </div>
        ) : dictionaryEntries.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400">
            <Sparkles className="mx-auto text-slate-300 mb-2" size={24} />
            <p className="text-xs font-extrabold text-slate-600">No Dictionary Words Detected Yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Scan an image or position printed words in the camera stream to generate the OCR Dictionary table automatically.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold sticky top-0 backdrop-blur-xs z-10">
                <th className="py-3 px-4 w-1/3 min-w-[140px]">Word</th>
                <th className="py-3 px-4 w-2/3">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="2" className="py-8 text-center text-slate-400 text-xs italic">
                    No words matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isSelected = selectedWord && selectedWord.toLowerCase() === entry.word?.toLowerCase()
                  const displayMeaning = targetLang !== 'en' && entry.translation ? entry.translation : entry.meaning

                  return (
                    <tr
                      key={idx}
                      onClick={() => onSelectWord(entry)}
                      onMouseEnter={() => onHoverWord(entry.word)}
                      onMouseLeave={() => onHoverWord(null)}
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/70 text-indigo-950 font-medium'
                          : 'hover:bg-slate-50/80 text-slate-700'
                      }`}
                    >
                      {/* Word Column */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold uppercase text-slate-900 tracking-wide group-hover:text-indigo-600 transition-colors">
                              {entry.word}
                            </span>
                            <button
                              onClick={(e) => handleSpeak(e, entry.word)}
                              title="Listen pronunciation"
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded"
                            >
                              <Volume2 size={13} />
                            </button>
                          </div>

                          {/* Extra metadata tags: POS / IPA */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {entry.pos && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase tracking-wider rounded">
                                {entry.pos}
                              </span>
                            )}
                            {entry.ipa && (
                              <span className="text-[10px] text-slate-400 font-serif italic">
                                {entry.ipa}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Meaning Column */}
                      <td className="py-3.5 px-4 align-top leading-relaxed text-slate-600">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {displayMeaning}
                          </p>

                          {/* Show English original meaning if translated */}
                          {targetLang !== 'en' && entry.translation && entry.meaning && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5">
                              En: {entry.meaning}
                            </p>
                          )}

                          {/* Example sentence if present */}
                          {entry.example && (
                            <p className="text-[11px] text-indigo-600/90 italic mt-1 bg-indigo-50/40 px-2.5 py-1 rounded-lg border-l-2 border-indigo-400">
                              "{entry.example}"
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
