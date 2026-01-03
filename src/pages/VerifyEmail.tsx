import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmail() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: '', // User would need to provide email again
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Could not resend verification email. Please try signing up again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email Sent',
        description: 'Verification email has been resent. Please check your inbox.',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or click below to resend.
          </p>
          <Button variant="outline" onClick={handleResend} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend Verification Email
          </Button>
          <div className="pt-4">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
