const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    location: [
        {
            name: {
                type: String,
                required: true
            },
            coords: {
                type: [Number],
                required: true
            }
        }
    ],
    car: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "usersCar",
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    offHours: {
        type: Number,
        required: true,
        default: 0
    },
    seats: {
        type: Number,
        required: true,
        min: 2,
        max: 6
    },
    facilities: {
        type: [{
            type: String,
            enum: ["animals_allowed", "custom_music", "smoking_allowed", "air_conditioning", "bicycle_rack", "big_space", "quiet", "fast_confirmation"]
        }],
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        required: true
    }
});

module.exports.ride = mongoose.model("rides", rideSchema);