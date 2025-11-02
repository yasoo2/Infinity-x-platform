// src/hooks/useSpeechRecognition.js
import { useState, useEffect, useCallback } from 'react';

// تعريف واجهة SpeechRecognition (للتوافق مع المتصفحات)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  // إعدادات التعرف على الكلام
  if (recognition) {
    recognition.continuous = false; // يتوقف بعد جملة واحدة
    recognition.interimResults = false; // لا يعرض النتائج المؤقتة
    recognition.lang = 'ar-EG'; // دعم اللغة العربية (يمكن تغييره)
  }

  const startListening = useCallback(() => {
    if (!recognition) {
      setError('Speech Recognition not supported by this browser.');
      return;
    }
    
    // إعادة تعيين النص قبل البدء
    setTranscript('');
    setError(null);
    
    recognition.start();
    setIsListening(true);
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setError(`Speech Recognition Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    // تنظيف عند إلغاء تحميل المكون
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [recognition]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
};
