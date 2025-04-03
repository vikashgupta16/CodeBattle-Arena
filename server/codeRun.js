class CodeRunner
{
    async endpoint(req, res)
    {
        if (!req.params.lang) {
            res.json({ error: "Missing required :lang param" });
            return;
        }

        const runtimesReq = await fetch("https://emkc.org/api/v2/piston/runtimes");
        const runtimes = await runtimesReq.json();
        const langInfo = runtimes.filter(e => e.language === req.params.lang)[0];
        
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

        const runOut = await runReq.json();        
        res.json({
            out: runOut.run.output,
            signal: runOut.run.signal
        });
    }
}

module.exports = {
    CodeRunner
};