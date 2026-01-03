import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  firstName: string;
  verificationCode: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, verificationCode }: VerificationEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Dayflow <onboarding@resend.dev>",
      to: [email],
      subject: "Verify your Dayflow account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background-color: #7C6FF1; width: 48px; height: 48px; border-radius: 12px; line-height: 48px; margin-bottom: 16px;">
                <span style="color: white; font-size: 24px;">⏰</span>
              </div>
              <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin: 0;">Dayflow</h1>
            </div>
            
            <h2 style="color: #18181b; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Verify your email address</h2>
            
            <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
              Hi ${firstName},<br><br>
              Thank you for signing up for Dayflow! Please use the verification code below to confirm your email address:
            </p>
            
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #7C6FF1; letter-spacing: 4px;">${verificationCode}</span>
            </div>
            
            <p style="color: #71717a; font-size: 14px; line-height: 20px; margin: 0 0 24px 0;">
              This code will expire in 10 minutes. If you didn't create an account with Dayflow, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
            
            <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Dayflow HRMS. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
