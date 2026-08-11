import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { X, Cpu, Activity, TrendingDown, TrendingUp } from 'lucide-react'

Chart.register(...registerables)

export default function TrainingProgressModal({
  isOpen,
  onClose,
  totalEpochs = 50,
  onTrainingComplete = () => {}
}) {
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [totalEpochsState, setTotalEpochsState] = useState(totalEpochs || 50)
  const [accuracy, setAccuracy] = useState(0)
  const [loss, setLoss] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [finalMetrics, setFinalMetrics] = useState(null)
  const [statusText, setStatusText] = useState('Model Training Active...')

  const lossChartRef = useRef(null)
  const accChartRef = useRef(null)
  const lossChartInstanceRef = useRef(null)
  const accChartInstanceRef = useRef(null)
  const onTrainingCompleteRef = useRef(onTrainingComplete)

  // Keep latest onTrainingComplete callback reference
  useEffect(() => {
    onTrainingCompleteRef.current = onTrainingComplete
  }, [onTrainingComplete])

  // Sync totalEpochs prop when changed
  useEffect(() => {
    if (totalEpochs) {
      setTotalEpochsState(totalEpochs)
    }
  }, [totalEpochs])

  // Initialize separated Chart.js instances for Loss and Accuracy
  useEffect(() => {
    if (!isOpen) return

    // Clean up existing charts
    if (lossChartInstanceRef.current) {
      lossChartInstanceRef.current.destroy()
      lossChartInstanceRef.current = null
    }
    if (accChartInstanceRef.current) {
      accChartInstanceRef.current.destroy()
      accChartInstanceRef.current = null
    }

    if (lossChartRef.current && accChartRef.current) {
      // 1. Loss Chart
      const lossCtx = lossChartRef.current.getContext('2d')
      const lossGradient = lossCtx.createLinearGradient(0, 0, 0, 200)
      lossGradient.addColorStop(0, 'rgba(244, 63, 94, 0.35)')
      lossGradient.addColorStop(1, 'rgba(244, 63, 94, 0.0)')

      lossChartInstanceRef.current = new Chart(lossCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Loss Function',
              data: [],
              borderColor: '#f43f5e',
              backgroundColor: lossGradient,
              fill: true,
              tension: 0.3,
              borderWidth: 2.5,
              pointRadius: 3,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 150 },
          scales: {
            x: {
              grid: { color: 'rgba(226, 232, 240, 0.8)' },
              ticks: { color: '#64748b', font: { size: 10 } },
              title: { display: true, text: 'Practice Round (Epoch)', color: '#64748b', font: { size: 10, weight: 'bold' } }
            },
            y: {
              type: 'linear',
              grid: { color: 'rgba(226, 232, 240, 0.8)' },
              ticks: { color: '#e11d48', font: { size: 10 } },
              title: { display: true, text: 'Loss Level (Lower = Better)', color: '#e11d48', font: { size: 10, weight: 'bold' } }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      })

      // 2. Accuracy Chart
      const accCtx = accChartRef.current.getContext('2d')
      const accGradient = accCtx.createLinearGradient(0, 0, 0, 200)
      accGradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)')
      accGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)')

      accChartInstanceRef.current = new Chart(accCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Accuracy',
              data: [],
              borderColor: '#10b981',
              backgroundColor: accGradient,
              fill: true,
              tension: 0.3,
              borderWidth: 2.5,
              pointRadius: 3,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 150 },
          scales: {
            x: {
              grid: { color: 'rgba(226, 232, 240, 0.8)' },
              ticks: { color: '#64748b', font: { size: 10 } },
              title: { display: true, text: 'Practice Round (Epoch)', color: '#64748b', font: { size: 10, weight: 'bold' } }
            },
            y: {
              type: 'linear',
              min: 0,
              max: 1.0,
              grid: { color: 'rgba(226, 232, 240, 0.8)' },
              ticks: {
                color: '#059669',
                font: { size: 10 },
                callback: (v) => `${(v * 100).toFixed(0)}%`
              },
              title: { display: true, text: 'Accuracy Score (Higher = Better)', color: '#059669', font: { size: 10, weight: 'bold' } }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      })
    }

    return () => {
      if (lossChartInstanceRef.current) {
        lossChartInstanceRef.current.destroy()
        lossChartInstanceRef.current = null
      }
      if (accChartInstanceRef.current) {
        accChartInstanceRef.current.destroy()
        accChartInstanceRef.current = null
      }
    }
  }, [isOpen])

  // Real-time backend API polling stream (runs ONLY when isOpen is true)
  useEffect(() => {
    if (!isOpen) return

    // Reset metrics on modal opening
    setCurrentEpoch(0)
    setAccuracy(0)
    setLoss(0)
    setIsCompleted(false)
    setFinalMetrics(null)
    setStatusText('Initializing Training Environment...')

    // Clear chart datasets on opening
    if (lossChartInstanceRef.current) {
      lossChartInstanceRef.current.data.labels = []
      lossChartInstanceRef.current.data.datasets[0].data = []
      lossChartInstanceRef.current.update()
    }
    if (accChartInstanceRef.current) {
      accChartInstanceRef.current.data.labels = []
      accChartInstanceRef.current.data.datasets[0].data = []
      accChartInstanceRef.current.update()
    }

    let pollInterval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/train/progress')
        if (res.ok) {
          const data = await res.json()
          if (data) {
            const epNum = Number(data.epoch) || 0
            const totalNum = Number(data.total_epochs) || totalEpochs || 50
            const accNum = Number(data.accuracy) || 0
            const lossNum = Number(data.loss) || 0

            setCurrentEpoch(epNum)
            if (totalNum > 0) setTotalEpochsState(totalNum)
            setAccuracy(accNum)
            setLoss(lossNum)

            if (epNum === 0 && !data.completed) {
              setStatusText('Preparing TensorFlow Dataset...')
            } else if (data.completed && epNum >= totalNum && epNum > 0) {
              setStatusText('Training Completed Successfully')
            } else {
              setStatusText(`Training Epoch ${epNum}/${totalNum}`)
            }

            // Update Loss Chart
            if (lossChartInstanceRef.current && epNum > 0) {
              const labels = lossChartInstanceRef.current.data.labels
              const epLabel = `Ep ${epNum}`
              if (!labels.includes(epLabel)) {
                labels.push(epLabel)
                lossChartInstanceRef.current.data.datasets[0].data.push(lossNum)
                lossChartInstanceRef.current.update()
              }
            }

            // Update Accuracy Chart
            if (accChartInstanceRef.current && epNum > 0) {
              const labels = accChartInstanceRef.current.data.labels
              const epLabel = `Ep ${epNum}`
              if (!labels.includes(epLabel)) {
                labels.push(epLabel)
                accChartInstanceRef.current.data.datasets[0].data.push(accNum)
                accChartInstanceRef.current.update()
              }
            }

            // Only trigger completion if data.completed is true AND epoch reached target
            if (data.completed && epNum > 0 && epNum >= totalNum) {
              setIsCompleted(true)
              setFinalMetrics({ accuracy: accNum, loss: lossNum })
              onTrainingCompleteRef.current?.({ accuracy: accNum, loss: lossNum })
              if (pollInterval) clearInterval(pollInterval)
            }
          }
        }
      } catch (err) {
        // Silent catch for network/poll errors
      }
    }, 100)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [isOpen, totalEpochs])

  if (!isOpen) return null

  const progressPercent = Math.min(100, Math.round((currentEpoch / (totalEpochsState || 1)) * 100))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 text-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
              <Cpu size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                Live TensorFlow / Keras Model Training
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isCompleted ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                }`}>
                  {isCompleted ? 'Completed' : 'In Progress'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{statusText}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">

          {/* Success Banner when finished */}
          {isCompleted && finalMetrics && (
            <div className="bg-emerald-50/80 border-2 border-emerald-400/60 rounded-2xl p-5 flex items-center gap-4 shadow-sm animate-slideDown">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wide">
                  Model Training Completed Successfully!
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-semibold">
                  Final Accuracy: <span className="text-emerald-700 font-bold">{(finalMetrics.accuracy * 100).toFixed(2)}%</span> &nbsp;|&nbsp; 
                  Final Loss: <span className="text-rose-600 font-bold">{finalMetrics.loss.toFixed(4)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar & Epoch Indicator */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                Overall Progress
              </span>
              <span className="text-xs font-black text-indigo-600 font-mono">
                Epoch {currentEpoch}/{totalEpochsState} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Key Metric Cards with Kid-Friendly Descriptions */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
              <span className="text-[11px] font-black uppercase text-indigo-600 tracking-wider block mb-1">
                🏃 Practice Round
              </span>
              <span className="text-xl font-black font-mono text-slate-800">
                {currentEpoch} / {totalEpochsState}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                AI is practicing
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
              <span className="text-[11px] font-black uppercase text-emerald-600 tracking-wider block mb-1">
                ⭐ Accuracy Score
              </span>
              <span className="text-xl font-black font-mono text-emerald-600">
                {(accuracy * 100).toFixed(2)}%
              </span>
              <span className="text-[10px] text-emerald-600/80 font-bold block mt-1">
                Higher is better!
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center shadow-xs">
              <span className="text-[11px] font-black uppercase text-rose-600 tracking-wider block mb-1">
                📉 Loss Level
              </span>
              <span className="text-xl font-black font-mono text-rose-600">
                {loss.toFixed(4)}
              </span>
              <span className="text-[10px] text-rose-600/80 font-bold block mt-1">
                Lower is better!
              </span>
            </div>
          </div>

          {/* Separated Loss & Accuracy Curves */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Loss Function Graph */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <TrendingDown size={15} /> 📉 Loss Level (Error)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">Goal: Red line should go DOWN 🎯</span>
                </div>
                <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">
                  {loss.toFixed(4)}
                </span>
              </div>
              <div className="h-56 w-full relative">
                <canvas ref={lossChartRef}></canvas>
              </div>
            </div>

            {/* 2. Model Accuracy Graph */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <TrendingUp size={15} /> ⭐ AI Accuracy Score
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">Goal: Green line should go UP to 100% 🚀</span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {(accuracy * 100).toFixed(2)}%
                </span>
              </div>
              <div className="h-56 w-full relative">
                <canvas ref={accChartRef}></canvas>
              </div>
            </div>

          </div>

          {/* Kid-Friendly Graph Explanation Guide */}
          <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <div className="text-xl shrink-0">💡</div>
            <div className="text-xs text-indigo-950 space-y-1">
              <span className="font-black text-indigo-900 block text-sm">How to read your AI's graphs:</span>
              <p>
                • <strong className="text-rose-600 font-extrabold">📉 Red Line (Loss):</strong> We want this line to go <strong>DOWN</strong> towards 0. It means the AI is reducing loss/error as it practices!
              </p>
              <p>
                • <strong className="text-emerald-600 font-extrabold">📈 Green Line (Accuracy):</strong> We want this line to go <strong>UP</strong> towards 100%. It means the AI is getting smarter and answering correctly!
              </p>
            </div>
          </div>

        </div>

        {/* Footer Controls */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              isCompleted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold'
            }`}
          >
            {isCompleted ? 'Done & Close Dashboard' : 'Close View'}
          </button>
        </div>

      </div>
    </div>
  )
}
