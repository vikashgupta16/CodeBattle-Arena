const mongoose = require("mongoose");

// Problem Schema
const problemSchema = new mongoose.Schema({
    problemId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    category: { type: String, required: true },
    tags: [String],
    constraints: String,
    examples: [{
        input: String,
        output: String,
        explanation: String
    }],
    testCases: [{
        input: String,
        expectedOutput: String,
        isHidden: { type: Boolean, default: false }
    }],
    hints: [String],
    timeLimit: { type: Number, default: 5000 }, // milliseconds
    memoryLimit: { type: Number, default: 256 }, // MB
    solvedCount: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Submission Schema
const submissionSchema = new mongoose.Schema({
    submissionId: { type: String, unique: true, required: true },
    userId: { type: String, required: true },
    problemId: { type: String, required: true },
    code: { type: String, required: true },
    language: { type: String, required: true },
    status: { type: String, enum: ['accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compile_error'], required: true },
    executionTime: Number,
    memoryUsed: Number,
    testCasesPassed: Number,
    totalTestCases: Number,
    submittedAt: { type: Date, default: Date.now }
});

class ProblemDBHandler {
    static Problems = mongoose.model("Problems", problemSchema);
    static Submissions = mongoose.model("Submissions", submissionSchema);

    // Get all problems with filtering
    async getProblems(filters = {}) {
        try {
            const query = {};
            
            if (filters.difficulty) {
                query.difficulty = filters.difficulty;
            }
            
            if (filters.category) {
                query.category = filters.category;
            }
            
            if (filters.tags) {
                query.tags = { $in: filters.tags };
            }

            return await ProblemDBHandler.Problems.find(query)
                .select('-testCases') // Don't expose test cases to frontend
                .sort({ difficulty: 1, solvedCount: -1 });
        } catch (error) {
            console.error('[ProblemDBHandler Error] getProblems failed:', error);
            throw error;
        }
    }

    // Get specific problem by ID
    async getProblemById(problemId) {
        try {
            return await ProblemDBHandler.Problems.findOne({ problemId })
                .select('-testCases'); // Don't expose test cases
        } catch (error) {
            console.error('[ProblemDBHandler Error] getProblemById failed:', error);
            throw error;
        }
    }

    // Get problem with test cases (for validation)
    async getProblemWithTestCases(problemId) {
        try {
            return await ProblemDBHandler.Problems.findOne({ problemId });
        } catch (error) {
            console.error('[ProblemDBHandler Error] getProblemWithTestCases failed:', error);
            throw error;
        }
    }

    // Create a new problem
    async createProblem(problemData) {
        try {
            const problem = new ProblemDBHandler.Problems(problemData);
            return await problem.save();
        } catch (error) {
            console.error('[ProblemDBHandler Error] createProblem failed:', error);
            throw error;
        }
    }

    // Submit solution
    async submitSolution(submissionData) {
        try {
            const submission = new ProblemDBHandler.Submissions(submissionData);
            return await submission.save();
        } catch (error) {
            console.error('[ProblemDBHandler Error] submitSolution failed:', error);
            throw error;
        }
    }

    // Get user submissions
    async getUserSubmissions(userId, problemId = null) {
        try {
            const query = { userId };
            if (problemId) query.problemId = problemId;
            
            return await ProblemDBHandler.Submissions.find(query)
                .sort({ submittedAt: -1 });
        } catch (error) {
            console.error('[ProblemDBHandler Error] getUserSubmissions failed:', error);
            throw error;
        }
    }

    // API Endpoints
    async endpoint_getProblems(req, res) {
        try {
            const { difficulty, category, tags } = req.query;
            const filters = {};
            
            if (difficulty) filters.difficulty = difficulty;
            if (category) filters.category = category;
            if (tags) filters.tags = tags.split(',');

            const problems = await this.getProblems(filters);
            res.json({ success: true, problems });
        } catch (error) {
            console.error('Get problems error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch problems' });
        }
    }

    async endpoint_getProblem(req, res) {
        try {
            const { problemId } = req.params;
            const problem = await this.getProblemById(problemId);
            
            if (!problem) {
                return res.status(404).json({ success: false, error: 'Problem not found' });
            }
            
            res.json({ success: true, problem });
        } catch (error) {
            console.error('Get problem error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch problem' });
        }
    }

    async endpoint_submitSolution(req, res) {
        try {
            const { problemId } = req.params;
            const { code, language } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            if (!code || !language) {
                return res.status(400).json({ success: false, error: 'Code and language are required' });
            }

            // Get problem with test cases
            const problem = await this.getProblemWithTestCases(problemId);
            if (!problem) {
                return res.status(404).json({ success: false, error: 'Problem not found' });
            }

            // This will be implemented in the next step
            res.json({ success: true, message: 'Submission endpoint ready for validation logic' });
        } catch (error) {
            console.error('Submit solution error:', error);
            res.status(500).json({ success: false, error: 'Failed to submit solution' });
        }
    }
}

module.exports = { ProblemDBHandler };
