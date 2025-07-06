import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_DB_URL);

const userProblemSolvedSchema = new mongoose.Schema({
    userId: String,
    problemId: String,
    difficulty: String,
    category: String,
    firstSolvedAt: Date,
    totalAttempts: Number,
    bestSubmissionId: String
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

const UserProblemSolved = mongoose.model("UserProblemSolved", userProblemSolvedSchema);
const User = mongoose.model("Users", userSchema);

try {
    const userId = 'user_2vJVX5NCzaiuBZmuBxujpzNzOYd';
    
    console.log('Updating user stats based on UserProblemSolved records...');
    
    // Recalculate user stats from UserProblemSolved records
    const userSolvedProblems = await UserProblemSolved.find({ userId: userId });
    
    const stats = {
        total: userSolvedProblems.length,
        easy: userSolvedProblems.filter(p => p.difficulty === 'easy').length,
        medium: userSolvedProblems.filter(p => p.difficulty === 'medium').length,
        hard: userSolvedProblems.filter(p => p.difficulty === 'hard').length,
        realWorld: userSolvedProblems.filter(p => p.difficulty === 'real-world').length
    };
    
    console.log('Calculated stats from UserProblemSolved:', stats);
    
    // Update user stats
    await User.updateOne(
        { userID: userId },
        {
            problemsSolved: stats.total,
            easyCount: stats.easy,
            mediumCount: stats.medium,
            hardCount: stats.hard,
            realWorldCount: stats.realWorld
        }
    );
    
    console.log('User stats updated successfully!');
    
    // Verify
    const updatedUser = await User.findOne({ userID: userId });
    console.log('Updated stats:', {
        problemsSolved: updatedUser.problemsSolved,
        easyCount: updatedUser.easyCount,
        mediumCount: updatedUser.mediumCount,
        hardCount: updatedUser.hardCount,
        realWorldCount: updatedUser.realWorldCount
    });
    
    // List recent problems
    console.log('\nRecent solved problems:');
    const recentSolved = await UserProblemSolved.find({ userId: userId })
        .sort({ firstSolvedAt: -1 })
        .limit(5);
    
    recentSolved.forEach((record, index) => {
        console.log(`${index + 1}. ${record.problemId} (${record.difficulty}) - ${record.firstSolvedAt}`);
    });
    
} catch (error) {
    console.error('Error:', error);
} finally {
    await mongoose.disconnect();
}
