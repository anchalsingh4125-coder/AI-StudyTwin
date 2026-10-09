import mongoose from 'mongoose';
import Subject from '../models/subject.model.js';
import Topic from '../models/topic.model.js';
import Question from '../models/question.model.js';

/**
 * @desc    Get all available subjects
 * @route   GET /api/v1/subjects
 * @access  Private (Authenticated users)
 */
export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error('[GetSubjects Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve subjects.',
    });
  }
};

/**
 * @desc    Get all topics associated with a specific subject
 * @route   GET /api/v1/subjects/:id/topics
 * @access  Private (Authenticated users)
 */
export const getTopicsBySubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format.',
      });
    }

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found.',
      });
    }

    const topics = await Topic.find({ subjectId: id }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: topics.length,
      data: topics,
    });
  } catch (error) {
    console.error('[GetTopicsBySubject Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve topics for the given subject.',
    });
  }
};

/**
 * @desc    Get all questions associated with a specific topic
 * @route   GET /api/v1/topics/:id/questions
 * @access  Private (Authenticated users)
 */
export const getQuestionsByTopic = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topic ID format.',
      });
    }

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found.',
      });
    }

    const questions = await Question.find({ topicId: id }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error) {
    console.error('[GetQuestionsByTopic Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve questions for the given topic.',
    });
  }
};
