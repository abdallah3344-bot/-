import { defineCloudflareConfig } from '@opennextjs/cloudflare'

/**
 * إعداد OpenNext لـ Cloudflare.
 *
 * بلا تخزين مؤقت متزايد (incremental cache): كل صفحات النظام
 * ديناميكية ومحكومة بالجلسة والصلاحيات — لا شيء يُخزَّن مؤقتًا
 * ليُقدَّم لمستخدم آخر.
 */
export default defineCloudflareConfig()
