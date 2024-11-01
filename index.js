const express = require("express");
const session = require("express-session")
const db = require("./database")
const cors = require("cors")
require("dotenv").config()
const config = require("./config.json");

const app = express()
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use(express.static("public"))
    .use(cors({
        origin: "http://localhost:3001",
    }))
    .use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }))
    .use("/:lang/api", (req, res, next) => {
        const lang = req.params?.lang;
        if (!lang) {
            return res.redirect("/en/api");
        }

        if (!config.supported_translations.includes(lang)) {
            return res.status(400).json({
                success: false,
                error: "unknown_language",
                message: "The language you are using is not available",
                metadata: {
                    available_langs: config.supported_translations
                }
            })
        }
        else {
            req.language = lang.toLowerCase();
        }
        next();
    }, require("./routes/api"))
    .use("/", require("./routes"))

    .listen(process.env.PORT, () => {
        console.log("Server running on port", process.env.PORT);
    })