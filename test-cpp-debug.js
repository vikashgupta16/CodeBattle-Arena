import fetch from 'node-fetch';

async function testCppCode() {
    console.log('=== Testing C++ code with different input scenarios ===');
    
    // Test 1: Simple program without input
    console.log('\n--- Testing: Simple program without input ---');
    const simpleCppCode = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`;

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                language: 'cpp',
                version: '*',
                files: [{ content: simpleCppCode }],
                input: "",
                run_timeout: 10000
            })
        });

        const result = await response.json();
        console.log(`Output: ${JSON.stringify(result.run.stdout)}`);
        if (result.run.stderr) {
            console.log(`Stderr: ${JSON.stringify(result.run.stderr)}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
    
    // Test 2: Program with input - single number
    const cppCodeSingle = `#include <iostream>
using namespace std;

int main() {
    int a;
    cin >> a;
    cout << "Read: " << a << endl;
    return 0;
}`;

    console.log('\n--- Testing: Single number input ---');
    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                language: 'cpp',
                version: '*',
                files: [{ content: cppCodeSingle }],
                stdin: "42",
                run_timeout: 10000
            })
        });

        const result = await response.json();
        console.log(`Output: ${JSON.stringify(result.run.stdout)}`);
        if (result.run.stderr) {
            console.log(`Stderr: ${JSON.stringify(result.run.stderr)}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
    
    // Test 3: Program with input - two numbers
    const cppCode = `#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    int a = 0, b = 0;
    string line;
    getline(cin, line);
    stringstream ss(line);
    ss >> a >> b;
    cout << a + b << endl;
    return 0;
}`;

    // Test scenarios
    const testInputs = [
        { input: "5 3", description: "Two numbers with space" },
        { input: "5\n3", description: "Two numbers with newline" },
        { input: "", description: "Empty input" },
        { input: "5 3\n", description: "Two numbers with space and trailing newline" },
        { input: "10 20", description: "Different numbers with space" }
    ];

    for (const test of testInputs) {
        console.log(`\n--- Testing: ${test.description} ---`);
        console.log(`Input: ${JSON.stringify(test.input)}`);
        
        try {
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    language: 'cpp',
                    version: '*',
                    files: [{ content: cppCode }],
                    stdin: test.input,
                    run_timeout: 10000
                })
            });

            const result = await response.json();
            console.log(`Output: ${JSON.stringify(result.run.stdout)}`);
            if (result.run.stderr) {
                console.log(`Stderr: ${JSON.stringify(result.run.stderr)}`);
            }
            console.log(`Expected: "8\\n", Got: ${JSON.stringify(result.run.stdout)}`);
            console.log(`Match: ${(result.run.stdout || '').trim() === '8'}`);
            
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

testCppCode();
