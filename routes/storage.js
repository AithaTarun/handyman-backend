const express = require('express')

const router = express.Router();

const authenticate = require('../middleware/authenticate');

const storageController = require('../controllers/storage');
const multer = require("multer");

let multerStorage = multer();

router.get
(
  '/fetchProfile',

  authenticate,

  storageController.fetchProfile
)

router.post
(
  '/uploadSingleFile',

  authenticate,

  multerStorage.array('uploadFile'),

  storageController.uploadSingleFile
);

router.post
(
  '/updateSkills',

  authenticate,

  storageController.updateSkills
);

module.exports = router;
