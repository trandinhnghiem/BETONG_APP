const express =
  require('express')

const router =
  express.Router()

const vehicleController =
  require('../controllers/vehicleController')

const multer =
  require('multer')

const upload =
  multer({
    dest: 'uploads/'
  })

router.post(
  '/import',
  upload.single('file'),
  vehicleController.importExcel
)

router.get(
  '/',
  vehicleController.getVehicles
)

router.post(
  '/',
  vehicleController.createVehicle
)

module.exports =
  router