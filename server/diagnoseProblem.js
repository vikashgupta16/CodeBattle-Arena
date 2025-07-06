import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_DB_URL);

const submissionSchema = new mongoose.Schema({
    submissionId: String,
    userId: String,
    problemId: String,
    code: String,
    language: String,
    status: String,
    executionTime: Number,
    memoryUsed: Number,
    testCasesPassed: Number,
    totalTestCases: Number,
    submittedAt: { type: Date, default: Date.now }
});

const userProblemSolvedSchema = new mongoose.Schema({
    userId: String,
    problemId: String,
    difficulty: String,
    category: String,
    firstSolvedAt: Date,
    totalAttempts: Number,
    bestSubmissionId: String
});

const problemSchema = new mongoose.Schema({
    problemId: String,
    title: String,
    difficulty: String,
    category: String
});

const userSchema = new mongoose.Schema({
    userID: String,
    name: String,
    problemsSolved: Number,
    easyCount: Number,
    mediumCount: Number,
    hardCount: Number,
    realWorldCount: Number,
    rank: Number,
    streak_count: Number
});

const Submission = mongoose.model("Submissions", submissionSchema);
const UserProblemSolved = mongoose.model("UserProblemSolved", userProblemSolvedSchema);
const Problem = mongoose.model("Problems", problemSchema);
const User = mongoose.model("Users", userSchema);

try {
    const userId = 'user_2vJVX5NCzaiuBZmuBxujpzNzOYd';
    
    // Get the very latest submission
    const latestSubmission = await Submission.findOne().sort({ submittedAt: -1 });
    
    console.log('\n=== LATEST SUBMISSION ===');
    console.log(`Time: ${latestSubmission.submittedAt}`);
    console.log(`User: ${latestSubmission.userId}`);
    console.log(`Problem: ${latestSubmission.problemId}`);
    console.log(`Status: ${latestSubmission.status}`);
    
    // Check if this is your submission
    if (latestSubmission.userId === userId && latestSubmission.status === 'accepted') {
        // Check if UserProblemSolved record exists
        const solvedRecord = await UserProblemSolved.findOne({
            userId: userId,
            problemId: latestSubmission.problemId
        });
        
        console.log('\n=== UserProblemSolved RECORD ===');
        if (solvedRecord) {
            console.log(`Problem: ${solvedRecord.problemId}`);
            console.log(`Difficulty: ${solvedRecord.difficulty}`);
            console.log(`Category: ${solvedRecord.category}`);
            console.log(`First solved: ${solvedRecord.firstSolvedAt}`);
        } else {
            console.log('NO RECORD FOUND - This is the problem!');
        }
        
        // Get the problem details
        const problem = await Problem.findOne({ problemId: latestSubmission.problemId });
        console.log('\n=== PROBLEM DETAILS ===');
        console.log(`Problem: ${problem?.problemId}`);
        console.log(`Difficulty: ${problem?.difficulty}`);
        console.log(`Category: ${problem?.category}`);
        
        // Check current user stats
        const user = await User.findOne({ userID: userId });
        console.log('\n=== CURRENT USER STATS ===');
        console.log(`Problems Solved: ${user?.problemsSolved || 0}`);
        console.log(`Easy: ${user?.easyCount || 0}`);
        console.log(`Medium: ${user?.mediumCount || 0}`);
        console.log(`Hard: ${user?.hardCount || 0}`);
        console.log(`Real World: ${user?.realWorldCount || 0}`);
        
        // Count actual solved problems
        const actualCount = await UserProblemSolved.countDocuments({ userId: userId });
        console.log(`\nActual UserProblemSolved count: ${actualCount}`);
        
        if (actualCount !== user?.problemsSolved) {
            console.log('❌ MISMATCH: User stats not updated!');
        } else {
            console.log('✅ User stats match solved count');
        }
    }
    
} catch (error) {
    console.error('Error:', error);
} finally {
    await mongoose.disconnect();
}
