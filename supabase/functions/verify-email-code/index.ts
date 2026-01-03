import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
}

const sendWelcomeEmail = async (
  resend: Resend, 
  email: string, 
  firstName: string, 
  employeeId: string,
  role: string
) => {
  const roleLabel = role === 'admin' ? 'Administrator' : 'Employee';
  
  try {
    await resend.emails.send({
      from: "HR System <onboarding@resend.dev>",
      to: [email],
      subject: `Welcome! Your ${roleLabel} ID`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Welcome to the Team, ${firstName}!</h1>
          <p>Your account has been successfully created.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; color: #666;">Your Login Credentials</h2>
            <p style="margin: 5px 0;"><strong>Your ${roleLabel} ID:</strong></p>
            <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0;">${employeeId}</p>
            <p style="color: #666; font-size: 14px;">Use this ID along with your password to login.</p>
          </div>
          
          <p style="color: #666;">Please keep this ID safe. You will need it to log in to the system.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply.</p>
        </div>
      `,
    });
    console.log("Welcome email sent successfully to:", email);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyCodeRequest = await req.json();

    console.log("Verifying code for:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log("User already exists, fetching their employee ID");
      
      // Fetch the existing user's employee ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("employee_id")
        .eq("id", existingUser.id)
        .single();
      
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
          alreadyRegistered: true,
          employeeId: profile?.employee_id
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the user account using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: verification.email,
      password: verification.password_hash,
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

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch the generated employee ID from the profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("employee_id")
      .eq("id", authData.user!.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    const employeeId = profile?.employee_id || "Not generated";
    console.log("Employee ID generated:", employeeId);

    // Send welcome email with the employee ID
    if (resend && employeeId !== "Not generated") {
      await sendWelcomeEmail(
        resend,
        verification.email,
        verification.first_name,
        employeeId,
        verification.role
      );
    }

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
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully",
        employeeId: employeeId
      }),
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
