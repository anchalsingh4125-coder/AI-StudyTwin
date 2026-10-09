import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: [true, 'Topic ID is required'],
      index: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Question options are required'],
      validate: {
        validator: function (options) {
          return Array.isArray(options) && options.length >= 2;
        },
        message: 'A question must provide at least two options',
      },
    },
    correctOptionIndex: {
      type: Number,
      required: [true, 'Correct option index is required'],
      min: [0, 'Correct option index must be non-negative'],
      validate: {
        validator: function (value) {
          return this.options ? value < this.options.length : true;
        },
        message: 'Correct option index must be within range of available options',
      },
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty level',
      },
      default: 'medium',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model('Question', questionSchema);

export default Question;
