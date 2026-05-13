const express  = require('express')
const router   = express.Router()
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { authenticate, authorize } = require('../middlewares/auth')
const { requirePasswordChange } = require('../middlewares/validate')
const {
  getDocuments, getDocument, createDocument, deleteDocument,
  getTrashedDocuments, restoreDocument, permanentDeleteDocument,
  bulkRestoreDocuments, bulkPermanentDeleteDocuments,
  uploadFileVersion, getDocumentTimeline,
  downloadFile, previewFile, getDocumentSummary,
  getMyTrashedDocuments, selfRestoreDocument,
  approveDocument, rejectDocument,
} = require('../controllers/document.controller')

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = req.body.doc_type || 'ri'
    const dir = path.join(__dirname, '../../uploads', docType.toLowerCase())
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
  const ext = path.extname(file.originalname).toLowerCase()
  allowed.includes(ext) ? cb(null, true) : cb(new Error('ไม่รองรับประเภทไฟล์นี้'))
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
})

const auth      = [authenticate, requirePasswordChange]
const adminOnly = [authenticate, requirePasswordChange, authorize('admin')]

// Static sub-routes (ต้องอยู่ก่อน /:id)
router.get('/summary',                      ...adminOnly, getDocumentSummary)
router.get('/trash',                        ...adminOnly, getTrashedDocuments)
router.put('/trash/bulk-restore',           ...adminOnly, bulkRestoreDocuments)
router.delete('/trash/bulk-permanent',      ...adminOnly, bulkPermanentDeleteDocuments)
router.get('/my-trash',                     ...auth,       getMyTrashedDocuments)
router.put('/my-trash/:id/restore',         ...auth,       selfRestoreDocument)
router.put('/:id/restore',                  ...adminOnly, restoreDocument)
router.put('/:id/approve',                  ...adminOnly, approveDocument)
router.put('/:id/reject',                   ...adminOnly, rejectDocument)
router.delete('/:id/permanent',             ...adminOnly, permanentDeleteDocument)

// Standard routes
router.get('/',                              ...auth,      getDocuments)
router.post('/:id/files/version', upload.array('files', 5), ...auth, uploadFileVersion)
router.get('/:id/timeline',                  ...auth,      getDocumentTimeline)
// Comment routes (nested)
router.use('/:docId/comments', require('./comment.routes'))
router.get('/:id',                           ...auth,      getDocument)
router.post('/', upload.array('files', 5),   ...auth,      createDocument)
router.delete('/:id',                        ...adminOnly, deleteDocument)
router.get('/:id/files/:fileId/download',    ...auth,      downloadFile)
router.get('/:id/files/:fileId/preview',     ...auth,      previewFile)

module.exports = router
