const mongoose = require('mongoose');

const userCarSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    cars: [{
        modelId: {
            type: String,
            required: true
        },
        model: {
            type: String,
            required: true
        },
        year: {
            type: Number,
            required: true
        },
        color: {
            type: String,
            required: true
        },
        plate: {
            type: String,
            required: true
        },
        seats: {
            type: Number,
            required: true
        },
        luggage: {
            type: Number,
            required: false
        },
        createdAt: {
            type: Date,
            default: Date.now(),
            required: true
        }
    }]
});

module.exports.userCar = mongoose.model("usersCar", userCarSchema);