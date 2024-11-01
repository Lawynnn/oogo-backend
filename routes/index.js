const express = require("express");
const router = express.Router();
const helper = require("../helper")
require("dotenv").config();

router.get("/", helper.render("index"))
router.get("/login", helper.render("login/context"))

module.exports = router;