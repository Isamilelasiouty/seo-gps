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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId, method } = await req.json();
    const { data: project } = await supabase
      .from("projects")
      .select("id, domain, root_url, verification_token")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let verified = false;
    const vToken = project.verification_token;

    if (method === "meta_tag") {
      const resp = await fetch(project.root_url, { redirect: "follow" });
      const html = await resp.text();
      const expected = `name="seo-gps-verification" content="${vToken}"`;
      if (html.includes(expected) || html.includes(`content="${vToken}" name="seo-gps-verification"`)) {
        verified = true;
      }
    } else if (method === "file") {
      const fileUrl = `${project.root_url.replace(/\/$/, "")}/.well-known/seo-gps.txt`;
      const resp = await fetch(fileUrl);
      if (resp.status === 200) {
        const text = await resp.text();
        if (text.trim() === vToken) {
          verified = true;
        }
      }
    }

    if (verified) {
      await supabase
        .from("projects")
        .update({ is_verified: true, verification_method: method })
        .eq("id", projectId);

      return new Response(JSON.stringify({ verified: true, message: "Domain successfully verified!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ verified: false, message: "Verification token not found on site." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
