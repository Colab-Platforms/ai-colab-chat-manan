"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Loader2, Eye, EyeOff, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import Image from "next/image";
import { motion } from "framer-motion";
import { EASE } from "@/components/NewLanding/components/motionVariants";

const getErrorMessage = (err: unknown, fallback: string) => {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof err.response === "object" &&
    err.response !== null &&
    "data" in err.response &&
    typeof err.response.data === "object" &&
    err.response.data !== null &&
    "message" in err.response.data &&
    typeof err.response.data.message === "string"
  ) {
    return err.response.data.message;
  }
  return fallback;
};

export default function RegisterPage() {
  const { register, verifyEmailOtp, resendEmailOtp, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get("redirect");
      router.replace(redirect && redirect.startsWith("/") ? redirect : "/");
    }
  }, [user, router, searchParams]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({ firstName, lastName, email, password });
      setPendingEmail(email);
      setStep("verify");
      toast.success("OTP sent to your email");
      setTimer(30);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await verifyEmailOtp(pendingEmail, otp);
      toast.success("Email verified. Please sign in.");
      const redirect = searchParams.get("redirect");
      const loginHref = redirect && redirect.startsWith("/")
        ? `/login?redirect=${encodeURIComponent(redirect)}`
        : "/login";
      router.push(loginHref);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "OTP verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) {
      toast.error("Please enter your email");
      return;
    }
    setResendLoading(true);
    try {
      await resendEmailOtp(pendingEmail);
      toast.success("OTP resent to your email");
      setTimer(30);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to resend OTP"));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-[#EACFEF] to-pink-100 dark:from-purple-950/40 dark:via-background dark:to-pink-950/40">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-[90%] max-w-md mx-3"
      >
        <Card className="w-full border-border/50 shadow-2xl border border-border/60 rounded-[28px] bg-background dark:bg-muted/40  focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto">
            <Image src="/black.webp" alt="AI Colab" width={90} height={90} className="dark:hidden h-auto" priority />
            <Image src="/white.webp" alt="AI Colab" width={90} height={90} className="hidden dark:block h-auto" priority />
          </div>
          <CardTitle className="text-2xl font-bold text-landing-primary">
            {step === "register" ? "Create account" : "Verify email"}
          </CardTitle>
          <CardDescription className="-mt-3">
            {step === "register"
              ? "Get started with AI Colab Chat"
              : `Enter the OTP sent to ${pendingEmail}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">First name</label>
                  <Input
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Last name</label>
                  <Input
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-medium bg-landing-primary hover:bg-landing-primary-hover text-white" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={pendingEmail}
                  onChange={(e) => setPendingEmail(e.target.value)}
                  required
                  disabled={timer > 0}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">OTP</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 font-medium bg-landing-primary hover:bg-landing-primary-hover text-white" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify email"}
              </Button>
              <Button type="button" variant="outline" className="w-full h-11" disabled={resendLoading || timer > 0} onClick={handleResend}>
                {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
              </Button>
            </form>
          )}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/login${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect") as string)}` : ""}`}
              className="text-primary hover:text-landing-primary font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2 text-primary hover:text-landing-primary transition-colors">
        <ArrowLeft className="w-4 h-4 " />
        <Link href="/" className=" font-medium">
          Back to Home
        </Link>
      </div>
      </motion.div>
    </div>
  );
}
