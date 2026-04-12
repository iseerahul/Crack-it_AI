import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Play, 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Timer,
  BarChart2,
  BrainCircuit,
  User,
  ArrowLeft,
  Sparkles,
  Mic,
  MicOff,
  StopCircle,
  MessageSquare,
  Video
} from 'lucide-react';
import { CameraPreview } from '@/components/interview/CameraPreview';
import { generateQuestion, evaluateAnswer, speak, generateReport, InterviewQuestion, EvaluationResult, InterviewReport } from '@/lib/gemini';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

export const ResumeInterview = () => {
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ confidence: 0.8, pauses: 0, fumbling: 0 });
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSoundDetected, setIsSoundDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Pre-load voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, interimTranscript, userAnswer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAI();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const stopAI = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && isListening) {
        console.log("Auto-submitting due to silence...");
        handleSubmit();
      }
    }, 2000); // Auto-submit after 2 seconds of silence
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeName(file.name);
      setError(null);
      
      try {
        if (file.type === "application/pdf") {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
          }
          
          const cleanText = fullText.replace(/[^\x20-\x7E\n]/g, '').slice(0, 10000);
          setResumeText(cleanText);
        } else {
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            const cleanText = text.replace(/[^\x20-\x7E\n]/g, '').slice(0, 10000);
            setResumeText(cleanText);
          };
          reader.readAsText(file);
        }
      } catch (err) {
        console.error("Error parsing resume:", err);
        setError("Failed to read the resume. Please try a different file or copy-paste the text.");
      }
    }
  };

  const handleSpeak = async (text: string) => {
    // Add to chat
    setChat(prev => [...prev, { role: 'ai', content: text, timestamp: new Date() }]);

    try {
      const audioUrl = await speak(text, 'Kore'); // Consistently use 'Kore' voice
      if (audioUrl) {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          console.log("AI finished speaking (Gemini TTS), starting mic...");
          startListening();
        };
        
        await audio.play();
        return; // Success with Gemini TTS
      }
    } catch (err) {
      console.error("Gemini TTS failed, falling back to browser TTS:", err);
    }

    // Fallback to browser TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.0;
      
      utterance.onend = () => {
        console.log("AI finished speaking (Browser TTS), starting mic...");
        startListening();
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      // If no TTS at all, just start listening after a delay
      setTimeout(startListening, 2000);
    }
  };

  const startInterview = async () => {
    if (!resumeText) {
      setError("Please upload your resume first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const question = await generateQuestion({
        difficulty: "medium",
        resume: resumeText,
        history: []
      });

      setCurrentQuestion(question);
      setIsStarted(true);
      handleSpeak(question.question);
    } catch (err: any) {
      setError(err.message || "Failed to start interview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setInterimTranscript("");
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) return;

    stopAI(); // Stop AI if it's speaking when we start listening

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
      console.log("Speech recognition started with language:", recognition.lang);
      setIsListening(true);
      setInterimTranscript("");
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      console.log("Speech recognition result received", event);
      resetSilenceTimer();
      setIsSoundDetected(true);
      
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        console.log("Final transcript segment:", final);
        setUserAnswer(prev => prev + (prev ? ' ' : '') + final);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }

      // Reset sound detection after a delay
      setTimeout(() => setIsSoundDetected(false), 1000);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      if (event.error === 'not-allowed') {
        setError("Microphone access denied. Please check your browser permissions and ensure you've allowed microphone access for this site.");
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        console.log("No speech detected - keeping listener active");
        resetSilenceTimer();
      } else if (event.error === 'network') {
        setError("Network error during speech recognition. Please check your connection.");
        setIsListening(false);
      } else {
        setIsListening(false);
      }
      
      setInterimTranscript("");
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      setInterimTranscript("");
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
    
    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Failed to start microphone. Please refresh and try again.");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = async () => {
    // Check if we have an answer or if it's already evaluating
    if (isEvaluating) return;
    
    // Use interim transcript if final is empty (for auto-submit)
    const currentAnswer = (userAnswer + " " + interimTranscript).trim();
    if (!currentAnswer || !currentQuestion) {
      console.log("No answer to submit");
      return;
    }
    
    console.log("Submitting answer:", currentAnswer);
    
    // Stop listening and AI
    stopAI();
    stopListening();
    
    // Add to chat
    setChat(prev => [...prev, { role: 'user', content: currentAnswer, timestamp: new Date() }]);
    setUserAnswer("");
    setInterimTranscript("");

    setIsEvaluating(true);
    try {
      const evaluation = await evaluateAnswer({
        question: currentQuestion.question,
        expected_answer: currentQuestion.expected_answer || "",
        user_answer: currentAnswer,
        resume: resumeText
      });

      const newEntry = {
        question: currentQuestion,
        answer: currentAnswer,
        evaluation,
        metrics
      };

      const updatedHistory = [...history, newEntry];
      setHistory(updatedHistory);

      if (updatedHistory.length >= 5) {
        await finishInterview(updatedHistory);
      } else {
        const nextQuestion = await generateQuestion({
          difficulty: evaluation.next_difficulty,
          resume: resumeText,
          history: updatedHistory
        });
        setCurrentQuestion(nextQuestion);
        handleSpeak(nextQuestion.question);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process answer.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const finishInterview = async (finalHistory: any[]) => {
    stopAI();
    stopListening();
    
    setIsGenerating(true);
    try {
      const reportData = await generateReport(finalHistory);
      setReport(reportData);
      setIsFinished(true);
    } catch (err) {
      setError("Failed to generate report.");
      setIsFinished(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExit = () => {
    stopAI();
    stopListening();
    navigate('/');
  };

  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white">Interview Report</h1>
          <p className="text-slate-400">Based on your resume and interview performance.</p>
        </header>

        {report && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 space-y-8 backdrop-blur-md"
          >
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-400" />
                Analysis
              </h3>
              <p className="text-slate-300 leading-relaxed italic">"{report.summary}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Strengths</h4>
                <ul className="space-y-3">
                  {report.strengths.map((s, i) => (
                    <li key={`strength-${i}`} className="flex items-start gap-3 text-slate-300 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Improvements</h4>
                <ul className="space-y-3">
                  {report.improvements.map((im, i) => (
                    <li key={`improvement-${i}`} className="flex items-start gap-3 text-slate-300 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      {im}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-800/50">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-white">Skill Analysis</h4>
                <div className="px-4 py-1 bg-indigo-500/20 rounded-full border border-indigo-500/30">
                  <span className="text-indigo-400 font-bold">Overall: {report.overall_score}%</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {report.domain_mastery.map((dm, i) => (
                  <div key={`mastery-${dm.topic}-${i}`} className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                    <p className="text-xs text-slate-400 mb-1">{dm.topic}</p>
                    <p className="text-xl font-bold text-white">{dm.score}%</p>
                    <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500" 
                        style={{ width: `${dm.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleExit}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
            >
              Back to Dashboard
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExit}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Resume Based Interview</h1>
            <p className="text-slate-400 text-sm">Technical assessment based on your profile</p>
          </div>
        </div>
      </div>

      {!isStarted ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white leading-tight">
                Ready to test your <span className="text-indigo-400">expertise?</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Upload your resume and we will generate a personalized technical interview to challenge your specific skills and experience.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".txt,.pdf"
                  onChange={handleResumeUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={cn(
                  "p-8 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center gap-4",
                  resumeName ? "border-indigo-500/50 bg-indigo-500/5" : "border-slate-800 hover:border-slate-700 bg-slate-900/50"
                )}>
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className={resumeName ? "text-indigo-400" : "text-slate-400"} size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">{resumeName || "Upload Resume"}</p>
                    <p className="text-slate-500 text-sm mt-1">Supports PDF or TXT files</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button 
                onClick={startInterview}
                disabled={isGenerating || !resumeText}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Play size={20} fill="currentColor" />
                    Start Interview
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full" />
              <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <BrainCircuit className="text-indigo-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Interviewer</h3>
                    <p className="text-slate-500 text-xs uppercase tracking-widest">Active Analysis</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={`skeleton-${i}`} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                      <div className="h-4 bg-slate-800 rounded-full w-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Left: Chat & Controls */}
          <div className="lg:col-span-8 flex flex-col bg-slate-900/50 border border-slate-800/50 rounded-3xl overflow-hidden backdrop-blur-md">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="flex items-center justify-center mb-4">
                {isListening ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Listening...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 border border-slate-700/30 rounded-full">
                    <div className="w-2 h-2 bg-slate-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mic Off</span>
                  </div>
                )}
              </div>

              <AnimatePresence initial={false}>
                {chat.map((msg, i) => (
                  <motion.div
                    key={`chat-msg-${msg.timestamp.getTime()}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4",
                      msg.role === 'user' ? "flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      msg.role === 'ai' ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-400"
                    )}>
                      {msg.role === 'ai' ? <BrainCircuit size={20} /> : <User size={20} />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'ai' ? "bg-slate-800/50 text-slate-200" : "bg-indigo-600 text-white"
                    )}>
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </motion.div>
                ))}
                
                {(interimTranscript || userAnswer) && isListening && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 flex-row-reverse"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                      <User size={20} />
                    </div>
                    <div className="max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed bg-indigo-600/30 text-white italic border border-indigo-500/30 relative">
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-indigo-500 text-[8px] font-bold rounded-full uppercase tracking-tighter animate-pulse flex items-center gap-1">
                        <Mic size={8} />
                        Live Transcription
                      </div>
                      {userAnswer} {interimTranscript}
                      <span className="inline-flex ml-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            <div className="p-6 border-t border-slate-800/50 bg-slate-900/80 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={toggleListening}
                      className={cn(
                        "flex-1 h-16 rounded-2xl flex items-center justify-center gap-3 transition-all font-bold text-lg relative overflow-hidden",
                        isListening 
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                          : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                      )}
                    >
                      {isListening && isSoundDetected && (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.5, opacity: 0.3 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="absolute inset-0 bg-white rounded-full"
                        />
                      )}
                      {isListening ? (
                        <>
                          <MicOff size={24} />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic size={24} />
                          Start Speaking
                        </>
                      )}
                    </button>
                    
                    {(userAnswer || interimTranscript) && isListening && (
                      <button 
                        onClick={handleSubmit}
                        disabled={isEvaluating}
                        className="px-8 h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        <Send size={20} />
                        Submit
                      </button>
                    )}
                  </div>
                </div>
                
                {isEvaluating && (
                  <div className="flex items-center gap-2 text-indigo-400 text-sm animate-pulse">
                    <div className="w-4 h-4 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
                    Evaluating your response...
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-800/50">
                <button 
                  onClick={() => finishInterview(history)}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={20} />
                  End Session & Report
                </button>
                <button 
                  onClick={handleExit}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 border border-slate-700"
                >
                  <X size={20} />
                  Exit Interview
                </button>
              </div>
            </div>
          </div>

          {/* Right: Camera & Metrics */}
          <div className="lg:col-span-4 space-y-6">
            <CameraPreview 
              isActive={isStarted && !isFinished} 
              onMetricsUpdate={setMetrics}
            />

            <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-6 space-y-6 backdrop-blur-md">
              <h3 className="text-white font-bold flex items-center gap-2">
                <BarChart2 size={18} className="text-indigo-400" />
                Live Behavior Analysis
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Confidence Level</span>
                    <span className="text-indigo-400 font-bold">{(metrics.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.confidence * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Speech Fluency</span>
                    <span className="text-emerald-400 font-bold">{(100 - metrics.fumbling * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - metrics.fumbling * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Pauses</p>
                    <p className="text-xl font-bold text-white">{metrics.pauses}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    <p className="text-xs font-bold text-emerald-400">Stable</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-3 text-slate-400 text-xs italic">
                  <Sparkles size={14} className="text-indigo-400 shrink-0" />
                  Analyzing your facial expressions and tone in real-time.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
