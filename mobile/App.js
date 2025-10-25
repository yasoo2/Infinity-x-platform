import React from 'react';
import { View, StyleSheet } from 'react-native';
import Chatbot from 'react-chatbotify';
import axios from 'axios';

export default function AuraaMobile() {
  const apiUrl = 'http://localhost:10000/api/agent/execute'; // غيّرها إلى السيرفر المباشر

  async function handleMessage(message) {
    try {
      const response = await axios.post(apiUrl, { input: message, userId: 'mobile-user' });
      return response.data.output;
    } catch (err) {
      return 'خطأ: ' + err.message;
    }
  }

  return (
    <View style={styles.container}>
      <Chatbot
        config={{
          botName: 'InfinityX AI Architect',
          initialMessages: [{ text: 'مرحبًا من التطبيق! إسألني بناء مشروع، خطة تقنية، أو تعديل.' }],
          theme: { primaryColor: '#d4af37' },
        }}
        messageParser={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
