import mongoose from "mongoose";
import { UserDBHandler } from "./database.js";

// Problem Schema
const problemSchema = new mongoose.Schema({
    problemId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'real-world'], required: true },
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

// User Problem Solved Schema - tracks first-time solves
const userProblemSolvedSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    problemId: { type: String, required: true },
    difficulty: { type: String, required: true },
    category: { type: String, required: true },
    firstSolvedAt: { type: Date, default: Date.now },
    totalAttempts: { type: Number, default: 1 },
    bestSubmissionId: { type: String, required: true }
});

// Create compound index to ensure one record per user-problem pair
userProblemSolvedSchema.index({ userId: 1, problemId: 1 }, { unique: true });

class ProblemDBHandler {
    static Problems = mongoose.model("Problems", problemSchema);
    static Submissions = mongoose.model("Submissions", submissionSchema);
    static UserProblemSolved = mongoose.model("UserProblemSolved", userProblemSolvedSchema);

    constructor(userStatsService) {
        this.userStatsService = userStatsService;
    }

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

            // Support excluding specific categories (for Arena mode)
            if (filters.excludeCategories && filters.excludeCategories.length > 0) {
                query.category = { $nin: filters.excludeCategories };
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
    async getProblemById(identifier) {
        try {
            // Try to find by problemId first, then by _id
            let problem = await ProblemDBHandler.Problems.findOne({ problemId: identifier })
                .select('-testCases'); // Don't expose test cases
            
            // If not found by problemId, try by _id
            if (!problem && mongoose.Types.ObjectId.isValid(identifier)) {
                problem = await ProblemDBHandler.Problems.findById(identifier)
                    .select('-testCases');
            }
            
            return problem;
        } catch (error) {
            console.error('[ProblemDBHandler Error] getProblemById failed:', error);
            throw error;
        }
    }

    // Get problem with test cases (for validation)
    async getProblemWithTestCases(identifier) {
        try {
            // Try to find by problemId first, then by _id
            let problem = await ProblemDBHandler.Problems.findOne({ problemId: identifier });
            
            // If not found by problemId, try by _id
            if (!problem && mongoose.Types.ObjectId.isValid(identifier)) {
                problem = await ProblemDBHandler.Problems.findById(identifier);
            }
            
            return problem;
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

    // Check if user has already solved this problem
    async hasUserSolvedProblem(userId, problemId) {
        try {
            const solvedRecord = await ProblemDBHandler.UserProblemSolved.findOne({
                userId: userId,
                problemId: problemId
            });
            return !!solvedRecord;
        } catch (error) {
            console.error('[ProblemDBHandler Error] hasUserSolvedProblem failed:', error);
            return false;
        }
    }

    // Mark problem as solved for the first time
    async markProblemAsSolved(userId, problemId, difficulty, category, submissionId) {
        try {
            const solvedRecord = new ProblemDBHandler.UserProblemSolved({
                userId: userId,
                problemId: problemId,
                difficulty: difficulty,
                category: category,
                bestSubmissionId: submissionId,
                firstSolvedAt: new Date(),
                totalAttempts: 1
            });

            await solvedRecord.save();
            return true;
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key error - user already solved this problem
                // Update attempt count instead
                await ProblemDBHandler.UserProblemSolved.updateOne(
                    { userId: userId, problemId: problemId },
                    { $inc: { totalAttempts: 1 } }
                );
                return false; // Not a first-time solve
            }
            console.error('[ProblemDBHandler Error] markProblemAsSolved failed:', error);
            throw error;
        }
    }

    // Get user's solved problems statistics
    async getUserSolvedStats(userId) {
        try {
            const solvedProblems = await ProblemDBHandler.UserProblemSolved.find({ userId: userId });
            
            const stats = {
                total: solvedProblems.length,
                easy: solvedProblems.filter(p => p.difficulty === 'easy').length,
                medium: solvedProblems.filter(p => p.difficulty === 'medium').length,
                hard: solvedProblems.filter(p => p.difficulty === 'hard').length,
                categories: {}
            };

            // Count by category
            solvedProblems.forEach(problem => {
                if (!stats.categories[problem.category]) {
                    stats.categories[problem.category] = 0;
                }
                stats.categories[problem.category]++;
            });

            return stats;
        } catch (error) {
            console.error('[ProblemDBHandler Error] getUserSolvedStats failed:', error);
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

            // Check if user has already solved this problem
            const alreadySolved = await this.hasUserSolvedProblem(userId, problemId);

            // Validate solution against test cases
            const validationResult = await this.validateSolution(code, language, problem);
            
            // Create submission record
            const submission = await this.createSubmission({
                userId,
                problemId,
                code,
                language,
                difficulty: problem.difficulty,
                category: problem.category,
                ...validationResult
            });

            // If solution is accepted and this is the first time solving
            let updatedStats = null;
            let isFirstSolve = false;
            
            if (validationResult.status === 'accepted') {
                if (!alreadySolved) {
                    // Ensure difficulty and category are not undefined
                    if (!problem.difficulty || !problem.category) {
                        console.error('[SUBMISSION ERROR] Problem missing difficulty or category:', {
                            problemId: problem.problemId,
                            difficulty: problem.difficulty,
                            category: problem.category
                        });
                        throw new Error(`Problem ${problemId} has missing difficulty or category`);
                    }
                    
                    // Mark as solved and update stats only for first-time solve
                    isFirstSolve = await this.markProblemAsSolved(
                        userId, 
                        problemId, 
                        problem.difficulty, 
                        problem.category, 
                        submission.submissionId
                    );

                    if (isFirstSolve) {
                        try {
                            // Update user stats for first-time solve using new stats service
                            updatedStats = await this.userStatsService.updateUserOnProblemSolved(
                                userId, 
                                problem.difficulty, 
                                problem.category
                            );
                        } catch (statsError) {
                            console.error('Failed to update user stats:', statsError);
                            // Don't fail the submission if stats update fails
                        }
                    }
                }
            }

            res.json({ 
                success: true, 
                submission: validationResult,
                submissionId: submission.submissionId,
                updatedStats: updatedStats,
                isFirstSolve: isFirstSolve,
                alreadySolved: alreadySolved
            });
            
        } catch (error) {
            console.error('Submit solution error:', error);
            res.status(500).json({ success: false, error: 'Failed to submit solution' });
        }
    }

    // Validate solution against test cases
    async validateSolution(code, language, problem) {
        const testResults = [];
        let totalTests = problem.testCases.length;
        let passedTests = 0;
        let totalExecutionTime = 0;
        let status = 'accepted';
        let feedback = '';

        try {
            // Run code against each test case
            for (let i = 0; i < problem.testCases.length; i++) {
                const testCase = problem.testCases[i];
                const result = await this.runTestCase(code, language, testCase, problem.timeLimit);
                
                testResults.push(result);
                totalExecutionTime += result.executionTime || 0;
                
                if (result.passed) {
                    passedTests++;
                } else if (status === 'accepted') {
                    // Set status based on first failure
                    status = result.status || 'wrong_answer';
                }
            }

            // Determine overall status
            if (passedTests === totalTests) {
                status = 'accepted';
                feedback = 'All test cases passed! Well done!';
            } else {
                feedback = `${passedTests}/${totalTests} test cases passed.`;
            }

            return {
                status,
                testCasesPassed: passedTests,
                totalTestCases: totalTests,
                executionTime: totalExecutionTime / totalTests, // Average execution time
                testResults: testResults,
                feedback,
                score: Math.round((passedTests / totalTests) * 100)
            };

        } catch (error) {
            console.error('Validation error:', error);
            return {
                status: 'runtime_error',
                testCasesPassed: 0,
                totalTestCases: totalTests,
                executionTime: 0,
                testResults: [],
                feedback: 'Error during validation: ' + error.message,
                score: 0
            };
        }
    }

    // Run a single test case
    async runTestCase(code, language, testCase, timeLimit = 5000) {
        try {
            // Get available runtimes
            const runtimesReq = await fetch("https://emkc.org/api/v2/piston/runtimes");
            if (!runtimesReq.ok) {
                throw new Error("Failed to fetch available runtimes");
            }
            
            const runtimes = await runtimesReq.json();
            const langInfo = runtimes.find(e => e.language === language);
            
            if (!langInfo) {
                throw new Error(`Unsupported language: ${language}`);
            }

            // Execute code with test input
            const runReq = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    language: language,
                    version: langInfo.version,
                    files: [{ content: code }],
                    stdin: testCase.input || "",
                    run_timeout: timeLimit
                })
            });

            if (!runReq.ok) {
                throw new Error("Code execution service unavailable");
            }

            const runResult = await runReq.json();
            
            // Check for compilation errors
            if (runResult.compile && runResult.compile.code !== 0) {
                return {
                    passed: false,
                    status: 'compile_error',
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: '',
                    errorMessage: runResult.compile.stderr || 'Compilation failed',
                    executionTime: 0,
                    isHidden: testCase.isHidden
                };
            }

            // Check for runtime errors
            if (runResult.run.code !== 0) {
                return {
                    passed: false,
                    status: 'runtime_error',
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: runResult.run.stdout || '',
                    errorMessage: runResult.run.stderr || 'Runtime error occurred',
                    executionTime: runResult.run.time || 0,
                    isHidden: testCase.isHidden
                };
            }

            // Compare outputs
            const actualOutput = (runResult.run.stdout || '').trim();
            const expectedOutput = testCase.expectedOutput.trim();
            const passed = actualOutput === expectedOutput;

            return {
                passed,
                status: passed ? 'accepted' : 'wrong_answer',
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: actualOutput,
                errorMessage: passed ? '' : 'Output does not match expected result',
                executionTime: runResult.run.time || 0,
                isHidden: testCase.isHidden
            };

        } catch (error) {
            return {
                passed: false,
                status: 'runtime_error',
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: '',
                errorMessage: error.message,
                executionTime: 0,
                isHidden: testCase.isHidden
            };
        }
    }

    // Create submission record
    async createSubmission(submissionData) {
        try {
            const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const submission = new ProblemDBHandler.Submissions({
                submissionId,
                userId: submissionData.userId,
                problemId: submissionData.problemId,
                code: submissionData.code,
                language: submissionData.language,
                status: submissionData.status,
                executionTime: submissionData.executionTime,
                testCasesPassed: submissionData.testCasesPassed,
                totalTestCases: submissionData.totalTestCases
            });

            await submission.save();
            
            // Update problem statistics
            await ProblemDBHandler.Problems.updateOne(
                { problemId: submissionData.problemId },
                { 
                    $inc: { 
                        attemptCount: 1,
                        ...(submissionData.status === 'accepted' ? { solvedCount: 1 } : {})
                    }
                }
            );

            return submission;
        } catch (error) {
            console.error('Create submission error:', error);
            throw error;
        }
    }

    // API endpoint to get user's solved problems
    async endpoint_getUserSolvedProblems(req, res) {
        try {
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const solvedStats = await this.getUserSolvedStats(userId);
            const solvedProblems = await ProblemDBHandler.UserProblemSolved.find({ userId })
                .sort({ firstSolvedAt: -1 })
                .limit(50);

            res.json({
                success: true,
                stats: solvedStats,
                recentlySolved: solvedProblems
            });
            
        } catch (error) {
            console.error('Get user solved problems error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch solved problems' });
        }
    }
}

export { ProblemDBHandler };
