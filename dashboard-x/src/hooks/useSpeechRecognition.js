// src/hooks/useSpeechRecognition.js
import { useState, useEffect, useCallback } from 'react';

// تعريف واجهة SpeechRecognition (للتوافق مع المتصفحات)
const SpeechRecognition = typeof window !== 'undefined' 
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  // تهيئة recognition داخل useEffect لضمان أنها تحدث مرة واحدة فقط بعد تحميل المكون
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (SpeechRecognition) {
      const newRecognition = new SpeechRecognition();
      newRecognition.continuous = true; // الاستمرار في التسجيل حتى يتم إيقافه يدوياً
      newRecognition.interimResults = true; // عرض النتائج المؤقتة أثناء التحدث
      newRecognition.lang = 'ar-EG'; // دعم اللغة العربية (يمكن تغييره)
      setRecognition(newRecognition);
    } else {
      setError('Speech Recognition not supported by this browser.');
    }
  }, []);

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
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);
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
