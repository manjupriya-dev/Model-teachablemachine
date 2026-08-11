import { BrowserRouter, Routes, Route } from 'react-router-dom'
import WorkspacePage from './pages/WorkspacePage.jsx'
import OCRWorkspacePage from './pages/OCRWorkspacePage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import Navbar from './components/Navbar.jsx'
import './index.css'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/ocr" element={<OCRWorkspacePage />} />
      </Routes>
    </BrowserRouter>
  )
}
