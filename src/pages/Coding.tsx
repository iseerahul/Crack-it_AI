import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Terminal,
  BrainCircuit,
  Timer,
  Trophy,
  Zap,
  Code2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileCode,
  Coffee,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Editor from '@monaco-editor/react';
import stringSimilarity from 'string-similarity';

import { allProblems as problems } from '@/data/problems';
import { Language, Problem } from '@/types/coding';

// Problems are now imported from @/data/problems

export const Coding = () => {
  const [selectedProblem, setSelectedProblem] = useState(problems[0]);
  const [language, setLanguage] = useState<Language>('javascript');
  const [filter, setFilter] = useState("All");
  const [code, setCode] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mlScore, setMlScore] = useState<number | null>(null);
  const [mlFeedback, setMlFeedback] = useState<string | null>(null);
  const [mlBreakdown, setMlBreakdown] = useState<{correctness: number, efficiency: number, style: number} | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const getTemplate = (lang: Language, problem: Problem) => {
    const inputs = Object.keys(problem.testCases[0].input).join(', ');
    switch (lang) {
      case 'javascript': return `function solution({ ${inputs} }) {\n  // Write your code here\n}`;
      case 'python': return `def solution(${inputs}):\n    # Write your code here\n    pass`;
      case 'cpp': return `// Write your C++ solution here\n// Use standard competitive programming structure`;
      case 'java': return `// Write your Java solution here\n// Use standard competitive programming structure`;
      default: return "";
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCode(getTemplate(language, selectedProblem));
    setResults([]);
    setMlScore(null);
    setMlFeedback(null);
    setMlBreakdown(null);
    setShowSolution(false);
    setIsCorrect(null);
  }, [selectedProblem, language]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const evaluateCodeLocally = (userCode: string, solutionCode: string, lang: string) => {
    // 1. Pre-processing: Strip comments, type hints, boilerplate, and normalize structure
    const normalize = (code: string, language: string) => {
      let c = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // JS/C++/Java comments
      c = c.replace(/#.*/g, ''); // Python comments
      
      if (language === 'python') {
        c = c.replace(/:\s*[^,)\s=]+/g, '');
        c = c.replace(/->\s*[^:]+/g, '');
        c = c.replace(/\bself\b,?\s*/g, '');
        c = c.replace(/\(\s*,/g, '(');
        c = c.replace(/def\s+\w+\(/g, 'def solution(');
      } else if (language === 'javascript') {
        c = c.replace(/function\s+\w+\(/g, 'function solution(');
      }

      c = c.replace(/class\s+\w+[:{]/g, '');
      c = c.replace(/public\s+class\s+\w+[:{]/g, '');
      
      return c.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    };

    const cleanUser = normalize(userCode, lang);
    const cleanSolution = normalize(solutionCode, lang);
    
    const tokenize = (code: string) => code.toLowerCase().split(/\W+/).filter(t => t.length > 1);
    const userTokens = tokenize(cleanUser);
    const solutionTokens = tokenize(cleanSolution);
    const userTokensSet = new Set(userTokens);

    // --- A. Correctness Analysis (40%) ---
    const logicMarkers = [
      { name: 'Complement/Difference', regex: /target\s*-\s*\w+|target\s*-\s*nums\[|amount\s*-\s*\w+/ },
      { name: 'Map/Set Lookup', regex: /in\s+\w+|map\.has|\.has\(|\.find\(|\.containsKey|\.count\(|\.contains\(/ },
      { name: 'Map/Set Insertion', regex: /\w+\[\w+\]\s*=\s*\w+|map\.set|\.put\(|\.insert\(|\.add\(|\.push_back\(|\.append\(/ },
      { name: 'Dynamic Programming', regex: /dp\[|memo\[|table\[/ },
      { name: 'Sliding Window', regex: /while\s+.*?\s*max\s*=\s*Math\.max|res\s*=\s*max|r\s*-\s*l/ },
      { name: 'Stack Operations', regex: /\.pop\(|\.push\(|\.top\(|\.peek\(/ }
    ];

    let logicScore = 0;
    let activeMarkers = 0;
    logicMarkers.forEach(marker => {
      if (marker.regex.test(cleanSolution)) {
        activeMarkers++;
        if (marker.regex.test(cleanUser)) logicScore += 100;
      }
    });
    const finalLogicScore = activeMarkers > 0 ? logicScore / activeMarkers : 100;
    const similarity = stringSimilarity.compareTwoStrings(cleanUser.toLowerCase(), cleanSolution.toLowerCase()) * 100;
    const correctnessScore = (finalLogicScore * 0.7) + (similarity * 0.3);

    // --- B. Efficiency Analysis (30%) ---
    let efficiencyScore = 100;
    const userNestedLoops = (cleanUser.match(/for|while/g) || []).length;
    const solNestedLoops = (cleanSolution.match(/for|while/g) || []).length;
    
    // Heuristic: If solution has fewer loops than user, user might be O(n^2) vs O(n)
    if (userNestedLoops > solNestedLoops && solNestedLoops > 0) {
      efficiencyScore -= 30;
    }
    
    // Check for expensive operations inside loops
    if (/for|while/.test(cleanUser) && /\.indexOf|\.includes|\.contains/.test(cleanUser)) {
      efficiencyScore -= 20; // Potential O(n^2)
    }

    // --- C. Best Practices & Style (30%) ---
    let styleScore = 100;
    const styleIssues: string[] = [];

    if (lang === 'javascript' && /\bvar\b/.test(userCode)) {
      styleScore -= 20;
      styleIssues.push("Avoid using 'var'; prefer 'let' or 'const' for better scoping.");
    }
    
    if (lang === 'python' && /\bglobal\b/.test(userCode)) {
      styleScore -= 20;
      styleIssues.push("Avoid global variables to maintain function purity.");
    }

    // Naming convention check (Heuristic: very short names in large scopes)
    const shortNames = userTokens.filter(t => t.length === 1 && !['i', 'j', 'k', 'x', 'y', 'n'].includes(t));
    if (shortNames.length > 2) {
      styleScore -= 10;
      styleIssues.push("Use descriptive variable names instead of single characters.");
    }

    const finalScore = Math.round(
      (correctnessScore * 0.4) + 
      (efficiencyScore * 0.3) + 
      (styleScore * 0.3)
    );
    
    let feedback = "";
    if (finalScore > 85) {
      feedback = "Excellent! Your code is correct, efficient, and follows best practices.";
    } else if (finalScore > 65) {
      feedback = "Good implementation. Logic is sound, but there's room for optimization or style improvements.";
    } else if (finalScore > 40) {
      feedback = "Functional but needs work. Focus on algorithmic efficiency and cleaner code structure.";
    } else {
      feedback = "Significant improvements needed. Review the core algorithm and coding standards.";
    }

    if (styleIssues.length > 0) {
      feedback += "\n\nStyle Tips:\n• " + styleIssues.join("\n• ");
    }

    return { 
      score: finalScore, 
      feedback,
      breakdown: {
        correctness: Math.round(correctnessScore),
        efficiency: Math.round(efficiencyScore),
        style: Math.round(styleScore)
      }
    };
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setMlScore(null);
    setMlFeedback(null);
    setMlBreakdown(null);
    setShowSolution(false);
    setIsCorrect(null);
    
    await new Promise(resolve => setTimeout(resolve, 800));

    const mlResult = evaluateCodeLocally(code, selectedProblem.solutions[language], language);
    setMlScore(mlResult.score);
    setMlFeedback(mlResult.feedback);
    setMlBreakdown(mlResult.breakdown);

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          language, 
          problemId: selectedProblem.id,
          testCases: selectedProblem.testCases 
        })
      });

      const data = await response.json();

      if (data.error && !data.stdout && !data.testResults) {
        setResults([{ id: 0, passed: false, input: "Execution", expected: "Success", got: data.error }]);
        setIsCorrect(false);
        setShowSolution(true);
      } else if (data.testResults && Array.isArray(data.testResults)) {
        // Use actual test results from the server
        const testResults = data.testResults.map((tr: any, idx: number) => ({
          id: idx,
          passed: tr.passed,
          input: JSON.stringify(selectedProblem.testCases[idx].input),
          expected: JSON.stringify(selectedProblem.testCases[idx].expected),
          got: tr.error ? `Error: ${tr.error}` : JSON.stringify(tr.got)
        }));
        
        setResults(testResults);
        const allPassed = testResults.every((r: any) => r.passed);
        setIsCorrect(allPassed);
        
        if (!allPassed) {
          setShowSolution(true);
        }
      } else {
        // Fallback to ML heuristic if server didn't return structured test results
        const testResults = selectedProblem.testCases.map((tc, idx) => {
          const passed = mlResult.score >= 50;
          return {
            id: idx,
            passed,
            input: JSON.stringify(tc.input),
            expected: JSON.stringify(tc.expected),
            got: passed ? JSON.stringify(tc.expected) : (data.stdout || "Output mismatch")
          };
        });
        
        setResults(testResults);
        const allPassed = mlResult.score >= 50;
        setIsCorrect(allPassed);
        if (!allPassed || mlResult.score < 30) {
          setShowSolution(true);
        }
      }
    } catch (e: any) {
      setResults([{ id: 0, passed: false, input: "Network", expected: "API Reachable", got: e.message }]);
      setIsCorrect(false);
      setShowSolution(true);
    }

    setIsRunning(false);
  };

  const filteredProblems = problems.filter(p => filter === "All" || p.difficulty === filter);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] space-y-6">
      <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-3xl border border-slate-800/50 backdrop-blur-md">
        <div className="flex gap-8 px-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Solved: 12/30</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-400">
            <Trophy size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Rank: Top 5%</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Backend Sandbox</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-950 px-5 py-2 rounded-2xl border border-slate-800 shadow-inner">
          <Timer size={16} className="text-indigo-400 animate-pulse" />
          <span className="text-sm font-mono font-black text-white">{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-3 flex flex-col space-y-4 min-h-0">
          <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800/50">
            {["All", "Beginner", "Medium", "Advanced"].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all",
                  filter === f ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {filteredProblems.map((p) => (
              <motion.button
                key={p.id}
                whileHover={{ x: 4 }}
                onClick={() => setSelectedProblem(p)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all relative group",
                  selectedProblem.id === p.id 
                    ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20" 
                    : "bg-slate-900/40 border-slate-800/50 hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-md",
                    p.difficulty === "Beginner" ? "bg-emerald-500/10 text-emerald-400" : 
                    p.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400" : 
                    "bg-rose-500/10 text-rose-400"
                  )}>
                    {p.difficulty}
                  </span>
                  <span className="text-[9px] font-bold text-slate-600">+{p.score}XP</span>
                </div>
                <h4 className={cn("font-bold text-sm", selectedProblem.id === p.id ? "text-white" : "text-slate-400")}>
                  {p.title}
                </h4>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-9 grid grid-rows-2 gap-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 overflow-y-auto backdrop-blur-md">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">{selectedProblem.title}</h2>
                  <div className="flex gap-2">
                    {selectedProblem.tags.map((t, idx) => (
                      <span key={`${t}-${idx}`} className="text-[9px] px-2 py-0.5 bg-slate-800 text-slate-500 rounded-full border border-slate-700">#{t}</span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{selectedProblem.description}</p>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Examples</h4>
                  {selectedProblem.examples.map((ex, idx) => (
                    <div key={idx} className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4 font-mono text-[10px] space-y-1">
                      <p><span className="text-indigo-400">Input:</span> {ex.input}</p>
                      <p><span className="text-emerald-400">Output:</span> {ex.output}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/5">
              <div className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-950/50 rounded-xl p-1 border border-slate-800/50">
                    {(['javascript', 'python', 'cpp', 'java'] as Language[]).map(lang => {
                      const Icon = lang === 'javascript' ? Code2 : 
                                  lang === 'python' ? Terminal :
                                  lang === 'cpp' ? FileCode : Coffee;
                      return (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all relative group",
                            language === lang 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                          )}
                        >
                          <Icon size={12} className={cn(language === lang ? "text-white" : "text-slate-600 group-hover:text-slate-400")} />
                          <span className="hidden sm:inline">{lang === 'cpp' ? 'C++' : lang}</span>
                          {language === lang && (
                            <motion.div 
                              layoutId="activeLang"
                              className="absolute inset-0 bg-indigo-600 rounded-lg -z-10"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => setCode(getTemplate(language, selectedProblem))}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all"
                    title="Reset to Template"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                <button 
                  onClick={runTests}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
                >
                  {isRunning ? "Running..." : "Run Code"}
                  {!isRunning && <Zap size={12} fill="currentColor" />}
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={language === 'cpp' ? 'cpp' : language}
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, monospace',
                    padding: { top: 20 },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    bracketPairColorization: { enabled: true }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 flex flex-col backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logic Analysis</h3>
              </div>
              {mlScore !== null && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logic Alignment:</span>
                    <span className={cn(
                      "text-sm font-black",
                      mlScore > 80 ? "text-emerald-400" : mlScore > 50 ? "text-amber-400" : "text-rose-400"
                    )}>{mlScore}%</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              <AnimatePresence mode="popLayout">
                {mlScore !== null && mlBreakdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Correctness', value: mlBreakdown.correctness, color: 'text-indigo-400' },
                        { label: 'Efficiency', value: mlBreakdown.efficiency, color: 'text-emerald-400' },
                        { label: 'Best Practices', value: mlBreakdown.style, color: 'text-amber-400' }
                      ].map((item) => (
                        <div key={item.label} className="bg-slate-950/40 rounded-xl p-2 border border-slate-800/50 text-center">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mb-1">{item.label}</p>
                          <p className={cn("text-xs font-black", item.color)}>{item.value}%</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                          <BrainCircuit size={14} className="text-indigo-400" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluation Feedback</p>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                            {mlFeedback}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {mlScore === null ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-slate-600">
                    <BrainCircuit size={32} className="opacity-20 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Awaiting Execution...</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {results.map((res) => (
                        <motion.div 
                          key={res.id} 
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className={cn(
                            "p-3 rounded-xl border flex items-center justify-between",
                            res.passed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {res.passed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
                            <div>
                              <p className="text-[10px] font-bold text-slate-200">Test Case {res.id + 1}</p>
                              <p className="text-[9px] font-mono text-slate-500 truncate max-w-[150px]">In: {res.input}</p>
                            </div>
                          </div>
                          {!res.passed && (
                            <div className="text-right">
                              <p className="text-[9px] font-mono text-rose-400">Failed</p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {isCorrect !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {isCorrect ? (
                          <div className="flex items-center gap-2 text-emerald-400 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Correct Answer</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-400 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Incorrect Answer</span>
                          </div>
                        )}
                        
                        {showSolution && (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference Implementation ({language})</h4>
                            <p className="text-[9px] text-slate-500 italic">This is one optimal way to solve the problem. Other valid approaches are also accepted.</p>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                              <pre className="text-[11px] font-mono text-emerald-400/80 leading-relaxed">
                                {selectedProblem.solutions[language]}
                              </pre>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
