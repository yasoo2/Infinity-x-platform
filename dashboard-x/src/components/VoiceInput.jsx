import { useState, useEffect, useRef } from 'react';

export default function VoiceInput({ onTranscript, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true; // استمرار الاستماع بعد التوقف المؤقت
      recognition.interimResults = true; // إظهار النتائج المؤقتة
      recognition.lang = 'ar-SA'; // Arabic
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        // إرسال النص النهائي فقط
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
        // لا توقف recognition.stop() هنا، بل دعه يستمر إذا كانت continuous = true
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        // إذا كانت continuous = true، فإن onend يتم استدعاؤها بعد التوقف المؤقت
        // يجب أن نبدأ الاستماع مرة أخرى إذا لم يتم إيقافه يدوياً
        if (recognitionRef.current && isListening) {
          recognitionRef.current.start();
        } else {
          setIsListening(false);
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, [onTranscript, isListening]);

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
