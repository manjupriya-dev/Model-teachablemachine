import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 300000, // 5 minutes to allow for model training
})

export const predictImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getModelInfo = async () => {
  const response = await api.get('/model-info')
  return response.data
}

export const checkHealth = async () => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000'}/health`
  )
  return response.data
}

export const trainModel = async (classes, params) => {
  const formData = new FormData()
  
  classes.forEach(cls => {
    cls.samples.forEach(sample => {
      formData.append('files', sample.file)
      formData.append('labels', cls.name)
    })
  })
  
  formData.append('epochs', params.epochs || 10)
  formData.append('batch_size', params.batchSize || 16)
  formData.append('learning_rate', params.learningRate || 0.001)

  const response = await api.post('/train', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const performOCR = async (file, roi = null) => {
  const formData = new FormData()
  formData.append('file', file)
  if (roi) {
    if (roi.x !== undefined && roi.x !== null) formData.append('x', Math.round(roi.x))
    if (roi.y !== undefined && roi.y !== null) formData.append('y', Math.round(roi.y))
    if (roi.width !== undefined && roi.width !== null) formData.append('width', Math.round(roi.width))
    if (roi.height !== undefined && roi.height !== null) formData.append('height', Math.round(roi.height))
    if (roi.videoWidth !== undefined && roi.videoWidth !== null) formData.append('video_width', Math.round(roi.videoWidth))
    if (roi.videoHeight !== undefined && roi.videoHeight !== null) formData.append('video_height', Math.round(roi.videoHeight))
  }
  const response = await api.post('/ocr/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getVocabulary = async () => {
  const response = await api.get('/ocr/vocabulary')
  return response.data
}

export const addVocabularyWord = async (word, meaning) => {
  const response = await api.post('/ocr/vocabulary', { word, meaning })
  return response.data
}

/**
 * Upload an image for full-image OCR scan.
 * Returns all detected words with bounding boxes and confidence scores.
 * @param {File} file - The image file to scan
 * @returns {Promise<ImageScanResponse>}
 */
export const scanImageForDictionary = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/ocr/image-scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

/**
 * Look up rich dictionary data for a single word.
 * @param {string} word - The word to look up
 * @param {string} lang - Target language code (en, ta, hi, te, ml, kn)
 * @returns {Promise<DictionaryEntry>}
 */
export const lookupWord = async (word, lang = 'en') => {
  const response = await api.get(`/dictionary/${encodeURIComponent(word)}`, {
    params: { lang },
  })
  return response.data
}

/**
 * Look up dictionary data for multiple detected OCR words.
 * @param {Array<string>} words - Array of words
 * @param {string} lang - Target language code
 * @returns {Promise<{success: boolean, entries: Array<DictionaryEntry>}>}
 */
export const lookupBatchWords = async (words, lang = 'en') => {
  const response = await api.post('/dictionary/batch', { words, lang })
  return response.data
}

export default api
