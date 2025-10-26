// تطبيق موبايل جاهز كبداية (Expo / React Native).
// جو رح ينسخ هاد ويحطه باسم العميل، ويعدل الألوان/النصوص.
// هذا التطبيق فيه 3 شاشات: Home / Products / Contact.
// لاحقاً بنضيف حجز مواعيد، كارت، الخ.

import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";

export default function App() {
  return (
    <View style={styles.app}>
      <View style={styles.header}>
        <Text style={styles.brand}>Your App</Text>
        <Text style={styles.sub}>Futuristic presence in your pocket</Text>
      </View>

      <ScrollView style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Featured Product</Text>
          <Text style={styles.cardPrice}>$99</Text>
          <Text style={styles.cardDesc}>
            Short description of what makes this product unique.
          </Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => Linking.openURL("https://wa.me/000000000")}
          >
            <Text style={styles.ctaText}>Order / اطلب</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About Us</Text>
          <Text style={styles.cardDesc}>
            Tell your story. Build trust. Modern branding for a modern business.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>
          <Text style={styles.cardDesc}>Instagram / WhatsApp / Phone</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© Your Brand. Future ready.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: "#000" },
  header: { padding: 24, borderBottomWidth: 1, borderBottomColor: "#222" },
  brand: { color: "#00e5ff", fontWeight: "700", fontSize: 24 },
  sub: { color: "#888", fontSize: 12, marginTop: 4 },

  section: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "#111",
    borderColor: "#222",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cardPrice: { color: "#00ff9d", fontSize: 16, fontWeight: "700", marginTop: 4 },
  cardDesc: { color: "#aaa", fontSize: 13, marginTop: 8, lineHeight: 18 },

  cta: {
    backgroundColor: "#00ff9d",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignSelf: "flex-start"
  },
  ctaText: { fontWeight: "700", color: "#000" },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#222",
    padding: 16
  },
  footerText: { color: "#666", fontSize: 12, textAlign: "center" }
});
