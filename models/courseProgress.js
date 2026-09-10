import mongoose from "mongoose";

const lectureProgressSchema = new mongoose.Schema({
    lecture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        required: [true, 'Lecture reference is required']
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    watchTime: {
        type: Number,
        default: 0
    },
    lastWatched: {
        type: Date,
        default: Date.now
    }
});

const courseProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required']
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course reference is required']
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lectureProgress: [lectureProgressSchema],
    lastAccessed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

courseProgressSchema.index({ user: 1, course: 1 }, { unique: true });

// Update last accessed
courseProgressSchema.methods.updateLastAccessed = function() {
    this.lastAccessed = Date.now();
    return this.save({ validateBeforeSave: false });
};

export const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);