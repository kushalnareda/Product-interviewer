import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Activity, HelpCircle } from 'lucide-react';
import { Button } from './components/Button';
import { Whiteboard } from './components/Whiteboard';
import { Visualizer } from './components/Visualizer';
import { liveClient } from './services/live';
import { base64ToUint8Array, decodeAudioData, createPcmBlob } from './utils/audio';
import { ConnectionState } from './types';

const App: React.FC = () => {
  // UI State
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [whiteboardContent, setWhiteboardContent] = useState('');
  const [questionContext, setQuestionContext] = useState('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const isMicMutedRef = useRef(false);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Sync muted state to ref to avoid stale closures in audio processor
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const stopAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const handleConnect = async () => {
    setErrorMsg(null);
    setConnectionState(ConnectionState.CONNECTING);
    
    try {
      // 1. Setup Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      // Output Node (Speaker)
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      outputNodeRef.current = outputNode;

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect to Gemini Live with Context
      await liveClient.connect({
        onOpen: () => {
          setConnectionState(ConnectionState.CONNECTED);
          
          // Start Input Processing
          const source = inputCtx.createMediaStreamSource(stream);
          const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptProcessor;
          
          scriptProcessor.onaudioprocess = (e) => {
            if (isMicMutedRef.current) return; // Don't send if muted
            
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            
            // Send to Gemini
            liveClient.sendAudio(pcmBlob);
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputCtx.destination);
        },
        onMessage: async (message) => {
            // Handle Audio from Gemini
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
                setIsAiSpeaking(true);
                
                // Decode
                const audioData = base64ToUint8Array(base64Audio);
                const audioBuffer = await decodeAudioData(
                    audioData, 
                    outputAudioContextRef.current, 
                    24000, 
                    1
                );

                // Play
                const ctx = outputAudioContextRef.current;
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNodeRef.current);
                
                // Scheduling
                if (nextStartTimeRef.current < ctx.currentTime) {
                    nextStartTimeRef.current = ctx.currentTime;
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                sourcesRef.current.add(source);
                
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        setIsAiSpeaking(false);
                    }
                };
            }
            
            if (message.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => {
                     try { s.stop(); } catch (e) {}
                 });
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = outputAudioContextRef.current?.currentTime || 0;
                 setIsAiSpeaking(false);
            }
        },
        onError: (e) => {
          console.error("Live Client Error:", e);
          setErrorMsg("Connection Error. Please check your API key and network.");
          setConnectionState(ConnectionState.ERROR);
          stopAudio();
        },
        onClose: () => {
          setConnectionState(ConnectionState.DISCONNECTED);
          stopAudio();
          setIsAiSpeaking(false);
        }
      }, questionContext); // Pass the context here

    } catch (err: any) {
      console.error("Failed to connect:", err);
      setErrorMsg(err.message || "Failed to connect to microphone or API.");
      setConnectionState(ConnectionState.ERROR);
      stopAudio();
    }
  };

  const handleDisconnect = () => {
    liveClient.close();
    stopAudio();
    setConnectionState(ConnectionState.DISCONNECTED);
    setIsAiSpeaking(false);
    setErrorMsg(null);
  };

  const toggleMute = () => {
    setIsMicMuted(prev => !prev);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <Activity size={20} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="font-bold text-slate-900 text-lg leading-none">PM Live Simulator</h1>
                    <p className="text-slate-500 text-xs mt-1 font-medium">Senior PM Edition</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 {connectionState === ConnectionState.CONNECTED ? (
                     <>
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium animate-pulse border border-red-100">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Live
                        </div>
                        <Button 
                            onClick={toggleMute} 
                            variant={isMicMuted ? "danger" : "secondary"}
                            className="w-10 h-10 !p-0 rounded-full"
                        >
                            {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </Button>
                        <Button 
                            onClick={handleDisconnect} 
                            variant="danger"
                            className="px-4 py-2"
                        >
                            End Interview
                        </Button>
                     </>
                 ) : (
                     <Button 
                        onClick={handleConnect} 
                        variant="primary"
                        isLoading={connectionState === ConnectionState.CONNECTING}
                        className="px-6 shadow-lg shadow-indigo-200"
                        icon={<Play size={18} fill="currentColor" />}
                        disabled={!questionContext.trim()}
                     >
                        Start Interview
                     </Button>
                 )}
            </div>
        </header>

        {/* Main Grid */}
        <main className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-0">
            
            {/* Left: Context & Visualizer */}
            <div className="flex flex-col gap-6 h-full min-h-0">
                
                {/* Connection / Visualizer Area */}
                <div className="bg-slate-900 rounded-2xl p-1 shadow-lg flex-none border border-slate-800">
                    <Visualizer 
                        isActive={connectionState === ConnectionState.CONNECTED}
                        isSpeaking={isAiSpeaking}
                        isListening={!isMicMuted && connectionState === ConnectionState.CONNECTED}
                    />
                </div>

                {/* Setup / Context Area */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex-1 overflow-y-auto flex flex-col">
                    <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                        <HelpCircle size={18} className="text-indigo-600" />
                        <h2>Interview Context</h2>
                    </div>
                    
                    {connectionState === ConnectionState.DISCONNECTED ? (
                        <>
                            <p className="text-sm text-slate-500 mb-4">
                                Write down the specific question or case study you want to practice. 
                                The interviewer will use this to guide the session.
                            </p>
                            <textarea 
                                className="w-full flex-1 p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
                                placeholder="e.g., Design a vending machine for blind people..."
                                value={questionContext}
                                onChange={(e) => setQuestionContext(e.target.value)}
                            />
                             {questionContext.trim().length === 0 && (
                                <p className="text-xs text-amber-600 mt-2 font-medium">
                                    * Please enter a question to start.
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col">
                             <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 mb-4">
                                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-1">Current Case</h3>
                                <p className="text-indigo-800 text-sm leading-relaxed">{questionContext}</p>
                             </div>
                             
                             <div className="mt-auto space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Evaluation Criteria</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">1. User Empathy</div>
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">2. Strategic Insight</div>
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">3. Solution Creativity</div>
                                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">4. Metrics & Success</div>
                                </div>
                             </div>
                        </div>
                    )}

                    {(connectionState === ConnectionState.ERROR || errorMsg) && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
                            {errorMsg || "Connection failed. Please check your microphone permissions and API key."}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Whiteboard */}
            <div className="h-full min-h-0 shadow-lg rounded-xl">
                <Whiteboard 
                    value={whiteboardContent} 
                    onChange={setWhiteboardContent} 
                />
            </div>

        </main>
    </div>
  );
};

export default App;