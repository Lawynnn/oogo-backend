const mongoose = require("mongoose");

const unverifiedUsersSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        maxlength: 320
    },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    code: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: "1d"
    }
})

module.exports.unverifiedUser = mongoose.model("unverifiedUsers", unverifiedUsersSchema);