import fetch from 'node-fetch';

async function checkSupportedLanguages() {
    try {
        const response = await fetch('https://emkc.org/api/v2/piston/runtimes');
        const runtimes = await response.json();
        
        console.log('=== Supported Languages ===');
        const cppLanguages = runtimes.filter(r => r.language.includes('c++') || r.language.includes('cpp') || r.language === 'c++');
        console.log('C++ related languages:');
        cppLanguages.forEach(lang => {
            console.log(`- ${lang.language} (version: ${lang.version})`);
        });
        
        // Show all languages for reference
        console.log('\n=== All Available Languages ===');
        runtimes.forEach(lang => {
            console.log(`- ${lang.language}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSupportedLanguages();
