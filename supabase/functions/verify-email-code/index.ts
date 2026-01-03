import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyCodeRequest = await req.json();

    console.log("Verifying code for:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the verification record
    const { data: verification, error: findError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error("Error finding verification:", findError);
      throw new Error("Failed to verify code");
    }

    if (!verification) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired verification code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);

    if (userExists) {
      console.log("User already exists, marking verification as complete");
      
      // Mark verification as complete
      await supabase
        .from("email_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      // Clean up old verifications
      await supabase
        .from("email_verifications")
        .delete()
        .eq("email", email);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "This email is already registered. Please login instead.",
          alreadyRegistered: true 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the user account using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: verification.email,
      password: verification.password_hash, // This is actually the plain password stored temporarily
      email_confirm: true,
      user_metadata: {
        first_name: verification.first_name,
        last_name: verification.last_name,
        phone: verification.phone,
        role: verification.role,
      },
    });

    if (authError) {
      console.error("Error creating user:", authError);
      
      // If user exists error, treat as success
      if (authError.message?.includes("already been registered")) {
        await supabase
          .from("email_verifications")
          .update({ verified: true })
          .eq("id", verification.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Email already registered. Please login.",
            alreadyRegistered: true 
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      throw new Error(authError.message);
    }

    console.log("User created successfully:", authData.user?.id);

    // Mark verification as complete
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    // Clean up old verifications for this email
    await supabase
      .from("email_verifications")
      .delete()
      .eq("email", email)
      .neq("id", verification.id);

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
