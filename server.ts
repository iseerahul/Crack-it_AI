import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Clients (Lazy initialization)
  let genAI: GoogleGenAI | null = null;
  const getGemini = () => {
    const apiKey = process.env.GEMININ_API_KEY_;
    if (!apiKey) return null;
    if (!genAI) genAI = new GoogleGenAI({ apiKey });
    return genAI;
  };

  // API Route for Skill Gap Analysis
  app.post('/api/skill-gap', async (req, res) => {
    const { role, skills } = req.body;
    
    try {
      const openAiKey = process.env.OPENAI_API_KEY;
      
      // Stage 1: Try OpenAI
      if (openAiKey && !openAiKey.startsWith('TODO')) {
        try {
          const client = new OpenAI({ apiKey: openAiKey });
          const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are an expert career coach and technical recruiter. Analyze the gap between a user's current skills and their target role. Return a JSON object with: match_score (number), matched_skills (string[]), missing_skills (string[]), and roadmap (array of objects with phase, focus string[], and duration)."
              },
              {
                role: "user",
                content: `Target Role: ${role}\nCurrent Skills: ${skills}`
              }
            ],
            response_format: { type: "json_object" }
          });

          const result = JSON.parse(completion.choices[0].message.content || '{}');
          return res.json(result);
        } catch (openAiErr: any) {
          const isInvalidKey = openAiErr.status === 401 || openAiErr.message?.includes('401');
          console.warn(isInvalidKey ? 'OpenAI API Key is invalid.' : 'OpenAI failed:', openAiErr.message);
          if (isInvalidKey) {
            // If key is invalid, don't bother retrying OpenAI for this request
          }
        }
      }

      // Stage 2: Try Gemini Fallback with Maximum Resilience
      const geminiKey = process.env.GEMININ_API_KEY_ || process.env.GEMINI_API_KEY;
      if (geminiKey && !geminiKey.startsWith('TODO')) {
        // Reordered: Try 'lite' models first as they often have better availability during spikes
        const models = [
          "gemini-3.1-flash-lite-preview",
          "gemini-3-flash-preview",
          "gemini-flash-latest",
          "gemini-3.1-pro-preview"
        ];
        
        const errors: string[] = [];
        
        for (const modelName of models) {
          let attempts = 0;
          const maxAttempts = 3; 
          
          while (attempts < maxAttempts) {
            try {
              const ai = new GoogleGenAI({ apiKey: geminiKey });
              const prompt = `You are an expert career coach. Analyze the gap between a user's current skills and their target role. 
              Target Role: ${role}
              Current Skills: ${skills}
              
              Return ONLY a JSON object with this structure:
              {
                "match_score": number,
                "matched_skills": string[],
                "missing_skills": string[],
                "roadmap": [{"phase": string, "focus": string[], "duration": string}]
              }`;

              const result = await ai.models.generateContent({
                model: modelName,
                contents: prompt
              });
              
              const text = result.text;
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const cleanJson = jsonMatch ? jsonMatch[0] : text;
              return res.json({ 
                ...JSON.parse(cleanJson), 
                _fallback: 'gemini', 
                _model: modelName,
                _attempts: attempts + 1
              });
            } catch (geminiErr: any) {
              attempts++;
              const errorMsg = geminiErr.message || 'Unknown error';
              const isHighDemand = errorMsg.includes('503') || errorMsg.includes('high demand');
              const isQuotaExceeded = errorMsg.includes('429') || errorMsg.includes('quota');
              
              console.warn(`Gemini (${modelName}) attempt ${attempts} failed:`, errorMsg);
              
              if ((isHighDemand || isQuotaExceeded) && attempts < maxAttempts) {
                // Exponential backoff with jitter
                const baseDelay = Math.pow(2, attempts) * 1000;
                const jitter = Math.random() * 1000;
                const delay = baseDelay + jitter;
                
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
              
              errors.push(`${modelName}: ${errorMsg}`);
              break;
            }
          }
        }
        
        throw new Error(`All Gemini models failed. Details: ${errors.join(' | ')}`);
      }

      // If all AI engines fail, return a descriptive 500 error
      const reasons = [];
      if (!openAiKey || openAiKey.startsWith('TODO')) reasons.push('OpenAI key missing/invalid');
      else reasons.push('OpenAI quota exceeded');
      
      if (!geminiKey || geminiKey.startsWith('TODO')) reasons.push('Gemini key missing/invalid');
      else reasons.push('Gemini service unavailable');

      throw new Error(`All AI analysis engines failed. Reasons: ${reasons.join(', ')}. Please check your API keys in Settings > Secrets.`);

    } catch (err: any) {
      console.error('Critical Error in Skill Gap API:', err);
      res.status(500).json({ error: err.message || 'Failed to analyze skill gap' });
    }
  });

  // API Route for Secure Code Execution with Test Cases
  app.post('/api/execute', async (req, res) => {
    const { code, language, problemId } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ error: 'Missing code or language' });
    }

    // Fetch problem test cases (in a real app, from a DB)
    // For now, we'll assume the client sends them or we have a way to get them
    // Since we don't have a DB, we'll look at the request body for testCases
    const { testCases } = req.body;

    const jobId = uuidv4();
    const tempDir = path.join(__dirname, 'temp', jobId);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let command = '';
    let fileName = '';
    let wrapperCode = '';

    try {
      if (testCases && testCases.length > 0) {
        switch (language) {
          case 'python':
            fileName = 'solution.py';
            wrapperCode = `
import json
import sys

${code}

test_cases = ${JSON.stringify(testCases)}
results = []

def run_test():
    # Try to find the solution function
    # It might be a standalone function or inside a class
    sol_fn = None
    if 'solution' in globals():
        sol_fn = globals()['solution']
    elif 'Solution' in globals():
        instance = globals()['Solution']()
        # Find the first method that isn't dunder
        for attr in dir(instance):
            if not attr.startswith('__'):
                sol_fn = getattr(instance, attr)
                break
    
    if not sol_fn:
        # Try to find any function that looks like a solution
        for name, obj in globals().items():
            if callable(obj) and name != 'run_test' and not name.startswith('__'):
                sol_fn = obj
                break

    if not sol_fn:
        print(json.dumps({"error": "No solution function found"}))
        return

    for tc in test_cases:
        try:
            # Handle both object and positional inputs
            if isinstance(tc['input'], dict):
                got = sol_fn(**tc['input'])
            else:
                got = sol_fn(tc['input'])
            results.append({
                "passed": json.dumps(got, sort_keys=True) == json.dumps(tc['expected'], sort_keys=True),
                "got": got,
                "expected": tc['expected']
            })
        except Exception as e:
            results.append({"passed": False, "error": str(e)})
    
    print(json.dumps(results))

run_test()
`;
            fs.writeFileSync(path.join(tempDir, fileName), wrapperCode);
            command = `python3 ${path.join(tempDir, fileName)}`;
            break;

          case 'javascript':
            fileName = 'solution.js';
            wrapperCode = `
const code = \`${code.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
const testCases = ${JSON.stringify(testCases)};

try {
  // Create a sandbox-ish environment
  const context = {};
  const fn = new Function('context', \`
    \${code}
    // Find solution function
    let solFn = typeof solution !== 'undefined' ? solution : null;
    if (!solFn) {
      // Look for any function in the scope
      const fns = Object.keys(this).filter(k => typeof this[k] === 'function');
      if (fns.length > 0) solFn = this[fns[0]];
    }
    return solFn;
  \`);
  
  const solFn = fn.call(context, context);
  
  if (!solFn) {
    console.log(JSON.stringify({ error: "No solution function found" }));
    process.exit(0);
  }

  const results = testCases.map(tc => {
    try {
      const got = typeof tc.input === 'object' && !Array.isArray(tc.input) 
        ? solFn(tc.input) 
        : solFn(tc.input);
      return {
        passed: JSON.stringify(got) === JSON.stringify(tc.expected),
        got: got,
        expected: tc.expected
      };
    } catch (e) {
      return { passed: false, error: e.message };
    }
  });
  console.log(JSON.stringify(results));
} catch (e) {
  console.log(JSON.stringify({ error: e.message }));
}
`;
            fs.writeFileSync(path.join(tempDir, fileName), wrapperCode);
            command = `node ${path.join(tempDir, fileName)}`;
            break;

          default:
            // Fallback to basic execution for other languages
            fileName = 'solution.' + (language === 'cpp' ? 'cpp' : 'java');
            fs.writeFileSync(path.join(tempDir, fileName), code);
            command = language === 'cpp' 
              ? `g++ ${path.join(tempDir, fileName)} -o ${path.join(tempDir, 'out')} && ${path.join(tempDir, 'out')}`
              : `javac ${path.join(tempDir, fileName)} && java -cp ${tempDir} Solution`;
        }
      } else {
        // Basic execution if no test cases provided
        switch (language) {
          case 'python':
            fileName = 'solution.py';
            fs.writeFileSync(path.join(tempDir, fileName), code);
            command = `python3 ${path.join(tempDir, fileName)}`;
            break;
          case 'javascript':
            fileName = 'solution.js';
            fs.writeFileSync(path.join(tempDir, fileName), code);
            command = `node ${path.join(tempDir, fileName)}`;
            break;
          case 'cpp':
            fileName = 'solution.cpp';
            fs.writeFileSync(path.join(tempDir, fileName), code);
            command = `g++ ${path.join(tempDir, fileName)} -o ${path.join(tempDir, 'out')} && ${path.join(tempDir, 'out')}`;
            break;
          case 'java':
            fileName = 'Solution.java';
            fs.writeFileSync(path.join(tempDir, fileName), code);
            command = `javac ${path.join(tempDir, fileName)} && java -cp ${tempDir} Solution`;
            break;
        }
      }

      exec(command, { timeout: 5000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          console.error('Cleanup error:', e);
        }

        if (error && error.killed) {
          return res.json({ error: 'Execution timed out (5s limit)', stdout: '', stderr: 'Timeout' });
        }

        let testResults = null;
        if (testCases && testCases.length > 0) {
          try {
            testResults = JSON.parse(stdout.trim());
          } catch (e) {
            // Not JSON, probably raw output or error
          }
        }

        res.json({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          error: error ? error.message : null,
          testResults: testResults
        });
      });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
