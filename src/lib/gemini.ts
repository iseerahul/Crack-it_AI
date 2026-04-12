import { GoogleGenAI, Type, Modality } from "@google/genai";

const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) || import.meta.env.VITE_GEMINI_API_KEY || "";

function getAI() {
  const isInvalidKey = apiKey.startsWith('sb_') || apiKey.includes('placeholder');
  if (!apiKey || apiKey === "" || isInvalidKey) {
    console.error("GEMINI_API_KEY is missing or invalid. Environment check:", {
      hasKey: !!apiKey,
      isInvalidKey,
      processEnv: typeof process !== 'undefined' ? !!process.env.GEMINI_API_KEY : 'N/A',
      importMeta: !!import.meta.env.VITE_GEMINI_API_KEY
    });
    throw new Error("GEMINI_API_KEY is not configured or is invalid. Please add it to your environment variables in the Secrets panel.");
  }
  return new GoogleGenAI({ apiKey });
}

export const interviewModel = "gemini-3-flash-preview";
export const ttsModel = "gemini-3-flash-preview";

export interface InterviewQuestion {
  question: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  expected_answer?: string;
  reason?: string;
  skill_focus?: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  missing_topics: string[];
  next_difficulty: "easy" | "medium" | "hard";
}

function pcmToWav(pcmBase64: string, sampleRate: number = 24000): string {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, len, true);

  const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function speak(text: string, voiceName: string = 'Kore'): Promise<string | null> {
  if (!text || text.trim().length === 0) return null;
  
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text: text.trim() }] }],
      config: {
        responseModalities: ['AUDIO' as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return pcmToWav(base64Audio);
    }
    return null;
  } catch (error: any) {
    console.error("Gemini speak error details:", error);
    return null;
  }
}

export async function generateQuestion(params: {
  domain?: string;
  ml_role?: string;
  ml_skills?: string[];
  experience?: number;
  current_score?: number;
  difficulty: string;
  performance_trend?: string;
  history?: any[];
  resume?: string;
}): Promise<InterviewQuestion> {
  const historyContext = params.history && params.history.length > 0 
    ? `\nINTERVIEW HISTORY:\n${params.history.map((h, i) => `Q${i+1}: ${h.question.question}\nScore: ${h.evaluation.score}/10\nFeedback: ${h.evaluation.feedback}`).join('\n---\n')}`
    : "";

  const resumeContext = params.resume 
    ? `\nCANDIDATE RESUME CONTENT:\n${params.resume}\n\nINSTRUCTION: Generate a question specifically based on the candidate's experience, projects, or skills mentioned in their resume. Verify their claims or ask for deeper technical details on a specific project.`
    : "";

  const prompt = `You are an adaptive technical interviewer. Generate the next question based on the candidate's profile and performance.

CONFIGURATION:
Domain: ${params.domain || params.ml_role}
Experience: ${params.experience} years
Target Difficulty: ${params.difficulty}
Performance Trend: ${params.performance_trend || 'Stable'}
${resumeContext}
${historyContext}

ADAPTATION RULES:
1. If the candidate is performing well (scores > 8), increase depth and complexity.
2. If the candidate is struggling (scores < 5), pivot to fundamental concepts or lower difficulty.
3. Do NOT repeat topics or questions already covered in history.
4. Focus on practical, scenario-based technical questions.
5. Keep the question concise and clear (under 25 words).

OUTPUT FORMAT (STRICT JSON):
{
  "question": "string",
  "difficulty": "easy | medium | hard",
  "topic": "string",
  "reason": "why this question was selected based on history/trend",
  "expected_answer": "short ideal answer"
}`;

  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: interviewModel,
      contents: prompt,
      config: {
        systemInstruction: "You are a professional technical interviewer at a top-tier tech company. You are rigorous but fair, and you adapt your questioning style based on the candidate's real-time performance.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            topic: { type: Type.STRING },
            reason: { type: Type.STRING },
            expected_answer: { type: Type.STRING },
          },
          required: ["question", "difficulty", "topic", "reason", "expected_answer"],
        },
      },
    });

    return JSON.parse((response as any).text);
  } catch (error: any) {
    console.error("Gemini generateQuestion error:", error);
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw new Error("Gemini API quota exceeded. Please wait a moment before the next question or try again later.");
    }
    if (error.message?.includes('fetch')) {
      throw new Error("Network error: Failed to connect to Gemini API. Please check your internet connection or API key.");
    }
    throw error;
  }
}

export async function evaluateAnswer(params: {
  question: string;
  expected_answer: string;
  user_answer: string;
  ml_role?: string;
  ml_skills?: string[];
  isAI?: boolean;
  resume?: string;
}): Promise<EvaluationResult> {
  const resumeContext = params.resume 
    ? `\nCANDIDATE RESUME CONTEXT:\n${params.resume}\n\nEvaluate if the answer aligns with the experience claimed in the resume.`
    : "";

  const prompt = `You are evaluating a candidate's response in a technical interview.
  
  ${resumeContext}
  QUESTION: ${params.question}
  EXPECTED ANSWER: ${params.expected_answer}
  CANDIDATE ANSWER: ${params.user_answer}
  
  INSTRUCTIONS:
  1. Score from 0 to 10 based on correctness, depth, and relevance.
  2. Identify missing concepts.
  3. Suggest next difficulty level.
  
  OUTPUT FORMAT (STRICT JSON):
  {
    "score": number,
    "feedback": "brief and critical",
    "missing_topics": ["list"],
    "next_difficulty": "easy | medium | hard"
  }`;

  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: interviewModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            missing_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            next_difficulty: { type: Type.STRING },
          },
          required: ["score", "feedback", "missing_topics", "next_difficulty"],
        },
      },
    });

    return JSON.parse((response as any).text);
  } catch (error: any) {
    console.error("Gemini evaluateAnswer error:", error);
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw new Error("Gemini API quota exceeded. Please wait a moment before submitting your answer again.");
    }
    if (error.message?.includes('fetch')) {
      throw new Error("Network error: Failed to connect to Gemini API. Please check your internet connection or API key.");
    }
    throw error;
  }
}

export interface InterviewReport {
  summary: string;
  strengths: string[];
  improvements: string[];
  overall_score: number;
  domain_mastery: { topic: string; score: number }[];
}

export async function generateReport(history: any[], isAI: boolean = true): Promise<InterviewReport> {
  const historyContext = history.map((h, i) => `
Question ${i + 1}: ${h.question.question}
User Answer: ${h.answer}
Score: ${h.evaluation.score}/10
Feedback: ${h.evaluation.feedback}
Behavioral Metrics: Confidence: ${(h.metrics.confidence * 100).toFixed(0)}%, Pauses: ${h.metrics.pauses}, Fumbling: ${(h.metrics.fumbling * 100).toFixed(0)}%
`).join('\n---\n');

  const prompt = `You are a senior technical recruiter. Generate a comprehensive performance report for a candidate based on their interview history and behavioral signals.

INTERVIEW HISTORY:
${historyContext}

INSTRUCTIONS:
1. Provide a professional summary of the candidate's performance, mentioning both technical depth and behavioral signals (confidence, fluency).
2. Identify 3 key strengths.
3. Identify 3 areas for improvement.
4. Calculate an overall score (0-100).
5. Break down mastery by topic.

OUTPUT FORMAT (STRICT JSON):
{
  "summary": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "overall_score": number,
  "domain_mastery": [{ "topic": "string", "score": number }]
}`;

  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: interviewModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            overall_score: { type: Type.NUMBER },
            domain_mastery: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ["topic", "score"],
              },
            },
          },
          required: ["summary", "strengths", "improvements", "overall_score", "domain_mastery"],
        },
      },
    });

    return JSON.parse((response as any).text);
  } catch (error: any) {
    console.error("Gemini generateReport error:", error);
    throw error;
  }
}
