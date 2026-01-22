import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, MicOff, MapPin, RotateCcw, Volume2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/chat';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking, error
  const [itinerary, setItinerary] = useState(null);
  const [sources, setSources] = useState([]);
  const [itineraryHistory, setItineraryHistory] = useState(() => {
    // Load from localStorage on initial render
    try {
      const saved = localStorage.getItem('tripgpt_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load history:', e);
      return [];
    }
  });

  // Refs
  const recognitionRef = useRef(null);
  const transcriptRef = useRef(''); // To access latest transcript in callbacks without re-render dependency

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interimTranscript += event.results[i][0].transcript;
        }
        setTranscript(interimTranscript);
        transcriptRef.current = interimTranscript;
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (transcriptRef.current.trim().length > 0) {
          handleSendMessage(transcriptRef.current);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Error", event.error);
        setStatus('idle');
        setIsListening(false);
      }
    } else {
      alert("Browser doesn't support speech recognition.");
    }
  }, []); // Empty dependency array to init once

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tripgpt_history', JSON.stringify(itineraryHistory));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [itineraryHistory]);

  const startListening = () => {
    setTranscript('');
    transcriptRef.current = '';
    setIsListening(true);
    setStatus('listening');
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current.stop();
  };

  const handleSendMessage = async (text) => {
    if (!text) return;

    setStatus('processing');
    const newHistory = [...history, { role: 'user', content: text }];
    setHistory(newHistory);

    try {
      const res = await axios.post(API_URL, { history: newHistory });
      const assistantMessage = res.data; // { role, content, itinerary? }

      setHistory(prev => [...prev, { role: 'assistant', content: assistantMessage.content }]);

      if (assistantMessage.itinerary) {
        console.log("Received Itinerary:", assistantMessage.itinerary);
        setItinerary(assistantMessage.itinerary);

        // Save to history
        const newHistoryItem = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          itinerary: assistantMessage.itinerary,
          query: text
        };
        setItineraryHistory(prev => [newHistoryItem, ...prev].slice(0, 10)); // Keep last 10
      }

      // Update sources if available
      if (assistantMessage.sources && assistantMessage.sources.length > 0) {
        console.log("Received Sources:", assistantMessage.sources);
        setSources(assistantMessage.sources);
      }

      setStatus('idle');
      speak(assistantMessage.content);

    } catch (error) {
      console.error("API Error", error);
      // Try to extract server error message
      const serverMsg = error.response?.data?.error || "Connection Error";
      setStatus('error');
      // Show error in transcript or separate toast? 
      // For now, let's abuse the transcript state to show the error
      setTranscript(`Error: ${serverMsg}`);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      setStatus('speaking');
      // Cancel previous
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setStatus('idle');
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleExportPDF = async () => {
    if (!itinerary) return;
    try {
      // Allow user to enter email simply via prompt for now (or could add a modal)
      const email = prompt("Enter email to receive the PDF:", "user@example.com");
      if (!email) return;

      setStatus('processing');
      const apiBase = API_URL.replace('/api/chat', '');
      const res = await axios.post(`${apiBase}/api/generate-pdf`, {
        itinerary,
        email
      });
      alert(res.data.message || "PDF Exported!");
      setStatus('idle');
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
      setStatus('idle');
    }
  };

  const renderItinerary = () => {
    if (!itinerary || !itinerary.days) return null;
    return (
      <div className="w-full max-w-4xl mx-auto glass-card p-8 rounded-3xl mt-12 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
          <span className="text-4xl">🗺️</span> Your Trip Plan
        </h2>
        <div className="grid gap-8">
          {itinerary.days.map(day => (
            <div key={day.day} className="relative pl-8 border-l-2 border-white/10 pb-8 last:pb-0">
              {/* Day Marker */}
              <div className="absolute -left-[21px] top-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border-2 border-blue-500 text-blue-400 font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                {day.day}
              </div>

              <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all hover:bg-slate-800/60">
                <div className="space-y-6">
                  {day.activities.map((act, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <div className="w-16 pt-1 text-right text-sm font-mono text-blue-300/80 group-hover:text-blue-300 transition-colors">
                        {act.time}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white text-lg group-hover:text-blue-200 transition-colors">
                          {act.activity}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                          <MapPin size={14} className="text-purple-400" />
                          <span>{act.location}</span>
                        </div>
                        {act.notes && (
                          <div className="mt-2 text-sm text-slate-500 italic border-l-2 border-slate-700 pl-3">
                            {act.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  };

  return (
    <div className={`min-h-screen bg-brand-dark text-white font-sans overflow-hidden flex flex-col relative selection:bg-pink-500/30 world-map-bg transition-all duration-500 ${status === 'listening' ? 'blur-[2px]' : ''}`}>

      {/* Background Aurora Wave */}
      <div className="aurora-wave"></div>

      {/* Listening Overlay */}
      {status === 'listening' && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 pointer-events-none"></div>
      )}

      {/* History Sidebar */}
      {itineraryHistory.length > 0 && (
        <div className="fixed left-4 top-24 z-40 w-64 max-h-[70vh] overflow-y-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <span className="text-lg">📜</span> History
            </h3>
            <button
              onClick={() => {
                if (confirm('Clear all history?')) {
                  setItineraryHistory([]);
                  setItinerary(null);
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
              title="Clear all history"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {itineraryHistory.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setItinerary(item.itinerary)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-primary/50 transition-all group"
              >
                <div className="text-xs text-white/40 mb-1">{item.timestamp}</div>
                <div className="text-sm text-white/80 group-hover:text-white truncate">
                  {item.query || `Trip ${idx + 1}`}
                </div>
                <div className="text-xs text-brand-primary/60 mt-1">
                  {item.itinerary.days?.length || 0} days
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Container - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 p-4">
        {/* Glowing Orb Container */}
        <div className="relative mb-12 group cursor-pointer" onClick={isListening ? stopListening : startListening}>

          {/* Waveform Animation (when listening) */}
          {status === 'listening' && (
            <div className="absolute inset-0 flex items-center justify-center gap-1 z-10">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white/40 rounded-full"
                  style={{
                    animation: `waveform ${0.6 + i * 0.1}s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                    height: '20%'
                  }}
                />
              ))}
            </div>
          )}

          {/* Main Orb */}
          <div className={`
            w-40 h-40 rounded-full flex items-center justify-center relative z-20 transition-all duration-500
            ${status === 'listening'
              ? 'orb-gradient animate-pulse-glow scale-110'
              : 'orb-gradient grayscale-[0.5] hover:grayscale-0 scale-100 opacity-90 hover:opacity-100 hover:scale-105'}
          `}>
            {/* Inner White Icon */}
            {status === 'listening' ? <Mic className="w-16 h-16 text-white drop-shadow-md" /> :
              status === 'processing' ? <RotateCcw className="w-16 h-16 text-white animate-spin" /> :
                status === 'speaking' ? <Volume2 className="w-16 h-16 text-white animate-bounce" /> :
                  status === 'error' ? <div className="text-4xl text-white font-bold">!</div> :
                    <MicOff className="w-16 h-16 text-white/80" />}
          </div>

          {/* Pulsing Ring (idle state) */}
          {status === 'idle' && (
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-30"></div>
          )}

          {/* CTA Text Below Mic */}
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center w-64">
            {status === 'idle' && (
              <p className="text-sm text-white/50 group-hover:text-white/80 transition-colors">
                Tap and speak your trip idea
              </p>
            )}
            {status === 'listening' && (
              <p className="text-sm text-blue-300 animate-pulse">
                Listening... Tell me where you want to go
              </p>
            )}
          </div>
        </div>

        {/* Title Text */}
        <div className="text-center z-20">
          <h1 className="text-4xl md:text-5xl font-bold tracking-widest uppercase mb-2 drop-shadow-lg animate-gradient-shift">
            Trip<span className="font-extralight text-white/70">GPT</span>
          </h1>
          <p className="text-sm md:text-base tracking-[0.2em] text-cyan-200/80 font-light uppercase mb-4">
            Voice Assistant
          </p>

          {/* Trust Signal */}
          <div className="flex items-center justify-center gap-4 mb-6 text-xs text-white/50">
            <span className="flex items-center gap-1">📍 Real Places</span>
            <span className="flex items-center gap-1">⏱️ Practical Timings</span>
            <span className="flex items-center gap-1">🤖 AI-Powered</span>
          </div>

          <p className="text-white/60 text-sm md:text-base max-w-md mx-auto leading-relaxed font-light">
            Plan your dream trip with voice. Just speak to explore destinations, build itineraries, and discover hidden gems.
          </p>

          {/* Example Prompts - Only show when idle */}
          {status === 'idle' && !itinerary && (
            <div className="mt-8 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">Try saying:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { text: "3-day trip to Tokyo", icon: "🗼" },
                  { text: "Weekend in Paris", icon: "🥐" },
                  { text: "Beach vacation in Bali", icon: "🏖️" },
                  { text: "Food tour in Rome", icon: "🍝" }
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const fullPrompt = `Plan a ${prompt.text}`;
                      setTranscript(fullPrompt);
                      transcriptRef.current = fullPrompt;
                      handleSendMessage(fullPrompt);
                    }}
                    className="text-xs px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-primary/50 text-white/70 hover:text-white transition-all hover:scale-105"
                    style={{ animation: `float-gentle ${3 + i * 0.5}s ease-in-out infinite` }}
                  >
                    {prompt.icon} {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feature Pills - Only show when idle and no itinerary */}
        {status === 'idle' && !itinerary && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-20">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
              <span className="text-sm">🎤</span>
              <span className="text-xs text-white/60">Voice-First</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
              <span className="text-sm">🗺️</span>
              <span className="text-xs text-white/60">Real Places</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
              <span className="text-sm">⚡</span>
              <span className="text-xs text-white/60">AI-Powered</span>
            </div>
          </div>
        )}

        {/* Dynamic Status / Transcript Overlay */}
        <div className={`mt-8 text-center max-w-lg transition-all duration-500 ${transcript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xl font-light text-white/90 leading-relaxed drop-shadow-md">
            "{transcript}"
          </p>
          {status === 'error' && <p className="text-red-400 mt-2 text-sm font-bold bg-black/20 px-4 py-1 rounded-full inline-block backdrop-blur-md">Error: {transcript}</p>}
        </div>

        {/* Itinerary Overlay (Modal-like) */}
        {itinerary && (
          <div className="mt-12 w-full max-w-4xl animate-fade-in-up bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 max-h-[50vh] overflow-y-auto custom-scrollbar shadow-2xl z-30 relative">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-pink-400">📍</span> Itinerary
                </h2>
                <button
                  onClick={() => handleExportPDF()}
                  className="text-xs bg-brand-primary/20 hover:bg-brand-primary/40 text-blue-300 border border-brand-primary/50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2"
                >
                  <span className="text-lg">📄</span> Export PDF
                </button>
              </div>
              <button onClick={() => setItinerary(null)} className="text-white/50 hover:text-white transition-colors">Close</button>
            </div>

            <div className="space-y-6">
              {itinerary.days.map(day => (
                <div key={day.day} className="relative pl-6 border-l border-white/20">
                  <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                  <span className="text-cyan-300 text-sm font-bold uppercase tracking-wider mb-2 block">Day {day.day}</span>

                  <div className="space-y-4">
                    {day.activities.map((act, id) => (
                      <div key={id} className="group">
                        <div className="flex gap-4 items-baseline">
                          <span className="text-white/60 font-mono text-xs w-12 text-right">{act.time}</span>
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-white group-hover:text-pink-300 transition-colors">{act.activity}</h4>
                            <p className="text-sm text-white/50 flex items-center gap-1"><MapPin size={12} /> {act.location}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <div className="mt-8 w-full max-w-4xl animate-fade-in-up bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl z-30">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span> Sources & References
            </h3>
            <div className="space-y-3">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-primary/50 rounded-xl transition-all group">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">🔗</span>
                    <div className="flex-1">
                      {source.title && (
                        <div className="text-sm font-medium text-white group-hover:text-brand-primary transition-colors">
                          {source.title}
                        </div>
                      )}
                      <div className="text-xs text-white/60 mt-1">{source.source}</div>
                      <div className="text-xs text-brand-primary/50 group-hover:text-brand-primary/80 mt-1 truncate">
                        {source.url}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div >
  );
}

export default App;
