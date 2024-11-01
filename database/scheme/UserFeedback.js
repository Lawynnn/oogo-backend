const mongoose = require("mongoose");

const userFeedbackSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: false },
    stars: { type: Number, max: 5, min: 1 },
    comment: { type: String, required: true, maxlength: 64 },
    additionalComment: { type: String, required: false, maxlength: 384 }
})

module.exports.userFeedback = mongoose.model("usersFeedback", userFeedbackSchema);