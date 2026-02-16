const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const AuthController = require("../controllers/AuthController");

const registerValidation = [
  body("firstName").notEmpty(),
  body("lastName").notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  body("role").isIn(["dube-admin", "dube-viewer", "wfp-admin", "wfp-viewer"]),
];
const loginValidation = [body("email").isEmail(), body("password").notEmpty()];

router.post("/register", registerValidation, AuthController.register);
router.post("/login", loginValidation, AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);

module.exports = router;
