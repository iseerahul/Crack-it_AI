import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraPreviewProps {
  isActive: boolean;
  onMetricsUpdate?: (metrics: { 
    confidence: number; 
    pauses: number; 
    fumbling: number; 
    isUserDetected: boolean;
    focus: number;
    eyeContact: number;
  }) => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ isActive, onMetricsUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const metricsRef = useRef({
    energyHistory: [] as number[],
    silenceStart: null as number | null,
    pauseCount: 0,
    lastUpdate: Date.now(),
    prevFrame: null as Uint8ClampedArray | null
  });

  const [isUserDetected, setIsUserDetected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      if (isMounted) {
        setStream(null);
        setIsUserDetected(false);
      }
    };

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        if (!isMounted || !isActive) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Set up Audio Analysis
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        if (!isMounted || !isActive) {
          audioContext.close().catch(console.error);
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      } catch (err) {
        console.error("Error accessing camera/audio:", err);
      }
    };

    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isActive]);

  // Real-time ML analysis loop (Face/User Detection + Audio)
  useEffect(() => {
    if (!isActive || !analyserRef.current || !videoRef.current) return;

    let animationFrame: number;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 160;
    canvas.height = 120;

    const analyze = () => {
      if (!analyserRef.current || !videoRef.current || !ctx) return;
      
      // 1. Audio Analysis (Pauses/Fumbling)
      analyserRef.current.getByteFrequencyData(dataArray);
      const energy = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      metricsRef.current.energyHistory.push(energy);
      if (metricsRef.current.energyHistory.length > 50) {
        metricsRef.current.energyHistory.shift();
      }

      const silenceThreshold = 5;
      if (energy < silenceThreshold) {
        if (metricsRef.current.silenceStart === null) {
          metricsRef.current.silenceStart = Date.now();
        } else {
          const duration = Date.now() - metricsRef.current.silenceStart;
          if (duration > 1000) { // 1 second pause
            metricsRef.current.pauseCount++;
            metricsRef.current.silenceStart = Date.now();
          }
        }
      } else {
        metricsRef.current.silenceStart = null;
      }

      // 2. ML Vision Analysis (User Detection + Motion)
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      let skinPixels = 0;
      let motionPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Improved Skin Tone Heuristic
        const isSkin = r > 60 && g > 40 && b > 20 && 
                       r > g && r > b && 
                       (Math.max(r, g, b) - Math.min(r, g, b) > 10) && 
                       Math.abs(r - g) > 10;
        
        if (isSkin) skinPixels++;

        // Motion Detection
        if (metricsRef.current.prevFrame) {
          const prevR = metricsRef.current.prevFrame[i];
          const diff = Math.abs(r - prevR);
          if (diff > 30) motionPixels++;
        }
      }

      metricsRef.current.prevFrame = new Uint8ClampedArray(data);

      const skinRatio = skinPixels / (canvas.width * canvas.height);
      const motionRatio = motionPixels / (canvas.width * canvas.height);
      
      // User is detected if skin is found OR there is significant motion
      const detected = skinRatio > 0.02 || motionRatio > 0.01; 
      setIsUserDetected(detected);

      // Focus Heuristic: High if user is detected and motion is moderate (not too still, not too erratic)
      const focusScore = detected ? Math.max(0, 1 - (motionRatio * 5)) : 0;
      
      // Eye Contact Heuristic: Approximate by checking if skin is centered
      let eyeContactScore = 0;
      if (detected) {
        // Check central vertical strip for skin
        let centralSkin = 0;
        const startX = Math.floor(canvas.width * 0.4);
        const endX = Math.floor(canvas.width * 0.6);
        for (let y = 0; y < canvas.height; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            if (r > 60 && g > 40 && b > 20 && r > g && r > b) centralSkin++;
          }
        }
        const centralRatio = centralSkin / ((endX - startX) * canvas.height);
        eyeContactScore = Math.min(1, centralRatio * 2);
      }

      // Periodic metrics update
      const now = Date.now();
      if (now - metricsRef.current.lastUpdate > 300) { // Faster updates (300ms)
        if (onMetricsUpdate) {
          const avgEnergy = metricsRef.current.energyHistory.reduce((a, b) => a + b, 0) / metricsRef.current.energyHistory.length;
          
          // Confidence is a function of presence (ML) and audio energy
          const presenceFactor = detected ? 1.0 : 0.4;
          const confidenceBase = (Math.min(Math.max(avgEnergy / 40, 0), 0.5) + 0.5) * presenceFactor;
          
          onMetricsUpdate({
            confidence: confidenceBase,
            pauses: metricsRef.current.pauseCount,
            fumbling: energy < 3 ? 1 : Math.max(0, 0.3 - (energy / 150)), // Use current energy for real-time feel
            isUserDetected: detected,
            focus: focusScore,
            eyeContact: eyeContactScore
          });
          
          metricsRef.current.pauseCount = 0;
          metricsRef.current.lastUpdate = now;
        }
      }

      animationFrame = requestAnimationFrame(analyze);
    };

    analyze();
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive, onMetricsUpdate]);

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {isActive ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <CameraOff size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Camera is off</p>
        </div>
      )}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
        <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-red-500 animate-pulse" : "bg-slate-500")} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white">
          {isActive ? "ML Active" : "Standby"}
        </span>
      </div>
    </div>
  );
};
