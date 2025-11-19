import axios from 'axios';

// استخدام متغير البيئة VITE_API_BASE_URL كعنوان URL أساسي
// إذا لم يكن موجودًا، سيتم استخدام المسار النسبي '/'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // مهم لإرسال ملفات تعريف الارتباط (Cookies)
});

export default api;
