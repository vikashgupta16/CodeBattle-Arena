import fetch from 'node-fetch';

async function testProblemSubmission() {
    console.log('=== Testing Complete Problem Submission Flow ===');
    
    const cppCode = `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`;

    try {
        // Test submission for problem "sum-two-numbers"
        console.log('Testing problem submission...');
        
        const response = await fetch('http://localhost:8080/api/submit', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                problemId: "sum-two-numbers",
                language: "c++",
                code: cppCode
            })
        });

        const result = await response.json();
        
        console.log('\n--- Results ---');
        console.log(`Status: ${response.status}`);
        console.log(`Message: ${result.message || result.error}`);
        console.log(`Passed: ${result.passed}/${result.total} test cases`);
        
        if (result.results) {
            console.log('\nTest Case Results:');
            result.results.forEach((testResult, index) => {
                console.log(`  Test ${index + 1}: ${testResult.passed ? 'PASS' : 'FAIL'}`);
                if (!testResult.passed) {
                    console.log(`    Expected: ${JSON.stringify(testResult.expected)}`);
                    console.log(`    Got: ${JSON.stringify(testResult.actual)}`);
                }
            });
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testProblemSubmission();
