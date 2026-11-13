import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      type = "audit_report",
      recipient,
      userName,
      userEmail,
      domain,
      rootUrl,
      healthScore = 100,
      pagesCount = 0,
      criticalCount = 0,
      warningCount = 0,
      noticeCount = 0,
      cannibalizationCount = 0,
      issuesSummary = [],
    } = body;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY is not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailFrom = Deno.env.get("EMAIL_FROM") || "SEO GPS <onboarding@resend.dev>";
    const ownerEmail = "ismailelasiouty3@gmail.com";
    let targetRecipient = recipient;
    let subject = "";
    let emailHtml = "";

    // -------------------------------------------------------------------------
    // Mode A: Signup Notification to Ismail El Asiouty
    // -------------------------------------------------------------------------
    if (type === "signup_notification") {
      targetRecipient = ownerEmail;
      subject = `[SEO GPS] مستخدم جديد سجل في المنصة: ${userName || userEmail}`;
      const timestamp = new Date().toLocaleString();
      emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #16140F; background: #FAFAF7;">
          <h2 style="color: #B8892B; margin-bottom: 12px;">مستخدم جديد سجل في SEO GPS 🎉</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: #FFFFFF; border: 1px solid #E5E5DE; border-radius: 8px;">
            <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #E5E5DE;">اسم المستخدم:</td><td style="padding: 10px; border-bottom: 1px solid #E5E5DE;">${userName || "غير محدد"}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #E5E5DE;">البريد الإلكتروني:</td><td style="padding: 10px; border-bottom: 1px solid #E5E5DE;">${userEmail}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold;">وقت التسجيل:</td><td style="padding: 10px;">${timestamp}</td></tr>
          </table>
          <p style="margin-top: 20px; font-size: 13px; color: #6B665A;">SEO GPS by Ismail El Asiouty</p>
        </div>
      `;
    }
    // -------------------------------------------------------------------------
    // Mode B: Lead / Subscriber Registration Notification
    // -------------------------------------------------------------------------
    else if (type === "lead_registration") {
      targetRecipient = ownerEmail;
      subject = `[SEO GPS] مشترك جديد طلب استلام تقارير الموقع: ${userName || userEmail}`;
      const timestamp = new Date().toLocaleString();
      emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #16140F; background: #FAFAF7;">
          <h2 style="color: #B8892B; margin-bottom: 12px;">مشترك / عميل محتمل جديد في SEO GPS 📈</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: #FFFFFF; border: 1px solid #E5E5DE; border-radius: 8px;">
            <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #E5E5DE;">الاسم:</td><td style="padding: 10px; border-bottom: 1px solid #E5E5DE;">${userName || "غير محدد"}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #E5E5DE;">البريد الإلكتروني:</td><td style="padding: 10px; border-bottom: 1px solid #E5E5DE;">${userEmail}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #E5E5DE;">الموقع المراد مراقبته:</td><td style="padding: 10px; border-bottom: 1px solid #E5E5DE;">${domain || "غير محدد"}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold;">تاريخ الطلب:</td><td style="padding: 10px;">${timestamp}</td></tr>
          </table>
          <p style="margin-top: 20px; font-size: 13px; color: #6B665A;">SEO GPS by Ismail El Asiouty</p>
        </div>
      `;
    }
    // -------------------------------------------------------------------------
    // Mode C: Full Technical Audit Report
    // -------------------------------------------------------------------------
    else {
      if (!recipient) {
        return new Response(
          JSON.stringify({ success: false, error: "Recipient email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      subject = `[SEO GPS] تقرير الفحص التقني الشامل: ${domain} (درجة الصحة: ${healthScore}/100)`;
      const issuesHtml = (issuesSummary || [])
        .map(
          (iss: any) => `
          <tr style="border-bottom: 1px solid #E5E5DE;">
            <td style="padding: 10px; font-weight: bold; color: ${
              iss.severity === "critical" ? "#D92D20" : iss.severity === "warning" ? "#DC6803" : "#475467"
            };">${(iss.severity || "INFO").toUpperCase()}</td>
            <td style="padding: 10px; color: #16140F;">${iss.title}</td>
            <td style="padding: 10px; font-family: monospace; font-size: 12px; color: #667085;">${iss.url || ""}</td>
          </tr>`
        )
        .join("");

      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5DE; border-radius: 12px; overflow: hidden;">
          <div style="background: #16140F; padding: 24px; text-align: center; color: #FFFFFF;">
            <h1 style="color: #B8892B; margin: 0; font-size: 24px; font-weight: 800;">SEO GPS</h1>
            <p style="color: #98A2B3; margin: 6px 0 0; font-size: 14px;">Instant Full-Site Technical Audit & Regression Report</p>
          </div>

          <div style="padding: 24px;">
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 18px; color: #16140F; margin: 0 0 4px;">نتائج فحص الموقع: <span style="color: #B8892B;">${domain}</span></h2>
              <p style="color: #667085; font-size: 13px; margin: 0;">الرابط المفحوص: <a href="${rootUrl}" style="color: #B8892B;">${rootUrl}</a></p>
              ${userName ? `<p style="color: #667085; font-size: 12px; margin: 4px 0 0;">المستلم / صاحب الطلب: <strong>${userName}</strong> (${recipient})</p>` : ""}
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 24px; background: #FAFAF7; padding: 16px; border-radius: 8px; border: 1px solid #E5E5DE;">
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 26px; font-weight: 900; color: #B8892B;">${healthScore}/100</div>
                <div style="font-size: 11px; font-weight: bold; color: #667085; text-transform: uppercase;">درجة الصحة</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 26px; font-weight: 900; color: #16140F;">${pagesCount}</div>
                <div style="font-size: 11px; font-weight: bold; color: #667085; text-transform: uppercase;">الصفحات</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 26px; font-weight: 900; color: #D92D20;">${criticalCount}</div>
                <div style="font-size: 11px; font-weight: bold; color: #667085; text-transform: uppercase;">أخطاء حرجة</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 26px; font-weight: 900; color: #DC6803;">${cannibalizationCount}</div>
                <div style="font-size: 11px; font-weight: bold; color: #667085; text-transform: uppercase;">تكرار محتوى</div>
              </div>
            </div>

            ${
              issuesSummary.length > 0
                ? `
              <h3 style="font-size: 14px; font-weight: bold; color: #16140F; margin: 0 0 10px;">أبرز الملاحظات المرصودة:</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #FAFAF7; text-align: right; border-bottom: 2px solid #E5E5DE; color: #475467;">
                    <th style="padding: 8px 10px;">المستوى</th>
                    <th style="padding: 8px 10px;">المشكلة</th>
                    <th style="padding: 8px 10px;">الرابط</th>
                  </tr>
                </thead>
                <tbody>${issuesHtml}</tbody>
              </table>
            `
                : `<p style="color: #067647; font-weight: bold;">تهانينا! موقعك بحالة ممتازة ولم يتم رصد أي مشاكل تقنية حرجة.</p>`
            }

            <div style="text-align: center; margin: 24px 0 16px;">
              <a href="https://isamilelasiouty.github.io/seo-gps/#/site-report" style="display: inline-block; background: #B8892B; color: #FFFFFF; padding: 13px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">عرض التقرير التفاعلي الكامل في المنصة &rarr;</a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E5DE; text-align: center; font-size: 12px; color: #98A2B3;">
              <p style="margin: 0;">تم إنشاء التقرير آلياً بواسطة منصة <strong>SEO GPS</strong> &bull; بإشراف إسماعيل الأسيوطي</p>
              <p style="margin: 4px 0 0;"><a href="https://isamilelasiouty.github.io/seo-gps/#/site-report" style="color: #B8892B; text-decoration: none;">الدخول إلى لوحة التحكم SEO GPS</a></p>
            </div>
          </div>
        </div>
      `;
    }

    // 1. Attempt sending to targetRecipient via Resend
    let resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [targetRecipient],
        subject,
        html: emailHtml,
      }),
    });

    let resendData = await resendRes.json();
    let isSandboxRestriction =
      !resendRes.ok &&
      (resendRes.status === 403 ||
        (typeof resendData?.message === "string" && resendData.message.includes("resend.com/domains")));

    // 2. If sandbox restricted and target is not owner, dispatch copy to owner immediately
    if (isSandboxRestriction && targetRecipient.toLowerCase() !== ownerEmail.toLowerCase()) {
      console.log(`[Resend Sandbox] Forwarding client report to owner (${ownerEmail}) for: ${targetRecipient}`);
      const ownerAlertHtml = `
        <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-family: Arial, sans-serif;">
          <p style="margin: 0; color: #B45309; font-weight: bold; font-size: 14px;">
            🔔 طلب تقرير عميل جديد في SEO GPS:
          </p>
          <p style="margin: 6px 0 0; color: #92400E; font-size: 13px;">
            طلب العميل <strong>${userName || "غير محدد"}</strong> (${targetRecipient}) فحص الموقع <strong>${domain}</strong>.
            <br>
            <span style="font-size: 12px; color: #B45309;">(نظراً لأن الدومين في Resend ما زال تجريبياً onboarding@resend.dev، تم إرسال هذه النسخة إلى بريدك مباشرة لضمان عدم ضياع أي عميل).</span>
          </p>
        </div>
        ${emailHtml}
      `;

      try {
        const ownerRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [ownerEmail],
            subject: `[SEO GPS - طلب تقرير عميل] ${userName || targetRecipient} - موقع: ${domain}`,
            html: ownerAlertHtml,
          }),
        });
        if (ownerRes.ok) {
          const ownerData = await ownerRes.json();
          resendData = { id: ownerData.id, forwardedToOwner: true };
        }
      } catch (forwardErr) {
        console.warn("Could not forward to owner:", forwardErr);
      }
    }

    // 3. Log lead to Supabase email_logs
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("email_logs").insert({
          recipient: targetRecipient,
          subject: `[Lead: ${userName || targetRecipient}] ${subject}`,
          status: "sent",
          deltas_count: criticalCount + warningCount,
        });
      }
    } catch (e) {
      console.warn("Could not insert email_log:", e);
    }

    // 4. Return clean, friendly response (never crash or return raw 403 to frontend)
    return new Response(
      JSON.stringify({
        success: true,
        isSandboxRestriction,
        recipient: targetRecipient,
        id: resendData?.id || `req-${Date.now()}`,
        message: isSandboxRestriction
          ? "Client lead captured and notified to owner. Domain verification recommended on resend.com/domains."
          : "Email delivered successfully.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
