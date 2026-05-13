const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { getAll, create, updateDocType, remove, getAllCategoriesGrouped, getCategoriesForType, createCategory, updateCategory, removeCategory } = require('../controllers/doctype.controller')

const adminOnly = [authenticate, authorize('admin')]

router.get('/',       authenticate, getAll)
router.post('/',      ...adminOnly,  create)
router.put('/:id',    ...adminOnly,  updateDocType)
router.delete('/:id', ...adminOnly,  remove)

// category routes — all-categories ต้องอยู่ก่อน /:id
router.get('/all-categories',                       authenticate, getAllCategoriesGrouped)
router.get('/:id/categories',                      authenticate, getCategoriesForType)
router.post('/:id/categories',                     ...adminOnly,  createCategory)
router.put('/:id/categories/:catId',               ...adminOnly,  updateCategory)
router.delete('/:id/categories/:catId',            ...adminOnly,  removeCategory)

module.exports = router
