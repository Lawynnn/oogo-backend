const express = require("express");
const router = express.Router();
const helper = require("../helper");
const config = require("../config.json");
require("dotenv").config();

const { user } = require("../database/scheme/User");
const { unverifiedUser } = require("../database/scheme/UnverifiedUser")
const { userCar } = require("../database/scheme/UserCar");
const { locationMemory } = require("../database/scheme/Locations");

const { cloudinary, upload, bufferToStream } = require("../cloud");
const { default: axios } = require("axios");

router.get("/", (req, res) => {
    res.json({
        message: "Welcome to cartravel api"
    })
})

router.get("/config", (req, res) => {
    res.json({
        success: true,
        config
    })
})

router.post("/avatar", helper.shouldBeLogged, upload.single("avatar"), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            param: "avatar",
            error: "missing",
            message: "Avatarul este necesar"
        })
    }

    if (req.file.size > 1024 * 1024) {
        return res.status(400).json({
            success: false,
            error: "file_too_large",
            size: req.file.size,
            message: config.translations.file_too_large[req.language],
            metadata: {
                max: 1024 * 1024,
                measure: "bytes"
            }
        })
    }

    if (req.file.mimetype !== "image/png" && req.file.mimetype !== "image/jpeg") {
        return res.status(400).json({
            success: false,
            error: "invalid_format",
            format: req.file.mimetype,
            message: config.translations.invalid_format[req.language],
            allowed: ["image/png", "image/jpeg"]
        })
    }

    if (req)

        try {
            const stream = bufferToStream(req.file.buffer);

            const result = await new Promise((resolve, reject) => {
                const streamUpload = cloudinary.uploader.upload_stream({
                    folder: "cartravel/avatars",
                    public_id: req.user.id,
                    width: 64, height: 64, crop: "thumb"
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                });
                stream.pipe(streamUpload);
            })

            const u = await user.findOne({ token: req.user.token }).catch(e => null);
            if (u) {
                u.data.avatar = result.secure_url;
                await u.save();
            }

            res.json({
                success: true,
                url: result.secure_url
            });
        }
        catch (e) {
            console.log(e);
            res.status(500).json({
                success: false,
                error: "render_failure",
                message: config.translations.render_failure[req.language]
            })
        }
});

router.delete("/avatar", helper.shouldBeLogged, async (req, res, next) => {
    if (!req.user.avatar) {
        return res.status(400).json({
            success: false,
            error: "no_avatar"
        })
    }

    const u = await user.findOne({ token: req.user.token, "email.data": req.user.email }).catch(e => null);
    if (u) {

        await cloudinary.uploader.destroy(req.user.id, (error, result) => {
            if (error) {
                return res.status(500).json({
                    success: false,
                    error: "internal_error"
                })
            }
        });
        u.data.avatar = null;
        await u.save();

        return res.json({
            success: true
        });
    }

    res.status(500).json({
        success: false,
        error: "internal_error"
    });
})

router.post("/email-check", helper.paramError([
    { name: "email", check: helper.isValidEmail, len: config.email_len, type: "string" }
]), async (req, res, next) => {
    const { email } = req.body;
    const u = await user.findOne({ "email.data": email }).catch(e => null) || await unverifiedUser.findOne({ email }).catch(e => null);
    if (u) {
        return res.status(400).json({
            success: false,
            error: "email_exists",
            message: config.translations.email_exists[req.language]
        })
    }

    res.json({
        success: true
    })
})

router.post("/register/email", helper.paramError([
    { name: "email", check: helper.isValidEmail, len: config.email_len, type: "string" }
]), async (req, res, next) => {
    const {
        email
    } = req.body;

    const findDupes = await unverifiedUser.findOne({ email }).catch(e => null);
    if (findDupes) {
        findDupes.code = helper.generateRandomCode(config.secure_code_len);
        await findDupes.save();

        return res.json({
            success: true,
            debug: process.env.DEBUG ? {
                code: findDupes.code,
                duped: true
            } : null
        });
    }
    else {
        const dupe = await user.findOne({ "email.data": email }).catch(e => null);
        if (dupe) {
            return res.status(400).json({
                success: false,
                error: "email_exists",
                message: config.translations.email_exists[req.language]
            })
        }
    }

    const code = helper.generateRandomCode(config.secure_code_len);
    const unverified = new unverifiedUser({
        email, code
    });

    await unverified.save();

    res.json({
        success: true,
        debug: process.env.DEBUG ? {
            code
        } : null
    })
})

router.post("/register/email-verify/:code", helper.paramError([
    { name: "email", check: helper.isValidEmail, len: config.email_len, type: "string" },
    { name: "password", len: [8, 128], type: "string" },
    { name: "firstName", len: [1, 100], type: "string" },
    { name: "lastName", len: [1, 100], type: "string" },
    { name: "birth", check: helper.isValidDate, type: "number" },
    { name: "locale", type: "string", required: false, len: [2, 2] }
]), async (req, res, next) => {
    const { code } = req.params;
    const { password, firstName, lastName, birth, locale, email } = req.body;
    if (!code) {
        return res.status(400).json({
            success: false,
            error: "missing_code",
            message: config.translations.missing_code[req.language]
        })
    }

    const unverified = await unverifiedUser.findOne({ code: code, email: email }).catch(e => null);
    if (!unverified) {
        return res.status(400).json({
            success: false,
            error: "invalid_code",
            message: config.translations.invalid_code[req.language]
        })
    }

    if (unverified.verified) {
        await unverifiedUser.deleteOne({ _id: unverified._id })
        return res.status(400).json({
            success: false,
            error: "already_verified",
            message: config.translations.already_verified[req.language]
        });
    }
    unverified.verified = true;
    await unverified.save();

    const encryptedPassword = helper.encrypt(password);
    const token = helper.createToken({ email: unverified.email, locale: locale || "en" });
    const u = new user({
        token,
        email: {
            data: unverified.email,
            verified: true
        },
        password: encryptedPassword,
        locale: locale || "en", data: {
            birth: birth,
            firstName, lastName
        }
    });

    await u.save();
    await unverifiedUser.deleteOne({ _id: unverified._id })

    res.json({
        success: true,
        token
    })
})

router.post("/login/email", helper.paramError([
    { name: "email", check: helper.isValidEmail, len: config.email_len, type: "string" },
    { name: "password", len: [0, 128], type: "string" },
]), async (req, res, next) => {
    const { email, password } = req.body;

    const u = await user.findOne({ "email.data": email }).catch(e => null);
    if (!u) {
        return res.status(400).json({
            success: false,
            error: "invalid_email_or_password",
            message: config.translations.invalid_email_or_password[req.language]
        })
    }

    if (password !== helper.decrypt(u.password)) {
        return res.status(400).json({
            success: false,
            error: "invalid_email_or_password",
            message: config.translations.invalid_email_or_password[req.language]
        })
    }

    res.json({
        success: true,
        token: u.token
    })
})

router.get("/logout", helper.shouldBeLogged, (req, res, next) => {
    if (!req.token) {
        return res.status(400).json({
            success: false,
            error: "invalid_token",
            message: config.translations.invalid_token[req.language]
        })
    }

    user.findOne({ token: req.token }).then(u => {
        if (u) {
            u.token = helper.createToken({ email: u.email.data, locale: u.locale });
            u.save();
            return res.json({
                success: true
            })
        }
    }).catch(e => {
        return res.status(500).json({
            success: false,
            error: "internal_error",
            message: config.translations.internal_error[req.language]
        })
    });
})

router.get("/user", helper.shouldBeLogged, (req, res, next) => {
    res.json({
        success: true,
        user: req.user
    })
})

router.post("/cars/add", helper.shouldBeLogged, helper.paramError([
    { name: "id", check: helper.isValidCarModel, len: [1, 100], type: "string" },
    { name: "color", check: helper.isValidCarColor, len: [1, 100], type: "string" },
    { name: "plate", len: [4, 9 + 2], type: "string" },
    { name: "seats", len: [2, 6], type: "number" }
]), async (req, res, next) => {
    const { plate, seats } = req.body;

    const cars = await userCar.findOne({ "user": req.user.id }).catch(e => null);

    if (!cars) {
        const newCar = new userCar({
            user: req.user.id,
            cars: [{
                modelId: req.__carModel.id,
                model: `${req.__carModel.make} ${req.__carModel.model}`,
                year: parseInt(req.__carModel.year),
                color: `${req.__carColor.name}~${req.__carColor.hex}`,
                plate: plate,
                seats: seats
            }]
        });

        await newCar.save();
        return res.json({
            success: true,
            car: {
                model: `${req.__carModel.make} ${req.__carModel.model}`,
                year: req.__carModel.year,
                color: `${req.__carColor.name}~${req.__carColor.hex}`,
                plate: plate,
                seats: seats
            }
        })
    }

    if (cars.cars.length >= config.max_cars) {
        return res.status(400).json({
            success: false,
            error: "max_cars",
            max: config.max_cars,
            message: config.translations.max_cars[req.language],
            metadata: {
                error: "Contact owner for more cars"
            }
        })
    }

    // Duplicate check, better with PLATE CHECK
    if (cars.cars.find(c => c.modelId === req.__carModel.id ||
        c.plate === plate
    )) {
        return res.status(400).json({
            success: false,
            error: "duplicated_car",
            message: config.translations.duplicated_car[req.language]
        })
    }

    cars.cars.push({
        modelId: req.__carModel.id,
        model: `${req.__carModel.make} ${req.__carModel.model}`,
        year: parseInt(req.__carModel.year),
        color: `${req.__carColor.name}~${req.__carColor.hex}`,
        plate: plate,
        seats: seats
    });

    await cars.save();
    res.json({
        success: true,
        car: {
            id: req.__carModel.id,
            model: `${req.__carModel.make} ${req.__carModel.model}`,
            year: req.__carModel.year,
            color: `${req.__carColor.name}~${req.__carColor.hex}`,
            plate: plate,
            seats: seats
        }
    })
})

router.get("/cars", helper.shouldBeLogged, async (req, res, next) => {
    const cars = await userCar.findOne({ user: req.user.id }).catch(e => null);
    if (!cars) {
        return res.json({
            success: true,
            cars: []
        })
    }

    res.json({
        success: true,
        cars: cars.cars.map(c => {
            return {
                id: c.modelId,
                model: c.model,
                year: c.year,
                color: c.color,
                plate: c.plate,
                seats: c.seats
            }
        })
    })
});

router.get("/ride/location/:location", helper.shouldBeLogged, async (req, res) => {
    const { location } = req.params;
    if (!location) {
        return res.status(400).json({
            success: false,
            error: "missing_location",
            message: config.translations.missing_location[req.language]
        })
    }

    // search in database
    const locationsFromDatabase = await locationMemory.find({ $or: [
        { city: location.toLowerCase() },
        { country: location.toLowerCase() },
        { state: location.toLowerCase() },
        { county: location.toLowerCase() }
    ] }).catch(e => null);
    console.log(locationsFromDatabase);
    if (locationsFromDatabase && locationsFromDatabase.length) {
        return res.json({
            success: true,
            from: "database",
            data: locationsFromDatabase
        })
    }


    const r = await axios.get(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(location + " romania")}&apiKey=${process.env.GEOAPIFY_KEY}`).catch(e => null);
    if (!r) {
        return res.status(400).json({
            success: false,
            error: "location_not_found",
            message: config.translations.location_not_found[req.language]
        })
    }

    const data = r.data;
    const parsed = data.query.parsed;
    let responseData = data.features.filter(a => !a.properties.postcode).map(async f => {
        const prop = f.properties;

        const loc = new locationMemory({
            coords: [prop.lon, prop.lat],
            name: prop.formatted,
            city: parsed.city?.toLowerCase() || prop.city?.toLowerCase() || null,
            state: parsed.state?.toLowerCase() || prop.state?.toLowerCase() || null,
            country: parsed.country?.toLowerCase() || prop.country?.toLowerCase() || null,
            county: parsed.county?.toLowerCase() || prop.county?.toLowerCase() || null
        });

        await loc.save();

        return {
            country: prop.country || null,
            city: prop.city || null,
            county: prop.county || null,
            state: prop.state || null,
            coords: [prop.lon, prop.lat],
            formatted: prop.formatted || null,
            // _formatted: `${prop.city}, ${prop.county || prop.state}, ${prop.country}`
        }
    })

    responseData = await Promise.all(responseData);

    return res.json({
        success: true,
        data: responseData
    })
})

module.exports = router;