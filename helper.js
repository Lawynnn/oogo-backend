
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cryptojs = require("crypto-js")
const config = require("./config.json")
const fs = require("fs");
const { user } = require("./database/scheme/User");
const axios = require("axios");

/**
 * @typedef ParamObjectType
 * @property {string} name
 * @property {("boolean"|"string"|"number"|"object")} type
 */

/**
 * @typedef ParamType
 * @property {string} name
 * @property {?[number, number]} len
 * @property {("boolean"|"string"|"number"|"object")} type
 * @property {?boolean} required
 * @property {?Functiom} check
 * @property {ParamObjectType[]} template
 */

/**
 * 
 * @param {ParamType[]} params 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
module.exports.paramError = (params) => {
    return async (req, res, next) => {
        for (let i = 0; i < params.length; i++) {
            let p = params[i];

            if (!p.len) p.len = [0, 512]
            if (p.required === undefined) p.required = true;
            if (!p.required) {
                continue;
            }

            if (!req.body[p.name]) {
                return res.status(400).json({
                    success: false,
                    param: p.name,
                    error: "missing",
                    message: `Parametrul ${p.name} este necesar`
                })
            }
            else {
                let param = req.body[p.name];

                if (typeof (param) === "string" && p.type === "number") {
                    param = parseInt(param);
                }
                else if (typeof (param) !== p.type) {
                    return res.status(400).json({
                        success: false,
                        param: p.name,
                        type: typeof (param),
                        expected: p.type,
                        error: "wrong_type",
                        message: `Parametrul ${p.name} trebuie sa fie de tipul ${p.type}`
                    })
                }

                if (p.check && typeof (p.check) === "function") {
                    const c = await p.check(param);
                    if (c.success) {
                        if (c.__save && c.__save.name && c.__save.data) {
                            req["__" + c.__save.name] = c.__save.data;
                        }
                        continue;
                    }

                    return res.status(400).json({
                        success: false,
                        param: p.name,
                        error: c.error,
                        metadata: c.metadata
                    });
                }

                let l = 0;
                if (typeof (param) === "string") l = param.length;
                else if (typeof (param) === "number") l = parseInt(param);

                if (l < p.len[0] || l > p.len[1]) {
                    return res.status(400).json({
                        success: false,
                        param: p.name,
                        error: "length",
                        len: p.len,
                        smaller: param.length < p.len[0] ? true : false,
                        message: `Parametrul ${p.name} trebuie sa aiba lungimea intre ${p.len[0]} si ${p.len[1]}`
                    })
                }

            }
        }
        next();
    }

}



module.exports.generateRandomCode = (length = 8) => {
    const characters = '0123456789';
    let code = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }

    return code;
}

module.exports.generateToken = (email) => {
    return jwt.sign(email, process.env.JWT_SECRET);
}

module.exports.encrypt = (data) => {
    return cryptojs.AES.encrypt(data, process.env.CRYPTO_SECRET).toString();
}

module.exports.decrypt = (data) => {
    return cryptojs.AES.decrypt(data, process.env.CRYPTO_SECRET).toString(cryptojs.enc.Utf8);
}

module.exports.render = (layout) => {
    return (req, res, next) => {
        try {
            res.set('Content-Type', 'text/html');
            let file = fs.readFileSync(`./layouts/${layout}.html`, "utf8");

            file = file.replace(/\{\{s:(.*)\}\}/g, `<link rel="stylesheet" href="css/$1.css">`)
            file = file.replace(/\{\{fa\}\}/g, `<script src="https://kit.fontawesome.com/d978b3dc24.js" crossorigin="anonymous"></script>`)
            res.send(file);
        }
        catch (e) {
            console.log(e)
            res.status(500).json({
                success: false,
                error: "render_failure"
            })
        }
    }
}

module.exports.shouldBeLogged = async (req, res, next) => {
    const authorization = req.headers["authorization"];
    if (authorization) {
        const [type, token] = authorization.split(" ");
        if (type === "Bearer") {
            try {
                const data = jwt.verify(token, process.env.JWT_SECRET);
                const u = await user.findOne({ token }).catch(e => null);

                if (!u) {
                    return res.status(401).json({
                        success: false,
                        error: "unauthorized"
                    })
                }

                req.user = {
                    id: u._id,
                    email: u.email.data,
                    locale: u.locale,
                    names: {
                        first: u.data.firstName,
                        last: u.data.lastName
                    },
                    birth: u.data.birth,
                    avatar: u.data.avatar,
                    token: u.token
                }
                req.token = token;
                return next();
            }
            catch (e) {
                return res.status(401).json({
                    success: false,
                    error: "unauthorized",
                    code: 2
                })
            }
        }
    }

    return res.status(401).json({
        success: false,
        error: "unauthorized"
    })
}

module.exports.createToken = (data) => {
    return jwt.sign(data, process.env.JWT_SECRET);
}

module.exports.verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports.isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) ? { success: true } : {
        success: false,
        error: "invalid_email_format",
        message: "Email-ul introdus nu este valid",
        metadata: {
            min_length: 6,
            max_length: 320,
            len: email.length
        }
    };
}

module.exports.isValidDate = (birthDate) => {
    const date = new Date(birthDate);

    // Check if the date is valid
    if (!(date instanceof Date) || isNaN(date)) {
        return { success: false, error: "invalid_date", message: "Data introdusa este invalida" };  // Invalid date format
    }

    const today = new Date();

    // Ensure the birth date is in the past and not too far back (e.g., 130 years)
    const ageLimit = 130;
    const yearDifference = today.getFullYear() - date.getFullYear();

    if (date > today || yearDifference > ageLimit) {
        return { success: false, error: "invalid_date", message: "Data introdusa este invalida", metadata: { error: "future_or_past_date", max_age: ageLimit } };  // Date is in the future or too far in the past
    }

    return { success: true };  // Valid birth date
}

module.exports.isValidCarModel = async (id) => {
    const carModel = await axios.get(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/all-vehicles-model/records?select=make%2C%20model%2C%20fueltype%2C%20year%2C%20id&where=id%3D"${id}"&limit=1`).catch(e => null);
    if (!carModel) {
        return { success: false, error: "invalid_car_model", message: "Modelul masinii nu a fost gasit" };
    }

    return {
        success: true, __save: {
            name: "carModel",
            data: carModel.data.results[0]
        }
    };
}

module.exports.isValidCarColor = async (color) => {
    const c = config.car_colors.find(c => c.name.toLowerCase() === color.toLowerCase());
    if (!c) {
        return { success: false, error: "invalid_car_color", message: "Culoarea masinii nu a fost gasita" };
    }

    return {
        success: true, __save: {
            name: "carColor",
            data: c
        }
    };
}