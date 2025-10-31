import { useState, useEffect, useRef } from 'react';

export default function VoiceInput({ onTranscript, onAutoSubmit, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA'; // Arabic
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
        // Auto-submit after 1 second
        if (onAutoSubmit) {
          setTimeout(() => onAutoSubmit(), 1000);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`
        p-3 rounded-lg transition-all duration-200
        ${isListening 
          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
          : 'bg-primary hover:bg-primary/80'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={isListening ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
    >
      {isListening ? '🔴' : '🎤'}
    </button>
  );
}
