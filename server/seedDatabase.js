const mongoose = require("mongoose");
const { ProblemDBHandler } = require("./problemDatabase.js");
require('dotenv').config();

// Initial problem data - extracted from all HTML files
const initialProblems = [
    // EASY PROBLEMS (from beginner.html)
    {
        problemId: "hello-world",
        title: "Hello World",
        description: "Write a program that prints 'Hello, World!' to the console.",
        difficulty: "easy",
        category: "basics",
        tags: ["basics", "output"],
        constraints: "No input required",
        examples: [
            {
                input: "",
                output: "Hello, World!",
                explanation: "Simply print the string 'Hello, World!'"
            }
        ],
        testCases: [
            {
                input: "",
                expectedOutput: "Hello, World!",
                isHidden: false
            }
        ],
        hints: ["Use print() in Python, System.out.println() in Java, or console.log() in JavaScript"]
    },
    {
        problemId: "sum-two-numbers",
        title: "Sum of Two Numbers",
        description: "Write a program that takes two integers as input and prints their sum.",
        difficulty: "easy",
        category: "basics",
        tags: ["basics", "arithmetic", "input-output"],
        constraints: "Input will be two integers separated by space, range: -10^9 to 10^9",
        examples: [
            {
                input: "5 3",
                output: "8",
                explanation: "5 + 3 = 8"
            },
            {
                input: "-2 7",
                output: "5",
                explanation: "-2 + 7 = 5"
            }
        ],
        testCases: [
            { input: "5 3", expectedOutput: "8", isHidden: false },
            { input: "-2 7", expectedOutput: "5", isHidden: false },
            { input: "0 0", expectedOutput: "0", isHidden: true },
            { input: "1000000000 -1000000000", expectedOutput: "0", isHidden: true }
        ],
        hints: ["Read two integers from input", "Add them together", "Print the result"]
    },
    {
        problemId: "even-or-odd",
        title: "Even or Odd",
        description: "Write a program that takes an integer as input and determines if it's even or odd.",
        difficulty: "easy",
        category: "basics",
        tags: ["basics", "conditionals", "modular-arithmetic"],
        constraints: "Input will be a single integer, range: -10^9 to 10^9",
        examples: [
            {
                input: "4",
                output: "Even",
                explanation: "4 is divisible by 2, so it's even"
            },
            {
                input: "7",
                output: "Odd",
                explanation: "7 is not divisible by 2, so it's odd"
            }
        ],
        testCases: [
            { input: "4", expectedOutput: "Even", isHidden: false },
            { input: "7", expectedOutput: "Odd", isHidden: false },
            { input: "0", expectedOutput: "Even", isHidden: true },
            { input: "-3", expectedOutput: "Odd", isHidden: true }
        ],
        hints: ["Use the modulo operator (%)", "If number % 2 == 0, it's even", "Otherwise, it's odd"]
    },
    {
        problemId: "find-maximum",
        title: "Find Maximum",
        description: "Write a program that takes two integers as input and prints the larger one.",
        difficulty: "easy",
        category: "basics",
        tags: ["basics", "conditionals", "comparison"],
        constraints: "Input will be two integers separated by space, range: -10^9 to 10^9",
        examples: [
            {
                input: "15 8",
                output: "15",
                explanation: "15 is greater than 8"
            },
            {
                input: "3 9",
                output: "9",
                explanation: "9 is greater than 3"
            }
        ],
        testCases: [
            { input: "15 8", expectedOutput: "15", isHidden: false },
            { input: "3 9", expectedOutput: "9", isHidden: false },
            { input: "5 5", expectedOutput: "5", isHidden: true },
            { input: "-10 -20", expectedOutput: "-10", isHidden: true }
        ],
        hints: ["Compare the two numbers using if-else", "Return the larger value"]
    },
    {
        problemId: "multiplication-table",
        title: "Multiplication Table",
        description: "Write a program to print the multiplication table of a number.",
        difficulty: "easy",
        category: "basics",
        tags: ["loops", "multiplication", "tables"],
        constraints: "Input will be a positive integer n, 1 ≤ n ≤ 20",
        examples: [
            {
                input: "3",
                output: "3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30",
                explanation: "Print the multiplication table of 3 from 1 to 10"
            }
        ],
        testCases: [
            { input: "3", expectedOutput: "3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30", isHidden: false },
            { input: "5", expectedOutput: "5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50", isHidden: true }
        ],
        hints: ["Use a loop from 1 to 10", "Print 'n x i = n*i' for each iteration"]
    },
    {
        problemId: "simple-interest",
        title: "Simple Interest Calculator",
        description: "Write a program to calculate simple interest given principal, rate, and time.",
        difficulty: "easy",
        category: "mathematics",
        tags: ["mathematics", "formula", "calculation"],
        constraints: "Principal, rate, and time will be positive numbers",
        examples: [
            {
                input: "1000 5 2",
                output: "100.0",
                explanation: "Simple Interest = (1000 * 5 * 2) / 100 = 100"
            }
        ],
        testCases: [
            { input: "1000 5 2", expectedOutput: "100.0", isHidden: false },
            { input: "5000 10 3", expectedOutput: "1500.0", isHidden: true }
        ],
        hints: ["Formula: SI = (P * R * T) / 100", "P = Principal, R = Rate, T = Time"]
    },
    {
        problemId: "swap-numbers",
        title: "Swap Two Numbers",
        description: "Write a program to swap two numbers using a temporary variable.",
        difficulty: "easy",
        category: "basics",
        tags: ["variables", "swapping", "basics"],
        constraints: "Input will be two integers",
        examples: [
            {
                input: "10 20",
                output: "After swapping: a = 20, b = 10",
                explanation: "Swap the values using a temporary variable"
            }
        ],
        testCases: [
            { input: "10 20", expectedOutput: "After swapping: a = 20, b = 10", isHidden: false },
            { input: "5 7", expectedOutput: "After swapping: a = 7, b = 5", isHidden: true }
        ],
        hints: ["Use a temporary variable to hold one value", "Then reassign the variables"]
    },

    // MEDIUM PROBLEMS (from Intermediate.html)
    {
        problemId: "array-sum-even",
        title: "Array Manipulation",
        description: "Implement a program that takes an array of integers and returns the sum of all even numbers.",
        difficulty: "medium",
        category: "arrays",
        tags: ["arrays", "loops", "conditionals"],
        constraints: "Array length: 1 ≤ n ≤ 1000, Elements: -1000 ≤ arr[i] ≤ 1000",
        examples: [
            {
                input: "5\n1 2 3 4 5",
                output: "6",
                explanation: "Even numbers are 2 and 4, sum = 2 + 4 = 6"
            }
        ],
        testCases: [
            { input: "5\n1 2 3 4 5", expectedOutput: "6", isHidden: false },
            { input: "4\n2 4 6 8", expectedOutput: "20", isHidden: true }
        ],
        hints: ["Check if each number is even using modulo operator", "Add even numbers to a running sum"]
    },
    {
        problemId: "string-reversal",
        title: "String Reversal",
        description: "Write a program that reverses a given string without using built-in functions.",
        difficulty: "medium",
        category: "strings",
        tags: ["strings", "loops", "algorithms"],
        constraints: "String length: 1 ≤ n ≤ 1000",
        examples: [
            {
                input: "hello",
                output: "olleh",
                explanation: "Reverse the string character by character"
            }
        ],
        testCases: [
            { input: "hello", expectedOutput: "olleh", isHidden: false },
            { input: "world", expectedOutput: "dlrow", isHidden: true }
        ],
        hints: ["Use a loop to iterate through the string backwards", "Build the reversed string character by character"]
    },
    {
        problemId: "palindrome-checker",
        title: "Palindrome Checker",
        description: "Check if a given string or number is a palindrome.",
        difficulty: "medium",
        category: "strings",
        tags: ["strings", "palindrome", "algorithms"],
        constraints: "Input will be a string of length 1 ≤ n ≤ 1000",
        examples: [
            {
                input: "racecar",
                output: "Yes",
                explanation: "racecar reads the same forwards and backwards"
            },
            {
                input: "hello",
                output: "No",
                explanation: "hello does not read the same forwards and backwards"
            }
        ],
        testCases: [
            { input: "racecar", expectedOutput: "Yes", isHidden: false },
            { input: "hello", expectedOutput: "No", isHidden: false },
            { input: "madam", expectedOutput: "Yes", isHidden: true },
            { input: "12321", expectedOutput: "Yes", isHidden: true }
        ],
        hints: ["Compare characters from start and end moving inward", "Ignore case if specified"]
    },
    {
        problemId: "bubble-sort",
        title: "Bubble Sort Algorithm",
        description: "Implement bubble sort on an array of integers.",
        difficulty: "medium",
        category: "algorithms",
        tags: ["sorting", "algorithms", "arrays"],
        constraints: "Array length: 1 ≤ n ≤ 100",
        examples: [
            {
                input: "5\n64 34 25 12 22",
                output: "12 22 25 34 64",
                explanation: "Sort the array in ascending order using bubble sort"
            }
        ],
        testCases: [
            { input: "5\n64 34 25 12 22", expectedOutput: "12 22 25 34 64", isHidden: false },
            { input: "3\n3 1 2", expectedOutput: "1 2 3", isHidden: true }
        ],
        hints: ["Compare adjacent elements and swap if they're in wrong order", "Repeat until no more swaps are needed"]
    },
    {
        problemId: "binary-search",
        title: "Binary Search",
        description: "Implement binary search on a sorted array.",
        difficulty: "medium",
        category: "algorithms",
        tags: ["search", "algorithms", "arrays"],
        constraints: "Array is sorted, length: 1 ≤ n ≤ 1000",
        examples: [
            {
                input: "5\n1 3 5 7 9\n5",
                output: "2",
                explanation: "Element 5 is found at index 2 (0-based)"
            }
        ],
        testCases: [
            { input: "5\n1 3 5 7 9\n5", expectedOutput: "2", isHidden: false },
            { input: "5\n1 3 5 7 9\n10", expectedOutput: "-1", isHidden: true }
        ],
        hints: ["Divide the search space in half each iteration", "Compare with middle element"]
    },
    {
        problemId: "factorial",
        title: "Factorial",
        description: "Write a program that calculates the factorial of a given non-negative integer n.",
        difficulty: "medium",
        category: "mathematics",
        tags: ["recursion", "loops", "mathematics"],
        constraints: "Input will be a non-negative integer, 0 ≤ n ≤ 20",
        examples: [
            {
                input: "5",
                output: "120",
                explanation: "5! = 5 × 4 × 3 × 2 × 1 = 120"
            },
            {
                input: "0",
                output: "1",
                explanation: "0! is defined as 1"
            }
        ],
        testCases: [
            { input: "5", expectedOutput: "120", isHidden: false },
            { input: "0", expectedOutput: "1", isHidden: false },
            { input: "1", expectedOutput: "1", isHidden: true },
            { input: "10", expectedOutput: "3628800", isHidden: true }
        ],
        hints: ["Factorial of n is n × (n-1) × ... × 1", "0! = 1 by definition", "You can use recursion or loops"]
    },
    {
        problemId: "fibonacci",
        title: "Fibonacci Numbers",
        description: "Write a program that prints the first n numbers of the Fibonacci sequence.",
        difficulty: "medium",
        category: "mathematics",
        tags: ["recursion", "dynamic-programming", "sequences"],
        constraints: "Input will be a positive integer, 1 ≤ n ≤ 30",
        examples: [
            {
                input: "5",
                output: "0 1 1 2 3",
                explanation: "First 5 Fibonacci numbers: 0, 1, 1, 2, 3"
            }
        ],
        testCases: [
            { input: "5", expectedOutput: "0 1 1 2 3", isHidden: false },
            { input: "1", expectedOutput: "0", isHidden: true },
            { input: "8", expectedOutput: "0 1 1 2 3 5 8 13", isHidden: true }
        ],
        hints: ["First two numbers are 0 and 1", "Each subsequent number is sum of previous two", "Print numbers separated by spaces"]
    },

    // HARD PROBLEMS (from Advanced.html + complex ones)
    {
        problemId: "prime-range",
        title: "Prime Number Range",
        description: "Write a program to print all prime numbers in a given range.",
        difficulty: "hard",
        category: "mathematics",
        tags: ["mathematics", "primes", "optimization"],
        constraints: "Range: 1 ≤ start ≤ end ≤ 10000",
        examples: [
            {
                input: "10 30",
                output: "11 13 17 19 23 29",
                explanation: "Prime numbers between 10 and 30"
            }
        ],
        testCases: [
            { input: "10 30", expectedOutput: "11 13 17 19 23 29", isHidden: false },
            { input: "1 10", expectedOutput: "2 3 5 7", isHidden: true }
        ],
        hints: ["Check divisibility up to square root of the number", "Use the Sieve of Eratosthenes for efficiency"]
    },
    {
        problemId: "matrix-multiplication",
        title: "Matrix Multiplication",
        description: "Multiply two matrices and display the result.",
        difficulty: "hard",
        category: "mathematics",
        tags: ["matrices", "mathematics", "algorithms"],
        constraints: "Matrix dimensions: 1 ≤ rows, cols ≤ 10",
        examples: [
            {
                input: "2 2\n1 2\n3 4\n2 2\n5 6\n7 8",
                output: "19 22\n43 50",
                explanation: "Multiply two 2x2 matrices"
            }
        ],
        testCases: [
            { input: "2 2\n1 2\n3 4\n2 2\n5 6\n7 8", expectedOutput: "19 22\n43 50", isHidden: false }
        ],
        hints: ["Check if matrices can be multiplied (columns of first = rows of second)", "Use three nested loops for multiplication"]
    },
    {
        problemId: "string-anagram",
        title: "String Anagram Check",
        description: "Write a program to check if two strings are anagrams.",
        difficulty: "hard",
        category: "strings",
        tags: ["strings", "algorithms", "sorting"],
        constraints: "String length: 1 ≤ n ≤ 1000",
        examples: [
            {
                input: "listen\nsilent",
                output: "Yes",
                explanation: "Both strings contain the same characters with same frequency"
            }
        ],
        testCases: [
            { input: "listen\nsilent", expectedOutput: "Yes", isHidden: false },
            { input: "hello\nworld", expectedOutput: "No", isHidden: true }
        ],
        hints: ["Sort both strings and compare", "Or count frequency of each character"]
    },

    // REAL-WORLD PROJECT PROBLEMS
    // Game Development Projects
    {
        problemId: "tic-tac-toe",
        title: "Tic Tac Toe Game",
        description: "Implement a two-player Tic Tac Toe game with a console or GUI interface.",
        difficulty: "easy",
        category: "games",
        tags: ["games", "logic", "arrays"],
        constraints: "3x3 grid, two players, check win conditions",
        examples: [
            {
                input: "Player moves: (0,0), (1,1), (0,1), (1,0), (0,2)",
                output: "Player 1 wins!",
                explanation: "Player 1 gets three X's in the top row"
            }
        ],
        testCases: [
            { input: "1 1\n2 2\n1 2\n2 1\n1 3", expectedOutput: "Player 1 wins!", isHidden: false }
        ],
        hints: ["Use a 3x3 array to represent the board", "Check rows, columns, and diagonals for win conditions"]
    },
    {
        problemId: "hangman-game",
        title: "Hangman Game",
        description: "Create a word-guessing game where players try to guess a hidden word letter by letter.",
        difficulty: "easy",
        category: "games",
        tags: ["games", "strings", "logic"],
        constraints: "Word length: 3-10 characters, maximum 6 wrong guesses",
        examples: [
            {
                input: "PYTHON\na p y t h o n",
                output: "You won! The word was PYTHON",
                explanation: "Player correctly guessed all letters"
            }
        ],
        testCases: [
            { input: "PYTHON\na p y t h o n", expectedOutput: "You won! The word was PYTHON", isHidden: false }
        ],
        hints: ["Keep track of guessed letters", "Display word with blanks for unguessed letters", "Count wrong guesses"]
    },
    {
        problemId: "number-guessing",
        title: "Number Guessing Game",
        description: "Develop a game where the player guesses a randomly generated number within a limited range.",
        difficulty: "easy",
        category: "games",
        tags: ["games", "random", "loops"],
        constraints: "Number range: 1-100, maximum 7 attempts",
        examples: [
            {
                input: "Target: 42\nGuesses: 50, 25, 35, 40, 42",
                output: "Congratulations! You guessed it in 5 attempts.",
                explanation: "Player found the number within allowed attempts"
            }
        ],
        testCases: [
            { input: "42\n50 25 35 40 42", expectedOutput: "Congratulations! You guessed it in 5 attempts.", isHidden: false }
        ],
        hints: ["Generate a random number in the specified range", "Provide 'higher' or 'lower' feedback", "Count attempts"]
    },

    // Web Development Projects
    {
        problemId: "todo-list",
        title: "To-Do List Application",
        description: "Develop a to-do list app with features to add, delete, and mark tasks as complete.",
        difficulty: "easy",
        category: "web",
        tags: ["web", "crud", "javascript"],
        constraints: "Support CRUD operations, data persistence",
        examples: [
            {
                input: "Add: 'Buy groceries', 'Study Python'\nComplete: 'Buy groceries'\nDelete: 'Study Python'",
                output: "Task list updated successfully",
                explanation: "Basic task management operations"
            }
        ],
        testCases: [
            { input: "add Buy groceries\nadd Study Python\ncomplete 1\ndelete 2", expectedOutput: "Task list updated successfully", isHidden: false }
        ],
        hints: ["Use arrays or objects to store tasks", "Implement add, remove, and toggle completion functions", "Consider using local storage for persistence"]
    },
    {
        problemId: "weather-app",
        title: "Weather App",
        description: "Create an application that fetches and displays weather data from a public API.",
        difficulty: "medium",
        category: "web",
        tags: ["web", "api", "json"],
        constraints: "Use a weather API, handle API errors, display temperature and conditions",
        examples: [
            {
                input: "City: London",
                output: "London: 15°C, Cloudy",
                explanation: "Fetch and display weather data for the specified city"
            }
        ],
        testCases: [
            { input: "London", expectedOutput: "London: 15°C, Cloudy", isHidden: false }
        ],
        hints: ["Use fetch() to call weather API", "Handle JSON response", "Display relevant weather information"]
    },
    {
        problemId: "expense-tracker",
        title: "Expense Tracker",
        description: "Build an app where users can log expenses, view charts, and manage their budget.",
        difficulty: "medium",
        category: "web",
        tags: ["web", "finance", "data-visualization"],
        constraints: "Categories for expenses, date tracking, budget limits",
        examples: [
            {
                input: "Add: Food $25, Transport $10, Entertainment $50",
                output: "Total expenses: $85, Budget remaining: $15",
                explanation: "Track expenses and calculate remaining budget"
            }
        ],
        testCases: [
            { input: "Food 25\nTransport 10\nEntertainment 50\nbudget 100", expectedOutput: "Total expenses: $85, Budget remaining: $15", isHidden: false }
        ],
        hints: ["Categorize expenses", "Calculate totals and remainders", "Use charts for visualization"]
    },

    // AI/ML Projects  
    {
        problemId: "sentiment-analysis",
        title: "Sentiment Analysis Tool",
        description: "Analyze text (e.g., tweets) to detect positive/negative mood using natural language processing.",
        difficulty: "hard",
        category: "ai",
        tags: ["ai", "nlp", "machine-learning"],
        constraints: "Classify text as positive, negative, or neutral",
        examples: [
            {
                input: "I love this product!",
                output: "Positive (confidence: 0.85)",
                explanation: "Analyze sentiment of the input text"
            }
        ],
        testCases: [
            { input: "I love this product!", expectedOutput: "Positive", isHidden: false },
            { input: "This is terrible", expectedOutput: "Negative", isHidden: true }
        ],
        hints: ["Use word polarity scores", "Count positive vs negative words", "Consider using pre-trained models"]
    },
    {
        problemId: "spam-classifier",
        title: "Spam Message Classifier",
        description: "Train a model to classify messages as spam or not using machine learning techniques.",
        difficulty: "medium",
        category: "ai",
        tags: ["ai", "classification", "text-processing"],
        constraints: "Binary classification: spam or not spam",
        examples: [
            {
                input: "WIN FREE MONEY NOW! Click here!!!",
                output: "SPAM (confidence: 0.92)",
                explanation: "Classify message based on spam indicators"
            }
        ],
        testCases: [
            { input: "WIN FREE MONEY NOW! Click here!!!", expectedOutput: "SPAM", isHidden: false },
            { input: "Hello, how are you doing today?", expectedOutput: "NOT SPAM", isHidden: true }
        ],
        hints: ["Look for spam keywords", "Analyze message patterns", "Use frequency analysis"]
    },

    // Algorithm & Data Structure Projects
    {
        problemId: "fractal-tree",
        title: "Fractal Tree Generator",
        description: "Use recursion to generate and display fractal tree patterns.",
        difficulty: "medium",
        category: "algorithms",
        tags: ["recursion", "graphics", "fractals"],
        constraints: "Use recursive branching, adjustable depth and angle",
        examples: [
            {
                input: "Depth: 5, Angle: 30°, Length: 100",
                output: "Generated fractal tree with 5 levels",
                explanation: "Create a recursive tree structure with specified parameters"
            }
        ],
        testCases: [
            { input: "5 30 100", expectedOutput: "Generated fractal tree with 5 levels", isHidden: false }
        ],
        hints: ["Use recursion for branching", "Reduce length at each level", "Adjust angles for branch direction"]
    },
    {
        problemId: "maze-solver",
        title: "Maze Solver Algorithm",
        description: "Implement a pathfinding algorithm to solve a maze from start to end.",
        difficulty: "hard",
        category: "algorithms",
        tags: ["pathfinding", "dfs", "bfs"],
        constraints: "2D grid maze, find path from start to end",
        examples: [
            {
                input: "5x5 maze with walls and open paths",
                output: "Path found: (0,0) -> (1,0) -> (1,1) -> (4,4)",
                explanation: "Find valid path through the maze"
            }
        ],
        testCases: [
            { input: "5 5\n1 0 0 0 1\n1 1 1 0 1\n0 0 1 0 0\n0 1 1 1 0\n0 0 0 0 1", expectedOutput: "Path found", isHidden: false }
        ],
        hints: ["Use DFS or BFS for pathfinding", "Mark visited cells", "Backtrack when hitting dead ends"]
    }
];

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database with initial problems...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_DB_URL);
        console.log('✅ Connected to MongoDB');

        const problemHandler = new ProblemDBHandler();
        
        // Clear existing problems (optional - comment out if you want to keep existing)
        await ProblemDBHandler.Problems.deleteMany({});
        console.log('🗑️ Cleared existing problems');

        // Insert initial problems
        for (const problemData of initialProblems) {
            try {
                await problemHandler.createProblem(problemData);
                console.log(`✅ Added problem: ${problemData.title}`);
            } catch (error) {
                console.error(`❌ Failed to add problem ${problemData.title}:`, error.message);
            }
        }

        console.log('🎉 Database seeding completed!');
        console.log(`📊 Total problems added: ${initialProblems.length}`);
        
    } catch (error) {
        console.error('❌ Database seeding failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('💤 Disconnected from MongoDB');
    }
}

// Run the seeding function
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase, initialProblems };
