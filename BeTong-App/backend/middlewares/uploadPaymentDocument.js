const multer = require('multer')
const fs = require('fs')

const uploadPath =
  'uploads/order-documents'

if (!fs.existsSync(uploadPath)) {

  fs.mkdirSync(uploadPath, {
    recursive: true
  })

}

const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(null, uploadPath)

    },

    filename: (
      req,
      file,
      cb
    ) => {

      const uniqueName =
        Date.now() +
        '-' +
        file.originalname

      cb(
        null,
        uniqueName
      )

    }

  })

const upload =
  multer({
    storage
  })

module.exports =
  upload