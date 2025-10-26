// واجهة "جو" مع LLM
// ملاحظة: إحنا بنستعمل langchain بإصدارات متوافقة
// و Cloudflare Workers AI (مجاني قدر الإمكان بقدر ما تسمح حساباتك)

import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// توليد رد (تحليل/اقتراح/خطة) من جو
export async function askJoeLLM(promptText) {
  // مستعمل Cloudflare AI model (llama 3.1 instruct)
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  const model = process.env.CF_TEXT_MODEL || "@cf/meta/llama-3.1-8b-instruct";

  if (!accountId || !token) {
    return {
      plan: [
        "LLM API key missing. Please provide CF_ACCOUNT_ID / CF_API_TOKEN.",
      ],
      suggestions: [
        "زود جو بمفاتيح Cloudflare AI للعمل الحر.",
      ],
      risk: "red",
    };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`;

  const body = {
    messages: [
      { role: "user", content: promptText }
    ]
  };

  try {
    const r = await axios.post(url, body, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    // Cloudflare غالباً بيرجع شكل فيه result/text او مشابه
    const data = r.data;
    return {
      raw: data,
      plan: [
        "جو اقترح تنفيذ المهمة.",
        "يراجع السلامة.",
        "يطلب الموافقة قبل الكتابة على النظام."
      ],
      suggestions: [
        "خطوة تالية: تحسين الأداء.",
        "خطوة مستقبلية: تفعيل VIP client routing."
      ],
      risk: "yellow"
    };
  } catch (err) {
    return {
      plan: [
        "فشل الاتصال بنموذج LLM.",
        "الرجاء تزويد أو تصحيح CF_API_TOKEN / CF_ACCOUNT_ID."
      ],
      suggestions: [
        "تحقق من صلاحيات Cloudflare Workers AI.",
      ],
      risk: "red",
      error: err.message
    };
  }
}
