class CodeRunner
{
    async endpoint(req, res)
    {
        if (!req.params.lang) {
            res.status(400).json({ error: "Missing required :lang param" });
            return;
        }

        if (!req.body.code) {
            res.status(400).json({ error: "Missing code in request body" });
            return;
        }

        try {
            const runtimesReq = await fetch("https://emkc.org/api/v2/piston/runtimes");
            
            if (!runtimesReq.ok) {
                throw new Error("Failed to fetch available runtimes");
            }
            
            const runtimes = await runtimesReq.json();
            const langInfo = runtimes.find(e => e.language === req.params.lang);
            
            if (!langInfo) {
                res.status(400).json({ 
                    error: `Unsupported language: ${req.params.lang}`,
                    supportedLanguages: runtimes.map(r => r.language)
                });
                return;
            }
            
            const runReq = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    language: req.params.lang,
                    version: langInfo.version,
                    files: [
                        { content: req.body.code }
                    ],
                    input: req.body.input || "",
                    run_timeout: 10000
                })
            });

            if (!runReq.ok) {
                throw new Error("Code execution service unavailable");
            }

            const runOut = await runReq.json();        
            res.json({
                success: true,
                output: runOut.run.output || "",
                error: runOut.run.stderr || "",
                signal: runOut.run.signal,
                executionTime: runOut.run.runtime || "N/A"
            });
        } catch (error) {
            console.error('Code execution error:', error);
            res.status(500).json({ 
                success: false,
                error: error.message || "Internal server error during code execution" 
            });
        }
    }
}

module.exports = {
    CodeRunner
};