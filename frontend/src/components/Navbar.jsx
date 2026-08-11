import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()
  const isWorkspace = location.pathname === '/workspace'
  const isOcr = location.pathname === '/ocr'

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-100 shadow-sm h-20">
      <div className="w-full h-full px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="flex items-center group">
          <span className="font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-80 transition-opacity">
            AI Learning Studio
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link
            to="/workspace"
            className={`font-bold py-2.5 px-5 rounded-full transition-all duration-200 ${
              isWorkspace
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Image Builder
          </Link>
          
          <Link
            to="/ocr"
            className={`font-bold py-2.5 px-5 rounded-full transition-all duration-200 ${
              isOcr
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            OCR Scanner
          </Link>

          {(isWorkspace || isOcr) && (
            <Link 
              to="/"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-full shadow-sm hover:shadow transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Home
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
