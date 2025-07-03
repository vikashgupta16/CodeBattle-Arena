import fetch from 'node-fetch';

async function testCppFix() {
    console.log('=== Testing C++ Fix with "Sum of Two Numbers" Problem ===');
    
    const cppCode = `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`;

    // Test with the expected input format for "Sum of Two Numbers"
    const testInput = "5 3";
    
    try {
        console.log('Testing C++ code execution through our API...');
        console.log(`Input: "${testInput}"`);
        console.log(`Code: ${cppCode.replace(/\n/g, '\\n')}`);
        
        const response = await fetch('http://localhost:8080/api/run/c++', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                code: cppCode,
                input: testInput
            })
        });

        const result = await response.json();
        
        console.log('\n--- Results ---');
        console.log(`Status: ${response.status}`);
        console.log(`Output: ${JSON.stringify(result.output)}`);
        console.log(`Expected: "8\\n"`);
        console.log(`Success: ${result.output === "8\n"}`);
        
        if (result.error) {
            console.log(`Error: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testCppFix();
