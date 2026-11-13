import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function renderLayout(title: string, bodyHtml: string) {
  return `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #ECE8DC; border-radius: 12px; overflow: hidden;">
      <div style="background: #FFFFFF; padding: 22px; text-align: center; border-bottom: 2px solid #E9D9A8;">
        <img src="https://isamilelasiouty.github.io/seo-gps/brand/logo.png" alt="SEO GPS" style="height: 38px; width: auto; display: block; margin: 0 auto;" />
      </div>
      <div style="padding: 28px; direction: rtl; text-align: right; color: #16140F; background: #FFFFFF;">
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: bold; color: #16140F;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="background: #F9F8F5; padding: 18px 24px; text-align: center; border-top: 1px solid #ECE8DC; font-size: 12px; color: #7A7462;">
        <p style="margin: 0 0 4px; font-weight: bold;">SEO GPS - منصة التحليل والمراقبة الذكية</p>
        <p style="margin: 0;">بإشراف إسماعيل الأسيوطي | <a href="https://isamilelasiouty.github.io/seo-gps" style="color: #B8892B; text-decoration: none;">زيارة المنصة</a></p>
      </div>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      type = "audit_report",
      recipient,
      userName = "",
      userEmail = "",
      domain = "",
      rootUrl = "",
      healthScore = 100,
      pagesCount = 0,
      criticalCount = 0,
      warningCount = 0,
      noticeCount = 0,
      cannibalizationCount = 0,
    } = body;

    // -------------------------------------------------------------------------
    // Mode: Live Issue Re-Check & Fix Verification Probe
    // -------------------------------------------------------------------------
    if (type === "verify_issue") {
      let targetUrl = (body.url || "").trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl.replace(/^\/+/, "");
      }
      const checkId = (body.checkId || "").toLowerCase();
      const isAr = (body.locale || body.lang || "ar") !== "en";

      try {
        const probeRes = await fetch(targetUrl, {
          headers: {
            "User-Agent": "SEOGPS-Bot/1.0 (+https://isamilelasiouty.github.io/seo-gps; verification)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });

        const status = probeRes.status;
        const htmlText = await probeRes.text();
        let verified = false;
        let reason = "";

        if (checkId.includes("404") || checkId.includes("broken") || checkId.includes("status")) {
          if (status >= 200 && status < 400) {
            const isSoft404 =
              htmlText.includes("404") &&
              (htmlText.includes("not found") ||
                htmlText.includes("غير موجودة") ||
                htmlText.includes("الصفحة غير متوفرة") ||
                htmlText.includes("Page Not Found"));
            if (isSoft404) {
              verified = false;
              reason = isAr
                ? "لم يتم حل المشكلة: ما زالت الصفحة تعرض رسالة 404 (الصفحة غير موجودة) للمستخدمين"
                : "Issue not resolved: The page is still displaying a 404 Not Found error message to visitors";
            } else {
              verified = true;
              reason = isAr
                ? `تم فحص الرابط بنجاح: كود الاستجابة الحالي هو ${status} OK (تم إصلاح الخطأ 404)`
                : `URL probed successfully: Current status code is ${status} OK (404 error resolved)`;
            }
          } else {
            verified = false;
            reason = isAr
              ? `لم يتم حل المشكلة: ما زال الرابط يرجع كود خطأ (${status})`
              : `Issue not resolved: The URL still returns an error status code (${status})`;
          }
        } else if (checkId.includes("title")) {
          const titleMatch = htmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const titleVal = titleMatch ? titleMatch[1].trim() : "";
          if (titleVal.length > 3) {
            verified = true;
            reason = isAr
              ? `تم اكتشاف عنوان الصفحة بنجاح: "${titleVal.slice(0, 35)}..."`
              : `Page title detected successfully: "${titleVal.slice(0, 35)}..."`;
          } else {
            verified = false;
            reason = isAr
              ? "لم يتم حل المشكلة: ما زال عنوان الصفحة (Title) مفقوداً أو فارغاً في الكود المصدري"
              : "Issue not resolved: Page title tag is still missing or empty in source code";
          }
        } else if (checkId.includes("desc")) {
          const descMatch = htmlText.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
          const descVal = descMatch ? descMatch[1].trim() : "";
          if (descVal.length > 5) {
            verified = true;
            reason = isAr
              ? "تم التحقق من وجود الوصف التعريفي (Meta Description) بنجاح"
              : "Meta description tag verified successfully in HTML header";
          } else {
            verified = false;
            reason = isAr
              ? "لم يتم حل المشكلة: ما زال الوصف التعريفي مفقوداً في الصفحة"
              : "Issue not resolved: Meta description tag is still missing on the page";
          }
        } else if (checkId.includes("h1")) {
          const h1Match = htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const h1Val = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : "";
          if (h1Val.length > 0) {
            verified = true;
            reason = isAr
              ? "تم التحقق من وجود وسم العنوان الرئيسي (H1)"
              : "Primary H1 heading tag verified successfully";
          } else {
            verified = false;
            reason = isAr
              ? "لم يتم حل المشكلة: ما زال وسم H1 مفقوداً في الصفحة"
              : "Issue not resolved: Primary H1 heading tag is still missing on the page";
          }
        } else if (checkId.includes("schema")) {
          const hasSchema = htmlText.includes("application/ld+json");
          if (hasSchema) {
            verified = true;
            reason = isAr
              ? "تم التحقق من وجود بيانات Schema المنظمة داخل الصفحة"
              : "Structured Schema data (JSON-LD) verified successfully";
          } else {
            verified = false;
            reason = isAr
              ? "لم يتم حل المشكلة: لم يتم العثور على كود Schema صالح في الصفحة"
              : "Issue not resolved: No valid Schema structured data found on the page";
          }
        } else {
          if (status >= 200 && status < 400) {
            verified = true;
            reason = isAr
              ? `الرابط يعمل بنجاح ويستجيب بكود ${status} OK`
              : `URL is working properly and responding with status ${status} OK`;
          } else {
            verified = false;
            reason = isAr
              ? `لم يتم حل المشكلة: الرابط ما زال يرجع كود ${status}`
              : `Issue not resolved: The target URL is still returning status code ${status}`;
          }
        }

        return new Response(
          JSON.stringify({ success: true, verified, status, reason, url: targetUrl }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ success: false, verified: false, reason: `تعذر الوصول للرابط: ${err.message || 'خطأ في الاتصال'}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailFrom = Deno.env.get("EMAIL_FROM") || "SEO GPS <onboarding@resend.dev>";
    const ownerEmail = "ismailelasiouty3@gmail.com";
    let targetRecipient = recipient || userEmail || ownerEmail;
    let subject = "";
    let contentHtml = "";

    if (type === "signup_notification") {
      targetRecipient = ownerEmail;
      subject = `[SEO GPS] مستخدم جديد سجل في المنصة: ${userName || userEmail}`;
      contentHtml = renderLayout(
        "مستخدم جديد انضم للمنصة",
        `<table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #ECE8DC;">الاسم:</td><td style="padding: 10px; border-bottom: 1px solid #ECE8DC;">${userName || "غير محدد"}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #ECE8DC;">البريد:</td><td style="padding: 10px; border-bottom: 1px solid #ECE8DC;">${userEmail}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">التاريخ:</td><td style="padding: 10px;">${new Date().toLocaleString()}</td></tr>
        </table>`
      );
    } else if (type === "lead_registration") {
      targetRecipient = ownerEmail;
      subject = `[SEO GPS] مشترك جديد طلب تقرير الموقع: ${userName || userEmail}`;
      contentHtml = renderLayout(
        "مشترك جديد يطلب متابعة موقعه",
        `<table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #ECE8DC;">الاسم:</td><td style="padding: 10px; border-bottom: 1px solid #ECE8DC;">${userName || "غير محدد"}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #ECE8DC;">البريد:</td><td style="padding: 10px; border-bottom: 1px solid #ECE8DC;">${userEmail}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #ECE8DC;">الموقع:</td><td style="padding: 10px; border-bottom: 1px solid #ECE8DC;">${domain}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">التاريخ:</td><td style="padding: 10px;">${new Date().toLocaleString()}</td></tr>
        </table>`
      );
    } else if (type === "broadcast_announcement") {
      const greeting = userName ? `أهلاً بك أستاذ ${userName}،` : "أهلاً بك،";
      subject = body.customSubject || "[SEO GPS] تحديث جديد في المنصة: واجهة مطورة وتتبع تراجعات فوري";
      contentHtml = renderLayout(
        `${greeting} تم إطلاق تحديث جديد في منصة SEO GPS`,
        `<p style="font-size: 14px; line-height: 1.7; color: #3A352A; margin: 0 0 16px;">
          نعمل باستمرار على تطوير المنصة لتقديم أدق تحليل استباقي ومراقبة لحظية لحماية ترتيب موقعك في نتائج البحث. يسعدنا مشاركتك أبرز ميزات التحديث الجديد المتاح الآن:
        </p>
        <div style="background: #FAF8F5; border: 1px solid #EBE4D5; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.8;">
          <p style="margin: 0 0 8px;"><b>واجهة مستخدم مطورة ومريحة للعين:</b> تصميم عصري وسريع الاستجابة يتيح لك فحص وتحليل كافة مؤشرات الموقع بسلاسة تامة.</p>
          <p style="margin: 0 0 8px;"><b>فحص فوري شامل للروابط والمحتوى:</b> استخراج كافة روابط خريطة الموقع، كشف الروابط المعطلة (404)، وتحويلات (301) داخل نصوص المقالات.</p>
          <p style="margin: 0 0 8px;"><b>فاحص البيانات المنظمة (Schema Markup):</b> تحليل نوعي لكل Schema مع عرض الكود البرمجي المكتشف (JSON-LD) وحلول معالجة الأخطاء.</p>
          <p style="margin: 0 0 8px;"><b>كشف تنافس الكلمات (Cannibalization):</b> تحديد المقالات التي تتنافس على نفس الكلمة المفتاحية وتقديم خطة عملية لتصدير المقال الأقوى.</p>
          <p style="margin: 0;"><b>تصدير فوري للتقارير:</b> إمكانية تحميل التقرير الكامل بصيغتي PDF للطباعة أو ملف HTML مستقل يعمل بدون إنترنت.</p>
        </div>
        <div style="text-align: center; margin: 24px 0 12px;">
          <a href="https://isamilelasiouty.github.io/seo-gps/#/site-report" style="display: inline-block; background: #B8892B; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px;">
            تجربة المنصة الآن
          </a>
        </div>`
      );
    } else {
      subject = `[SEO GPS] تقرير فحص الموقع الشامل: ${domain || rootUrl}`;
      const reportUrl = `https://isamilelasiouty.github.io/seo-gps/#/site-report?domain=${encodeURIComponent(domain)}`;
      contentHtml = renderLayout(
        `تقرير الفحص الفني الشامل لموقع: ${domain}`,
        `<div style="background: #FAF8F5; border: 1px solid #EBE4D5; border-radius: 8px; padding: 18px; margin: 16px 0; text-align: center;">
          <div style="font-size: 13px; color: #7A7462; margin-bottom: 4px;">معدل الصحة العامة (Health Score)</div>
          <div style="font-size: 38px; font-weight: 800; color: #15803D;">${healthScore}<span style="font-size: 16px; color: #7A7462;">/100</span></div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #ECE8DC;">الصفحات المفحوصة:</td><td style="padding: 8px; border-bottom: 1px solid #ECE8DC; font-weight: bold;">${pagesCount}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ECE8DC;">مشاكل حرجة (Critical):</td><td style="padding: 8px; border-bottom: 1px solid #ECE8DC; font-weight: bold; color: #DC2626;">${criticalCount}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ECE8DC;">تحذيرات (Warnings):</td><td style="padding: 8px; border-bottom: 1px solid #ECE8DC; font-weight: bold; color: #D97706;">${warningCount}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ECE8DC;">ملاحظات (Notices):</td><td style="padding: 8px; border-bottom: 1px solid #ECE8DC; font-weight: bold; color: #2563EB;">${noticeCount}</td></tr>
          <tr><td style="padding: 8px;">تنافس الكلمات (Cannibalization):</td><td style="padding: 8px; font-weight: bold; color: #7C3AED;">${cannibalizationCount}</td></tr>
        </table>
        <div style="text-align: center; margin: 24px 0 12px;">
          <a href="${reportUrl}" style="display: inline-block; background: #B8892B; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px;">
            عرض التقرير التفاعلي بالكامل
          </a>
        </div>`
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [targetRecipient],
        subject,
        html: contentHtml,
      }),
    });

    const resendData = await resendRes.json();
    let isSandboxRestriction = false;

    if (!resendRes.ok) {
      const errMsg = resendData?.message || JSON.stringify(resendData);
      if (resendRes.status === 403 || errMsg.includes("resend.com/domains") || errMsg.includes("testing emails")) {
        isSandboxRestriction = true;
        if (targetRecipient.toLowerCase() !== ownerEmail.toLowerCase()) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [ownerEmail],
              subject: `[نسخة إسماعيل - طلب عميل] ${userName || targetRecipient} - ${subject}`,
              html: contentHtml,
            }),
          });
        }
      }
    }

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("email_logs").insert({
          recipient: targetRecipient,
          subject,
          status: resendRes.ok || isSandboxRestriction ? "sent" : "failed",
          deltas_count: criticalCount + warningCount,
        });
      }
    } catch (_) {}

    return new Response(
      JSON.stringify({
        success: resendRes.ok || isSandboxRestriction,
        isSandboxRestriction,
        recipient: targetRecipient,
        id: resendData?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
