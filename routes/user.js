const express = require('express')

const router = express.Router();

const authenticate = require('../middleware/authenticate');

const userController = require('../controllers/user');

router.post
(
  '/signup',
  userController.createUser
);

router.post
(
  '/verify',
  userController.verifyUser
);

router.post
(
  '/resendOTP',
  userController.resendOTP
);

router.post
(
  '/signin',
  userController.loginUser
);

router.get
(
  '/fetch',

  authenticate,

  userController.fetchUserDetails
);

router.post
(
  '/update',

  authenticate,

  userController.updateUser
);


module.exports = router;
