import { Link } from 'react-router-dom'
import { Camera, BrainCircuit, ScanSearch, Download, ArrowRight } from 'lucide-react'

const steps = [
  {
    num: '1',
    icon: Camera,
    title: 'Collect Dataset',
    desc: 'Use your webcam or upload images. Create different classes. Example: Class 1 - Cats, Class 2 - Dogs.',
    color: 'bg-pink-100 text-pink-600 border-pink-200',
    iconBg: 'bg-pink-500',
  },
  {
    num: '2',
    icon: BrainCircuit,
    title: 'Train Model',
    desc: 'Click Train Model. The AI learns patterns from your images in just a few seconds.',
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    iconBg: 'bg-blue-500',
  },
  {
    num: '3',
    icon: ScanSearch,
    title: 'Test Prediction',
    desc: 'Upload a new image or use your webcam. See the prediction with real-time confidence scores.',
    color: 'bg-green-100 text-green-600 border-green-200',
    iconBg: 'bg-green-500',
  },
  {
    num: '4',
    icon: Download,
    title: 'Export Model',
    desc: 'Export your trained model to use in your own apps, websites, and fun AI projects.',
    color: 'bg-purple-100 text-purple-600 border-purple-200',
    iconBg: 'bg-purple-500',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#E0F2FE] overflow-hidden font-['Nunito']">
      
      {/* HERO SECTION */}
      <section className="relative px-4 pt-20 pb-32 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Background Decor */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-1/3 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-blue-600 mb-4 tracking-wider uppercase">
            Collect • Train • Predict • Create
          </h2>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-800 mb-8 leading-tight">
            Welcome to <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">
              AI Learning Studio
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Learn Artificial Intelligence by building your own image recognition models. It's fun, fast, and easy!
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link 
              to="/workspace"
              className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg py-4.5 px-9 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <span className="text-xl">📸</span> Image Classifier
            </Link>
            
            <Link 
              to="/ocr"
              className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-lg py-4.5 px-9 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <span className="text-xl">🔍</span> OCR Text Scanner
            </Link>
          </div>
        </div>
      </section>

      {/* HOW DO I USE IT? SECTION */}
      <section className="px-4 py-24 bg-white rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-800 mb-4">
              How do I build an AI Model?
            </h2>
            <div className="w-24 h-2 bg-blue-500 mx-auto rounded-full"></div>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 relative">
            {steps.map((step, index) => (
              <div key={step.num} className="relative flex-1 w-full max-w-sm">
                
                {/* Arrow connecting cards (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 z-10 text-slate-300">
                    <ArrowRight size={32} />
                  </div>
                )}
                
                {/* Card */}
                <div className={`h-full flex flex-col p-8 rounded-3xl border-4 ${step.color} bg-white shadow-lg hover:-translate-y-2 transition-transform duration-300`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`${step.iconBg} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transform -rotate-6`}>
                      <step.icon size={28} />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider opacity-80">
                        Step {step.num}
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-800">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  )
}
