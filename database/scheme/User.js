const mongoose = require("mongoose");
const config = require("../../config.json");

const userSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    locale: {
        type: String,
        default: "en",
        required: true
    },
    email: {
        verified: {
            type: Boolean,
            default: false,
        },
        data: {
            type: String,
            required: true,
            maxlength: 320
        }
    },
    phone: {
        verified: {
            type: Boolean,
            default: false
        },
        data: {
            type: String,
            required: false,
            maxlength: 32
        }
    },
    password: {
        type: String,
        required: true
    },
    data: {
        firstName: { type: String, maxlength: 90, required: true },
        lastName: { type: String, maxlength: 90, required: true },
        experience: { type: Number, min: 1, max: 3, default: 1, required: false },
        birth: {
            type: Date,
            required: true
        },
        avatar: {
            type: String,
            required: false
        },
        about: {
            type: String,
            required: false,
            maxlength: 500
        },
        social: {
            facebook: {
                type: String,
                required: false
            },
            instagram: {
                type: String,
                required: false
            },
            twitter: {
                type: String,
                required: false
            },
            tiktok: {
                type: String,
                required: false
            },
        },
        ride_preferences: {
            type: [String],
            required: false,
            enum: config.ride_preferences
        }
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        required: true
    }
})

module.exports.user = mongoose.model("users", userSchema);