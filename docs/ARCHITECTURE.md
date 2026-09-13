# نظام إدارة مكتب المحاماة — وثيقة المعمارية

> Law Office Management System — Architecture Document
> الإصدار: 1.0 · قاعدة البيانات: Supabase/PostgreSQL 17 · المنطقة: eu-central-1

---

## 1. المعمارية العامة (Architecture)

### 1.1 الاختيار التقني ولماذا

| الطبقة | التقنية | سبب الاختيار |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Server Components تسمح بجلب البيانات وفرض الصلاحيات على الخادم قبل وصول أي بايت للمتصفح. Server Actions تُلغي الحاجة لطبقة REST يدوية. Middleware لإدارة الجلسة. |
| اللغة | **TypeScript (strict)** | أنواع مولّدة تلقائيًا من مخطط قاعدة البيانات ⇒ أي تغيير في الجدول يكسر البناء بدل أن يكسر الإنتاج. |
| التنسيق | **Tailwind CSS v4** | دعم `dir="rtl"` أصلي عبر الخصائص المنطقية (`ps-*`, `me-*`, `start-*`) بدل `left/right`. |
| المكوّنات | **shadcn/ui** (منسوخة داخل المستودع) | الكود ملكنا ⇒ يمكن تعديله لـ RTL والعربية بدون انتظار المكتبة. |
| قاعدة البيانات | **PostgreSQL 17 عبر Supabase** | علاقات حقيقية، قيود، فهارس، ومحرّك RLS. |
| المصادقة | **Supabase Auth (GoTrue)** | تشفير كلمات المرور (bcrypt)، JWT، إدارة جلسات، استعادة كلمة المرور — كلها مُختبَرة أمنيًا. |
| الصلاحيات | **RBAC على مستويين: RLS في القاعدة + فحص في Server Actions** | دفاع في العمق: حتى لو أخطأ الكود، القاعدة ترفض. |
| الملفات | **Supabase Storage (bucket خاص)** | لا وصول مباشر للملفات؛ روابط موقّعة مؤقتة فقط. |
| الرسوم البيانية | **Recharts** | يعمل مع React 19 ويدعم عكس المحاور للـ RTL. |

### 1.2 لماذا Next.js وليس Vite

الفارق الحاسم أمني. في Vite (SPA) كل جلب بيانات يحدث في المتصفح، ما يعني أن الحماية الوحيدة هي RLS، وأي خطأ في سياسة واحدة يكشف بيانات قانونية حساسة. مع Next.js نفرض الصلاحية مرتين: مرة في Server Component/Action قبل الاستعلام، ومرة في RLS داخل القاعدة. المتطلب في البند 33 «لا تعرض أي بيانات لمستخدم ليس لديه صلاحية» يستوجب هذا المستوى.

### 1.3 تدفّق الطلب (Request Flow)

```
المتصفح
   │
   ▼
middleware.ts ──► تحديث/تحقق جلسة Supabase (cookies) ──► إعادة توجيه لـ /login إن لم توجد جلسة
   │
   ▼
Server Component (RSC)
   │  requirePermission('cases','view')  ← يرمي 403 قبل أي استعلام
   ▼
createServerClient()  ← عميل Supabase يحمل JWT المستخدم
   │
   ▼
PostgreSQL + RLS  ← السياسة تُصفّي الصفوف حسب الدور والقضايا المسندة
   │
   ▼
HTML مُصيَّر على الخادم ──► المتصفح (لا تصل أي بيانات غير مصرّح بها للعميل أصلًا)
```

للكتابة:

```
نموذج (Client Component + react-hook-form + zod)
   │
   ▼
Server Action
   │  1. zod.parse()            ← تحقق من صحة المدخلات
   │  2. requirePermission()    ← تحقق من الصلاحية
   │  3. استعلام الكتابة
   │  4. writeAuditLog()        ← تسجيل العملية
   │  5. revalidatePath()       ← تحديث الكاش
   ▼
النتيجة تعود للنموذج (نجاح أو خطأ حقلي)
```

---

## 2. هيكل المجلدات (Folder Structure)

```
src/
├── app/
│   ├── (auth)/                    # مسارات عامة بدون Sidebar
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (app)/                     # مسارات محمية بـ Sidebar + Header
│   │   ├── layout.tsx             # يفرض وجود جلسة + يبني القائمة حسب الصلاحيات
│   │   ├── dashboard/
│   │   ├── clients/[id]/
│   │   ├── cases/[id]/            # Case Workspace — أهم صفحة
│   │   ├── hearings/  calendar/  tasks/  documents/
│   │   ├── powers-of-attorney/  contracts/
│   │   ├── fees/  invoices/  payments/  expenses/  accounts/
│   │   ├── correspondence/  staff/  reports/  archive/
│   │   ├── notifications/  settings/  users/  audit-log/
│   │   └── api/                   # مسارات REST عند الحاجة (تحميل ملف، PDF)
│   └── layout.tsx                 # dir="rtl" lang="ar" + الخطوط + الثيم
│
├── components/
│   ├── ui/                        # shadcn/ui الأساسية (Button, Input, Table…)
│   ├── layout/                    # Sidebar, Header, GlobalSearch, UserMenu
│   ├── shared/                    # DataTable, EmptyState, ConfirmDialog, StatCard
│   └── forms/                     # حقول قابلة لإعادة الاستخدام
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # عميل المتصفح
│   │   ├── server.ts              # عميل الخادم (يقرأ الكوكيز)
│   │   ├── admin.ts               # service-role — للخادم فقط، لعمليات الإدارة
│   │   └── middleware.ts          # تحديث الجلسة
│   ├── auth/
│   │   ├── session.ts             # getCurrentUser, requireAuth
│   │   └── permissions.ts         # can(), requirePermission(), PERMISSIONS
│   ├── audit.ts                   # كتابة سجل العمليات
│   ├── validators/                # مخططات zod لكل وحدة
│   ├── constants/                 # قوائم ثابتة (حالات، أنواع، ألوان)
│   └── utils.ts                   # cn(), تنسيق التاريخ/العملة بالعربية
│
├── modules/                       # منطق كل وحدة مستقلًا (Modular)
│   └── <module>/
│       ├── actions.ts             # Server Actions
│       ├── queries.ts             # استعلامات القراءة
│       ├── schema.ts              # zod
│       └── components/
│
├── types/
│   ├── database.ts                # مولّد من Supabase
│   └── index.ts
│
└── middleware.ts

supabase/migrations/               # كل تغيير على القاعدة كملف SQL مرقّم
docs/                              # هذه الوثيقة + دليل التشغيل
```

**قاعدة العزل:** أي وحدة جديدة = مجلد واحد في `modules/` + مجلد مسار في `app/(app)/`. لا تعديل على وحدات أخرى. هذا ما يجعل النظام قابلًا للتوسع فعليًا.

---

## 3. مخطط قاعدة البيانات (Database Schema)

### 3.1 مبادئ التصميم

- **المفاتيح:** `uuid` مع `gen_random_uuid()` لكل الجداول.
- **الطوابع الزمنية:** `created_at`, `updated_at` (محدَّث عبر trigger)، و`created_by`, `updated_by`.
- **الحذف الناعم:** `deleted_at timestamptz` على كل جدول يحمل بيانات أعمال. لا حذف فعلي لبيانات قانونية.
- **الأرقام التسلسلية:** `client_no`, `case_no`, `invoice_no`… تُولَّد عبر دالة في القاعدة لضمان عدم التكرار تحت التزامن.
- **القيود:** `CHECK` على كل حقل حالة/نوع، `NOT NULL` على كل حقل إلزامي، `UNIQUE` على الأرقام التسلسلية.
- **الفهارس:** على كل مفتاح أجنبي + كل حقل يُبحث فيه أو يُرتَّب به + فهرس `GIN` للبحث النصي العربي.
- **المال:** `numeric(14,2)` — لا `float` إطلاقًا.

### 3.2 الجداول

#### أ. الهوية والصلاحيات
| الجدول | الغرض | حقول رئيسية |
|---|---|---|
| `auth.users` | يديره Supabase | البريد، كلمة المرور المشفّرة |
| `profiles` | الملف الشخصي المرتبط بـ auth.users | `id (FK→auth.users)`, `username`, `full_name`, `role_id`, `phone`, `job_title`, `is_active`, `avatar_url` |
| `roles` | الأدوار | `code`, `name_ar`, `is_system` |
| `permissions` | الصلاحيات الذرّية | `code` (`cases.view`), `module`, `action` |
| `role_permissions` | ربط دور↔صلاحية | `role_id`, `permission_id` |
| `user_permissions` | تجاوز فردي (للمستخدم المخصص) | `user_id`, `permission_id`, `granted (bool)` |

#### ب. المراجع (Lookups — قابلة للإضافة من الإعدادات)
`case_types`, `courts`, `court_chambers`, `judges`, `document_categories`, `expense_categories`

#### ج. النواة
| الجدول | أهم الحقول |
|---|---|
| `clients` | `client_no`, `name`, `client_type`, `national_id`, `phone`, `whatsapp`, `email`, `address`, `occupation`, `file_opened_at`, `responsible_lawyer_id`, `status`, `notes` |
| `cases` | `internal_no`, `court_case_no`, `title`, `client_id`, `responsible_lawyer_id`, `assistant_lawyer_id`, `case_type_id`, `court_id`, `chamber_id`, `judge_id`, `governorate`, `registered_at`, `first_hearing_at`, `litigation_degree`, `claim_amount`, `priority`, `status`, `description` |
| `opponents` | `case_id`, `name`, `national_id`, `phone`, `address`, `lawyer_name`, `lawyer_phone`, `notes` |
| `hearings` | `case_id`, `court_id`, `hearing_date`, `hearing_time`, `room`, `judge_id`, `assigned_lawyer_id`, `hearing_type`, `required_action`, `result`, `decision`, `next_hearing_date` |
| `tasks` | `title`, `case_id`, `client_id`, `assignee_id`, `due_date`, `priority`, `status` |
| `documents` | `name`, `category_id`, `case_id`, `client_id`, `storage_path`, `mime_type`, `size_bytes`, `uploaded_by`, `ocr_text`, `ocr_status`, `ocr_extracted` |
| `powers_of_attorney` | `poa_no`, `client_id`, `case_id`, `poa_type`, `issued_at`, `expires_at`, `lawyer_id`, `status`, `document_id` |
| `contracts` | `contract_no`, `title`, `client_id`, `counterparty`, `contract_type`, `start_date`, `end_date`, `value`, `lawyer_id`, `status`, `document_id` |

#### د. المالية
| الجدول | أهم الحقول |
|---|---|
| `case_fees` | `case_id`, `total_amount`, `advance_amount`, `installments_count`, `installment_amount`, `notes` |
| `fee_installments` | `case_fee_id`, `seq`, `amount`, `due_date`, `status` |
| `invoices` | `invoice_no`, `client_id`, `case_id`, `issue_date`, `due_date`, `subtotal`, `discount`, `tax_rate`, `tax_amount`, `total`, `paid_amount`, `status` |
| `invoice_items` | `invoice_id`, `description`, `quantity`, `unit_price`, `line_total` |
| `payments` | `receipt_no`, `client_id`, `case_id`, `invoice_id`, `amount`, `method`, `paid_at`, `received_by`, `notes` |
| `expenses` | `case_id`, `client_id`, `category_id`, `amount`, `spent_at`, `description`, `is_billable` |
| `accounts` | `name`, `account_type` (cash/bank), `bank_name`, `iban`, `opening_balance` |
| `transactions` | `account_id`, `direction` (in/out), `amount`, `occurred_at`, `source_table`, `source_id` |

#### هـ. المساندة
`correspondence`, `appointments`, `notifications`, `notification_settings`, `audit_logs`, `settings`, `case_notes`, `case_status_history`

### 3.3 ERD المنطقي

```
                            ┌──────────┐
                            │  roles   │
                            └────┬─────┘
                                 │ 1
                                 │
                            ┌────▼─────┐        ┌──────────────────┐
                ┌───────────┤ profiles ├────────┤ user_permissions │
                │           └────┬─────┘        └──────────────────┘
                │ responsible    │ assignee
                │                │
          ┌─────▼─────┐    ┌─────▼─────┐
          │  clients  │    │   tasks   │
          └─────┬─────┘    └─────▲─────┘
                │ 1              │ N
                │ N              │
          ┌─────▼──────────────────────────────────┐
          │                cases                   │
          └──┬───┬───┬────┬────┬────┬────┬────┬────┘
             │N  │N  │N   │N   │N   │N   │N   │N
    ┌────────▼┐ ┌▼──────┐ │ ┌──▼─────┐ │ ┌──▼──────┐
    │opponents│ │hearings│ │ │documents│ │ │expenses │
    └─────────┘ └────────┘ │ └────┬────┘ │ └─────────┘
                           │      │      │
              ┌────────────▼┐  ┌──▼──────────────┐
              │  case_fees  │  │powers_of_attorney│
              └──────┬──────┘  └─────────────────┘
                     │ 1
                     │ N
           ┌─────────▼─────────┐
           │ fee_installments  │
           └───────────────────┘

    clients ──1:N──► invoices ──1:N──► invoice_items
                        │ 1
                        │ N
                        ▼
                    payments ──► transactions ──► accounts
```

**العلاقات المطبَّقة فعليًا كـ FOREIGN KEY في القاعدة:**

- العميل لديه عدة قضايا: `cases.client_id → clients.id` (RESTRICT — لا يُحذف عميل له قضايا)
- القضية لديها عدة جلسات: `hearings.case_id → cases.id` (CASCADE)
- القضية لديها عدة مستندات: `documents.case_id → cases.id`
- القضية لديها عدة مهام: `tasks.case_id → cases.id`
- القضية لديها عدة فواتير: `invoices.case_id → cases.id`
- الفاتورة لديها عدة دفعات: `payments.invoice_id → invoices.id`
- القضية لديها عدة مصروفات: `expenses.case_id → cases.id`
- المحامي لديه عدة قضايا: `cases.responsible_lawyer_id → profiles.id`

---

## 4. استراتيجية المصادقة (Authentication Strategy)

### 4.1 الآلية

نستخدم Supabase Auth. كلمات المرور تُشفَّر بـ bcrypt داخل `auth.users` ولا تمرّ أبدًا عبر جداولنا.

**الدخول باسم المستخدم أو البريد:** Supabase يصادق بالبريد فقط. لذلك:

1. المستخدم يُدخل `username` أو `email`.
2. إن لم يحتوِ النص على `@`، نستدعي دالة قاعدة بيانات `resolve_login_email(identifier)` — وهي `SECURITY DEFINER` تُرجع البريد المقابل لاسم المستخدم، ولا تكشف شيئًا آخر.
3. نمرّر البريد الناتج إلى `signInWithPassword`.
4. عند فشل أي خطوة نُظهر رسالة واحدة موحّدة («بيانات الدخول غير صحيحة») لمنع تعداد الحسابات.

### 4.2 إدارة الجلسة

- الجلسة في **كوكيز HttpOnly** يديرها `@supabase/ssr` — غير قابلة للقراءة من JavaScript ⇒ محصّنة ضد XSS.
- `middleware.ts` يُحدّث التوكن المنتهي في كل طلب، ويعيد التوجيه إلى `/login` عند غيابه.
- تسجيل الخروج يُبطل الجلسة على الخادم ويمسح الكوكيز.

### 4.3 حماية المسارات — ثلاث طبقات

| الطبقة | ما تمنعه |
|---|---|
| `middleware.ts` | الوصول لأي مسار محمي بدون جلسة |
| `requirePermission()` في كل Server Component/Action | مستخدم مسجّل لكن بلا صلاحية الوحدة |
| سياسات RLS | أي استعلام يصل للقاعدة، حتى لو تجاوز الطبقتين أعلاه |

### 4.4 استعادة وتغيير كلمة المرور

- **استعادة:** `resetPasswordForEmail` يرسل رابطًا موقّتًا → `/reset-password`. الرد على الطلب موحّد دائمًا سواء وُجد البريد أم لا.
- **تغيير:** يتطلب إعادة التحقق من كلمة المرور الحالية قبل `updateUser`.

---

## 5. الأدوار والصلاحيات (Roles & Permissions)

### 5.1 الصلاحية الذرّية

كل صلاحية = `module.action`. الأفعال الثمانية المطلوبة:

`view` · `create` · `update` · `delete` · `print` · `export` · `download` · `approve`

الوحدات: `dashboard, clients, cases, hearings, calendar, tasks, documents, poa, contracts, fees, invoices, payments, expenses, accounts, correspondence, staff, reports, archive, notifications, settings, users, audit`

### 5.2 الأدوار الافتراضية

| الدور | `code` | النطاق |
|---|---|---|
| مدير النظام | `super_admin` | كل شيء، بما فيه المستخدمون وسجل العمليات والإعدادات |
| مدير المكتب | `office_manager` | كل شيء عدا إدارة المستخدمين وحذف سجل العمليات |
| محامي | `lawyer` | القضايا والعملاء **المسندة إليه فقط** + الجلسات والمهام والمستندات المرتبطة بها |
| سكرتير | `secretary` | العملاء، الجلسات، المواعيد، المهام، المستندات، المراسلات — بلا وصول مالي |
| محاسب | `accountant` | الأتعاب، الفواتير، المقبوضات، المصروفات، الحسابات، التقارير المالية — قراءة فقط على القضايا |
| مستخدم مخصص | `custom` | لا شيء افتراضيًا؛ تُمنح الصلاحيات يدويًا |

### 5.3 حساب الصلاحية الفعّالة

```
الصلاحية الفعّالة = صلاحيات الدور  ∪  المنوحة فرديًا  −  المرفوضة فرديًا
```

`user_permissions.granted = true` تضيف، و`false` تسحب. هذا يجعل «مستخدم مخصص» ممكنًا دون تعريف دور جديد لكل حالة.

### 5.4 عزل بيانات المحامي (Row-level)

الصلاحية وحدها لا تكفي: محامٍ لديه `cases.view` يجب ألّا يرى قضايا زميله. لذلك في RLS:

```sql
-- قراءة القضايا
USING (
  deleted_at IS NULL
  AND has_perm('cases','view')
  AND (
    NOT is_lawyer_scoped()                 -- مدير/محاسب/سكرتير: كل القضايا
    OR responsible_lawyer_id = auth.uid()  -- المحامي: المسندة إليه
    OR assistant_lawyer_id  = auth.uid()
  )
)
```

ونفس الشرط ينتشر عبر `EXISTS` إلى الجلسات والمستندات والمهام والفواتير المرتبطة بالقضية.

الدوال المساعدة (`SECURITY DEFINER`, `STABLE`) تُقرأ من `search_path` مثبّت لمنع الاختطاف:
`current_role_code()` · `has_perm(module, action)` · `is_lawyer_scoped()` · `can_access_case(case_id)`

---

## 6. خطة التنفيذ المرحلية

| المرحلة | المحتوى | الحالة |
|---|---|---|
| 1 | المعمارية + قاعدة البيانات + المصادقة | قيد التنفيذ |
| 2 | المستخدمون + الأدوار + الصلاحيات | — |
| 3 | العملاء | — |
| 4 | القضايا + الخصوم + المحاكم | — |
| 5 | الجلسات + التقويم + المهام | — |
| 6 | المستندات + الأرشيف | — |
| 7 | الوكالات + العقود | — |
| 8 | الأتعاب + الفواتير + المقبوضات + المصروفات | — |
| 9 | التقارير + لوحة التحكم | — |
| 10 | المراسلات + التنبيهات | — |
| 11 | سجل العمليات + النسخ الاحتياطي + الأمان | — |
| 12 | تجهيز OCR / الذكاء الاصطناعي | — |
| 13 | الاختبار + إصلاح الأخطاء + الأداء | — |

**بوابة الانتقال بين المراحل:** لا تُعتبر مرحلة مكتملة قبل: نجاح `npm run build`، نجاح `tsc --noEmit`، اختبار CRUD كاملًا على بيانات حقيقية في القاعدة، فحص الكونسول، واختبار الصلاحيات بحساب من كل دور.

---

## 7. الهوية البصرية

| اللون | القيمة | الاستخدام |
|---|---|---|
| كحلي داكن | `#0F1E3D` | الشريط الجانبي، العناوين، الأزرار الأساسية |
| ذهبي | `#C9A227` | التمييز، الحالة النشطة، الحدود المميزة |
| أبيض | `#FFFFFF` | خلفية المحتوى |
| رمادي فاتح | `#F4F5F7` | خلفية الصفحة، الفواصل |

الخط: **IBM Plex Sans Arabic** (يدعم الأرقام العربية والوزن الرسمي المطلوب لمستندات قانونية).
الوضع الليلي: نفس الذهبي على قاعدة كحلية أعمق `#0A1428`.
