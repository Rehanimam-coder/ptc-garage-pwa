"use client";

import { useEffect, type ReactNode } from "react";

const translations: Record<string, string> = {
  "Loading PTC Garage...":"جارٍ تحميل PTC Garage...",
  "OPERATIONS MANAGEMENT":"إدارة العمليات","One garage.":"ورشة واحدة.","Complete control.":"تحكم كامل.",
  "Manage vehicle movements, workshop activity and parts operations from one secure workspace.":"إدارة حركة المركبات وأنشطة الورشة وعمليات قطع الغيار من مساحة عمل آمنة واحدة.",
  "PTC GARAGE MANAGEMENT":"إدارة PTC GARAGE","SECURE WORKSPACE · 2026":"مساحة عمل آمنة · 2026",
  "WELCOME BACK":"مرحباً بعودتك","Sign in to your portal":"سجّل الدخول إلى بوابتك","Use the User ID and password provided by your Admin.":"استخدم معرّف المستخدم وكلمة المرور اللذين قدمهما المسؤول.",
  "USER ID":"معرّف المستخدم","PASSWORD":"كلمة المرور","Enter your password":"أدخل كلمة المرور","Sign in securely":"تسجيل الدخول بأمان","Signing in...":"جارٍ تسجيل الدخول...",
  "Your account is protected by Supabase Authentication":"حسابك محمي بواسطة مصادقة Supabase",
  "Dashboard":"لوحة التحكم","My actions":"إجراءاتي","Home":"الرئيسية","Notifications":"الإشعارات","My profile":"ملفي الشخصي",
  "Vehicle IN":"دخول المركبة","Vehicle OUT":"خروج المركبة","IN History":"سجل الدخول","OUT History":"سجل الخروج","PTC assets":"أصول PTC",
  "Breakdown dashboard":"لوحة الأعطال","Breakdowns and jobs":"الأعطال والأعمال","Preventive maintenance":"الصيانة الوقائية",
  "Parts Order":"طلب قطع الغيار","Parts Orders":"طلبات قطع الغيار","Parts Received":"قطع الغيار المستلمة","Parts Order History":"سجل طلبات قطع الغيار","Parts Received History":"سجل استلام قطع الغيار",
  "General Stores":"المخازن العامة","Parts and purchasing":"قطع الغيار والمشتريات","Tasks and projects":"المهام والمشاريع","Private chat":"المحادثة الخاصة",
  "Report Creation":"إنشاء التقارير","Centralized reports":"التقارير المركزية","Employee directory":"دليل الموظفين","Users":"المستخدمون",
  "Roles and permissions":"الأدوار والصلاحيات","Master data":"البيانات الرئيسية","Site Management":"إدارة المواقع","Audit history":"سجل التدقيق",
  "Settings":"الإعدادات","Historical imports":"استيراد السجلات السابقة","System health":"حالة النظام","Ask PTC data":"اسأل بيانات PTC","Help and user guide":"المساعدة ودليل المستخدم",
  "OVERVIEW":"نظرة عامة","WORKSPACE":"مساحة العمل","VEHICLE MANAGEMENT":"إدارة المركبات","MAINTENANCE":"الصيانة","PARTS AND SERVICES":"قطع الغيار والخدمات","COLLABORATION":"التعاون","INSIGHTS":"التقارير والتحليلات","ADMINISTRATION":"الإدارة","SUPPORT":"الدعم",
  "PARTS MANAGEMENT":"إدارة قطع الغيار","BREAKDOWN MANAGEMENT":"إدارة الأعطال","REPORTS":"التقارير","Sign out":"تسجيل الخروج","System online":"النظام متصل","PTC GARAGE WORKSPACE":"مساحة عمل PTC GARAGE",
  "Refresh":"تحديث","Add new":"إضافة جديد","Update record":"تحديث السجل","Add new record":"إضافة سجل جديد","Fields marked required must be completed.":"يجب إكمال الحقول المحددة كمطلوبة.",
  "Site":"الموقع","Select site":"اختر الموقع","All sites":"جميع المواقع","Search records...":"البحث في السجلات...","records":"السجلات","Loading records...":"جارٍ تحميل السجلات...",
  "Cancel":"إلغاء","Save changes":"حفظ التغييرات","Save record":"حفظ السجل","Saving...":"جارٍ الحفظ...","Edit":"تعديل","Delete":"حذف","Actions":"الإجراءات","Updated":"تم التحديث",
  "No records found. Add a new record to get started.":"لم يتم العثور على سجلات. أضف سجلاً جديداً للبدء.",
  "Historical vehicle visit records":"سجلات زيارات المركبات السابقة","Existing records from the original Vehicle IN / OUT workflow are preserved here.":"يتم الاحتفاظ بالسجلات الموجودة من سير عمل دخول وخروج المركبات الأصلي هنا.",
  "No historical records found for this category.":"لا توجد سجلات سابقة لهذه الفئة.",
  "Access is enforced by Supabase Row Level Security. Supervisors are limited to their assigned site; Store Keeper access is restricted to parts and stores modules.":"يتم فرض صلاحيات الوصول بواسطة أمان الصفوف في Supabase. يقتصر المشرفون على مواقعهم المخصصة، ويقتصر وصول أمين المخزن على وحدات قطع الغيار والمخازن.",
  "Send a direct message to one team member, or leave recipient as Team broadcast.":"أرسل رسالة مباشرة إلى أحد أعضاء الفريق، أو اترك المستلم كرسالة جماعية للفريق.",
  "Team broadcast":"رسالة جماعية للفريق","Write a team message...":"اكتب رسالة للفريق...","Send message":"إرسال الرسالة","No messages yet.":"لا توجد رسائل حتى الآن.",
  "Your account notifications and updates.":"إشعارات حسابك وتحديثاته.","Time":"الوقت","Notification":"الإشعار","Message":"الرسالة","Status":"الحالة","Read":"مقروء","Unread":"غير مقروء","Mark read":"تحديد كمقروء","No notifications yet.":"لا توجد إشعارات حتى الآن.",
  "Your current sign-in and access information.":"معلومات تسجيل الدخول والوصول الحالية الخاصة بك.","FULL NAME":"الاسم الكامل","ROLE":"الدور","ASSIGNED SITE":"الموقع المخصص",
  "Workspace home":"الصفحة الرئيسية لمساحة العمل","Shortcuts to the main garage workflows.":"اختصارات إلى مهام الورشة الرئيسية.","Tasks and records that need your attention.":"المهام والسجلات التي تتطلب اهتمامك.",
  "Use the sidebar to open a module. Assigned-site and role permissions remain active.":"استخدم الشريط الجانبي لفتح وحدة. تظل صلاحيات الموقع والدور المخصصين سارية.",
  "Core role boundaries are protected at database level.":"تتم حماية حدود الأدوار الأساسية على مستوى قاعدة البيانات.",
  "Role":"الدور","Access":"الوصول","Site scope":"نطاق الموقع","Security":"الأمان","Admin":"المسؤول","Supervisor":"المشرف","Store Keeper":"أمين المخزن",
  "All modules and administration":"جميع الوحدات والإدارة","Assigned site only":"الموقع المخصص فقط","Full access":"وصول كامل","RLS enforced":"يتم فرض أمان الصفوف",
  "Changing core role access requires a reviewed database policy migration. This prevents an Admin from accidentally granting vehicle data access to a Store Keeper.":"يتطلب تغيير صلاحيات الأدوار الأساسية مراجعة وترحيل سياسات قاعدة البيانات. وهذا يمنع منح أمين المخزن صلاحية الوصول إلى بيانات المركبات عن طريق الخطأ.",
  "Workspace branding and general preferences.":"علامة مساحة العمل التجارية والتفضيلات العامة.","Application name":"اسم التطبيق","Primary colour":"اللون الأساسي","Language":"اللغة","Arabic":"العربية","Save settings":"حفظ الإعدادات","Settings saved successfully.":"تم حفظ الإعدادات بنجاح.",
  "Recent recorded changes made through the application.":"أحدث التغييرات المسجلة عبر التطبيق.","Date":"التاريخ","User":"المستخدم","Action":"الإجراء","Module":"الوحدة","Record ID":"معرّف السجل","Details":"التفاصيل",
  "Live database connectivity and key table checks.":"اتصال قاعدة البيانات المباشر وفحوصات الجداول الرئيسية.","Component":"المكوّن","Connected":"متصل","Error":"خطأ","Query successful":"تم الاستعلام بنجاح",
  "Maintain reusable dropdown values and classifications.":"إدارة قيم القوائم المنسدلة والتصنيفات القابلة لإعادة الاستخدام.","Category":"الفئة","Code":"الرمز","Label":"التسمية","Active":"نشط","Inactive":"غير نشط","Add value":"إضافة قيمة",
  "Import older asset, stores or maintenance records without replacing existing data.":"استيراد سجلات الأصول أو المخازن أو الصيانة السابقة دون استبدال البيانات الحالية.",
  "Paste JSON array":"الصق مصفوفة JSON","Validate and import":"التحقق والاستيراد","Historical records imported successfully.":"تم استيراد السجلات السابقة بنجاح.",
  "Search across garage records using a plain keyword or PTC ID.":"ابحث في سجلات الورشة باستخدام كلمة مفتاحية أو معرّف PTC.",
  "Search PTC ID, part, complaint, task...":"ابحث عن معرّف PTC أو قطعة أو شكوى أو مهمة...","Search records":"بحث في السجلات","Source":"المصدر","Record":"السجل",
  "Live record totals across available operational modules.":"إجمالي السجلات المباشر عبر الوحدات التشغيلية المتاحة.",
  "Counts reflect the signed-in role's permitted data. For date-range vehicle exports, use Report Creation.":"تعكس الأعداد البيانات المسموح بها للدور المسجل. لتصدير المركبات حسب نطاق التاريخ، استخدم إنشاء التقارير.",
  "Create a new parts request with multiple part lines.":"أنشئ طلب قطع غيار جديداً يتضمن عدة أصناف.","Review and update parts request records.":"راجع سجلات طلبات قطع الغيار وحدّثها.",
  "Create parts request":"إنشاء طلب قطع غيار","Each part is stored as a separate order under the same vehicle visit.":"يتم حفظ كل قطعة كطلب منفصل ضمن زيارة المركبة نفسها.",
  "Select vehicle currently in garage":"اختر المركبة الموجودة حالياً في الورشة","General parts request (not linked to a vehicle)":"طلب قطع غيار عام (غير مرتبط بمركبة)","Vehicle IN details":"تفاصيل دخول المركبة","Currently IN":"موجودة حالياً",
  "Parts list":"قائمة قطع الغيار","Add part":"إضافة قطعة","Remove":"إزالة","Part name":"اسم القطعة","Part number":"رقم القطعة","Quantity":"الكمية","Unit":"الوحدة","Priority":"الأولوية","Remarks":"ملاحظات",
  "Normal":"عادي","Urgent":"عاجل","High":"مرتفع","Submit parts request":"إرسال طلب قطع الغيار","Submitting...":"جارٍ الإرسال...","All parts requests":"جميع طلبات قطع الغيار","Parts order history":"سجل طلبات قطع الغيار",
  "All":"الكل","Part received":"تم استلام جزء","Purchased":"تم الشراء","Completed":"مكتمل","Ordered":"تم الطلب","Vehicle":"المركبة","Part":"القطعة","Request":"الطلب","Invoice / Cost":"الفاتورة / التكلفة","Store update":"تحديث المخزن",
  "Request No.":"رقم الطلب","Request Date":"تاريخ الطلب","Invoice No.":"رقم الفاتورة","Invoice Date":"تاريخ الفاتورة","Cost":"التكلفة","Currency":"العملة","Save details":"حفظ التفاصيل",
  "PTC ID":"معرّف PTC","Vehicle Type":"نوع المركبة","Purpose":"الغرض","Garage IN":"دخول الورشة","Complaint / Problem":"الشكوى / المشكلة","Work Description":"وصف العمل","IN Remarks":"ملاحظات الدخول",
  "Purchasing updates are handled in Parts Order History to keep request, invoice and receipt records linked.":"تتم معالجة تحديثات المشتريات في سجل طلبات قطع الغيار للحفاظ على ارتباط الطلبات والفواتير والاستلامات.",
  "Open Parts Order History to enter Request Number, Request Date, Invoice Number, Invoice Date and Cost. Store Keeper can see all sites; vehicle details remain hidden from Store Keeper.":"افتح سجل طلبات قطع الغيار لإدخال رقم الطلب وتاريخه ورقم الفاتورة وتاريخها والتكلفة. يمكن لأمين المخزن رؤية جميع المواقع؛ وتظل تفاصيل المركبات مخفية عنه.",
  "Quick instructions for the PTC Garage workspace.":"تعليمات سريعة لمساحة عمل PTC Garage.","Vehicle IN / OUT":"دخول المركبة / خروجها",
  "Register a vehicle at the assigned garage, record the complaint and purpose, then use Vehicle OUT to record work details and release time.":"سجّل المركبة في الورشة المخصصة، وسجّل الشكوى والغرض، ثم استخدم خروج المركبة لتسجيل تفاصيل العمل ووقت المغادرة.",
  "Parts workflow":"سير عمل قطع الغيار","Supervisors raise parts requests. Store Keeper enters request and invoice details. Garage staff confirms physical receipt.":"يقوم المشرفون بإنشاء طلبات قطع الغيار. ويدخل أمين المخزن تفاصيل الطلب والفاتورة. ويؤكد موظفو الورشة الاستلام الفعلي.",
  "Maintenance":"الصيانة","Create preventive maintenance schedules and update status, meter values and due dates as work progresses.":"أنشئ جداول الصيانة الوقائية وحدّث الحالة وقراءات العداد وتواريخ الاستحقاق أثناء تقدم العمل.",
  "Access control":"التحكم في الوصول","Admin manages all sites. Supervisors work within assigned sites. Store Keeper has parts-only access across sites.":"يدير المسؤول جميع المواقع. ويعمل المشرفون ضمن المواقع المخصصة لهم. ولدى أمين المخزن صلاحية الوصول إلى قطع الغيار فقط عبر جميع المواقع.",
  "Module unavailable":"الوحدة غير متاحة","This module is not available for the current role.":"هذه الوحدة غير متاحة للدور الحالي.","You do not have permission to access this module.":"ليس لديك إذن للوصول إلى هذه الوحدة.",
  "PTC GARAGE":"PTC GARAGE","Open breakdowns":"الأعطال المفتوحة","Critical jobs":"الأعمال الحرجة","Overdue jobs":"الأعمال المتأخرة","Completed today":"المكتملة اليوم","Completion rate":"معدل الإنجاز","Needs attention":"تحتاج إلى اهتمام",
  "Overdue preventive maintenance":"الصيانة الوقائية المتأخرة","Overdue tasks":"المهام المتأخرة","Maintenance at a glance":"ملخص الصيانة","Maintenance picture":"نظرة عامة على الصيانة","Your work and business at a glance.":"ملخص عملك وأعمال الشركة.",
  "From date":"من تاريخ","To date":"إلى تاريخ","Apply dates":"تطبيق التواريخ","Open reports":"فتح التقارير","Results include only records allowed by your role and assigned sites.":"تتضمن النتائج السجلات المسموح بها حسب دورك ومواقعك المخصصة.",
  "Create":"إنشاء","Update":"تحديث","Search":"بحث","Export":"تصدير","Download":"تنزيل","Print":"طباعة","Filter":"تصفية","Clear":"مسح","Select":"اختر","No data available":"لا توجد بيانات","No results found":"لم يتم العثور على نتائج",
  "Breakdowns":"الأعطال","Open":"مفتوح","In Progress":"قيد التنفيذ","Waiting for Parts":"بانتظار قطع الغيار","Cancelled":"ملغى","Days":"أيام","Kilometres":"كيلومترات","Operating Hours":"ساعات التشغيل",
  "Problem / complaint":"المشكلة / الشكوى","Job status":"حالة العمل","Work started":"بدء العمل","Completed date":"تاريخ الإكمال","Responsible person":"الشخص المسؤول","Repeat by":"التكرار حسب","Repeat interval":"فترة التكرار",
  "Last completed meter value":"آخر قراءة عداد عند الإكمال","Current meter value":"قراءة العداد الحالية","Expected due date":"تاريخ الاستحقاق المتوقع","Asset name":"اسم الأصل","Asset type":"نوع الأصل","Serial number":"الرقم التسلسلي","Make / model":"الشركة المصنعة / الطراز",
  "Item code":"رمز الصنف","Item name":"اسم الصنف","Quantity on hand":"الكمية المتوفرة","Reorder level":"حد إعادة الطلب","Task / project title":"عنوان المهمة / المشروع","Description":"الوصف","Assigned to (User ID / name)":"مخصص إلى (معرّف المستخدم / الاسم)","Due date":"تاريخ الاستحقاق",
  "Could not load records: ":"تعذر تحميل السجلات: ","Could not save: ":"تعذر الحفظ: ","Record updated successfully.":"تم تحديث السجل بنجاح.","Record added successfully.":"تمت إضافة السجل بنجاح."
};

const reverseTranslations = Object.entries(translations).reduce<Record<string, string>>((result, [english, arabic]) => {
  if (!(arabic in result)) result[arabic] = english;
  return result;
}, {});

function translateText(value: string, language: "en" | "ar") {
  const trimmed = value.trim();
  const dictionary = language === "ar" ? translations : reverseTranslations;
  const translated = dictionary[trimmed];
  return translated ? value.replace(trimmed, translated) : value;
}

export default function ArabicTranslator({ children, language }: { children: ReactNode; language: "en" | "ar" }) {
  useEffect(() => {
    const root = document.querySelector(".appShell") || document.querySelector(".loginShell");
    if (!root) return;

    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const next = translateText(node.textContent, language);
        if (next !== node.textContent) node.textContent = next;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as HTMLElement;
      for (const attribute of ["placeholder", "title", "aria-label"]) {
        const value = element.getAttribute(attribute);
        if (value) {
          const next = translateText(value, language);
          if (next !== value) element.setAttribute(attribute, next);
        }
      }
      for (const child of Array.from(node.childNodes)) translateNode(child);
    };

    translateNode(root);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "childList") record.addedNodes.forEach(translateNode);
        else if (record.type === "characterData" && record.target.textContent) {
          const next = translateText(record.target.textContent, language);
          if (next !== record.target.textContent) record.target.textContent = next;
        }
        else if (record.type === "attributes" && record.target instanceof HTMLElement) {
          const element = record.target;
          const attribute = record.attributeName;
          if (attribute) {
            const value = element.getAttribute(attribute);
            if (value) {
              const next = translateText(value, language);
              if (next !== value) element.setAttribute(attribute, next);
            }
          }
        }
      }
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
    return () => observer.disconnect();
  }, [language]);

  return <>{children}</>;
}
