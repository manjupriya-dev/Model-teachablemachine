import { useState, useRef, useCallback } from 'react'
import ClassPanel from '../components/ClassPanel.jsx'
import TrainingPanel from '../components/TrainingPanel.jsx'
import PreviewPanel from '../components/PreviewPanel.jsx'
import TrainingProgressModal from '../components/TrainingProgressModal.jsx'

export default function WorkspacePage() {
  const [classes, setClasses] = useState([
    { id: 1, name: 'Class 1', samples: [] },
    { id: 2, name: 'Class 2', samples: [] },
  ])
  const [trained, setTrained] = useState(false)
  const [training, setTraining] = useState(false)
  const [showTrainingModal, setShowTrainingModal] = useState(false)
  const [targetEpochs, setTargetEpochs] = useState(50)
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const nextId = useRef(3)

  const addClass = () => {
    setClasses(c => [...c, {
      id: nextId.current++,
      name: `Class ${nextId.current - 1}`,
      samples: [],
    }])
    setTrained(false)
    setPrediction(null)
  }

  const removeClass = (id) => {
    setClasses(c => c.filter(cls => cls.id !== id))
    setTrained(false)
    setPrediction(null)
  }

  const renameClass = (id, name) => {
    setClasses(c => c.map(cls => cls.id === id ? { ...cls, name } : cls))
  }

  const addSamples = (id, files) => {
    try {
      setClasses(c => {
        const classExists = c.find(cls => cls.id === id);
        if (!classExists) {
          alert(`WorkspacePage: Class with id ${id} not found in state!`);
          return c;
        }
        
        return c.map(cls => {
          if (cls.id !== id) return cls
          const newSamples = Array.from(files).map(f => ({
            id: Math.random().toString(36).slice(2),
            url: URL.createObjectURL(f),
            file: f,
          }))
          return { ...cls, samples: [...cls.samples, ...newSamples] }
        });
      });
      setTrained(false);
      setPrediction(null);
    } catch (err) {
      alert(`WorkspacePage Error: ${err.message}`);
    }
  }

  const addCameraSample = (id, blob, url) => {
    setClasses(c => c.map(cls => {
      if (cls.id !== id) return cls
      return {
        ...cls,
        samples: [...cls.samples, {
          id: Math.random().toString(36).slice(2),
          url,
          file: new File([blob], 'webcam.jpg', { type: 'image/jpeg' }),
        }]
      }
    }))
    setTrained(false)
    setPrediction(null)
  }

  const removeSample = (classId, sampleId) => {
    setClasses(c => c.map(cls => {
      if (cls.id !== classId) return cls
      return { ...cls, samples: cls.samples.filter(s => s.id !== sampleId) }
    }))
  }

  const handleTrain = async (params) => {
    const epochs = params?.epochs || 50
    setTargetEpochs(epochs)
    setShowTrainingModal(true)
    setTraining(true)
    setPrediction(null)
    try {
      const { trainModel } = await import('../utils/api.js')
      const result = await trainModel(classes, params)
      console.log('Training result:', result)
      setTrained(true)
    } catch (err) {
      console.error(err)
      alert(`Training failed: ${err.response?.data?.detail || err.message}`)
      setTrained(false)
    } finally {
      setTraining(false)
    }
  }

  const handlePredict = useCallback(async (file) => {
    if (!trained) return
    setPredicting(true)
    try {
      const { predictImage } = await import('../utils/api.js')
      const result = await predictImage(file)
      setPrediction(result)
    } catch (err) {
      setPrediction({ error: err.response?.data?.detail || err.message })
    } finally {
      setPredicting(false)
    }
  }, [trained])

  const totalSamples = classes.reduce((s, c) => s + c.samples.length, 0)
  const canTrain = classes.length >= 2 && classes.every(c => c.samples.length > 0)

  const handleTrainingComplete = useCallback(() => {
    setTrained(true)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      

      <div className="workspace-layout" style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        padding: '16px 24px 32px',
        overflowY: 'auto',
        overflowX: 'auto',
      }}>
        {/* ── Classes column ── */}
        <div className="workspace-col" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 280, maxWidth: 360, width: '34%' }}>
          {classes.map(cls => (
            <ClassPanel
              key={cls.id}
              cls={cls}
              onRename={(name) => renameClass(cls.id, name)}
              onRemove={classes.length > 2 ? () => removeClass(cls.id) : null}
              onAddFiles={(files) => addSamples(cls.id, files)}
              onAddCameraSample={(blob, url) => addCameraSample(cls.id, blob, url)}
              onRemoveSample={(sid) => removeSample(cls.id, sid)}
            />
          ))}

          {/* Add a class */}
          <button onClick={addClass} style={{
            border: '3px dashed var(--border-bright)',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--white)',
            color: 'var(--primary)',
            padding: '14px',
            fontSize: '0.95rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            boxShadow: 'var(--shadow)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
          >
            <div style={{
              background: 'var(--primary-light)',
              borderRadius: '50%',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            Add a New Class
          </button>
        </div>

        {/* ── Connector SVG ── */}
        <Connector />

        {/* ── Training column ── */}
        <div className="workspace-col" style={{ minWidth: 210, maxWidth: 260, flex: '0 1 230px' }}>
          <TrainingPanel
            canTrain={canTrain}
            training={training}
            trained={trained}
            classCount={classes.length}
            totalSamples={totalSamples}
            onTrain={handleTrain}
          />
        </div>

        {/* ── Connector SVG ── */}
        <Connector />

        {/* ── Preview column ── */}
        <div className="workspace-col" style={{ minWidth: 260, maxWidth: 330, flex: '0 1 310px' }}>
          <PreviewPanel
            trained={trained}
            classes={classes}
            predicting={predicting}
            prediction={prediction}
            onPredict={handlePredict}
          />
        </div>
      </div>

      {/* Real-time Model Training Pop-Up Modal */}
      <TrainingProgressModal
        isOpen={showTrainingModal}
        onClose={() => setShowTrainingModal(false)}
        totalEpochs={targetEpochs}
        onTrainingComplete={handleTrainingComplete}
      />
    </div>
  )
}

function Connector() {
  return (
    <div className="connector" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', marginTop: 40 }}>
      <svg width="32" height="32" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="var(--white)" stroke="var(--border-bright)" strokeWidth="3" />
        <path d="M14 20h12M20 14v12" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  )
}
