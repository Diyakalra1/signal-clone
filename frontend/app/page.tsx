"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [otpStage, setOtpStage] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/auth/me").then(() => router.replace("/chat")).catch(() => undefined);
  }, [router]);

  async function pickAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("Choose an avatar under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!otpStage) {
      const identifier = mode === "register" ? phone.trim() : username.trim();
      if (!identifier) return setError(mode === "register" ? "Enter your phone number." : "Enter your username or phone number.");
      if (mode === "register" && !displayName.trim()) return setError("Add a display name to continue.");
      setBusy(true);
      try {
        if (mode === "register") {
          await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ phone: phone.trim(), display_name: displayName.trim(), avatar_url: avatar || undefined }),
          });
        } else {
          await apiFetch("/auth/login/request-otp", {
            method: "POST",
            body: JSON.stringify({ username: username.trim() }),
          });
        }
        setOtpStage(true);
        setOtp("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not request a code.");
      } finally { setBusy(false); }
      return;
    }
    if (otp.length !== 6) return setError("Enter the six digit verification code.");
    setBusy(true);
    try {
      if (mode === "register") {
        await apiFetch("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ phone: phone.trim(), display_name: displayName.trim(), avatar_url: avatar || undefined, otp }),
        });
      } else {
        await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username: username.trim(), otp }),
        });
      }
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally { setBusy(false); }
  }

  function switchMode(next: "login" | "register") {
    setMode(next); setOtpStage(false); setOtp(""); setError("");
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20.7 11.4a8.7 8.7 0 0 1-9 8.6 9.4 9.4 0 0 1-4-.9L3 21l1.4-4.1a8.3 8.3 0 0 1-1.5-4.8A8.7 8.7 0 0 1 12 3.5a8.7 8.7 0 0 1 8.7 7.9Z" /></svg></span>
          <h1>Signal</h1>
          <p>Say hello to a more private way to connect.</p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Sign in</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>Create account</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && !otpStage && <>
            <label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How people see you" autoComplete="name" /></label>
            <label>Profile photo <span className="auth-optional">Optional</span><input type="file" accept="image/*" onChange={pickAvatar} /></label>
            {avatar && <img className="auth-avatar-preview" src={avatar} alt="Avatar preview" />}
            <label>Phone number<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" autoComplete="tel" /></label>
          </>}
          {mode === "login" && !otpStage && <label>Username or phone number<input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username or phone" autoComplete="username" /></label>}
          {otpStage && <label>Verification code<input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} /></label>}
          {otpStage && <><p className="auth-hint">Your mock verification code is <strong>123456</strong>.</p><button type="button" className="auth-back" onClick={() => { setOtpStage(false); setOtp(""); setError(""); }}>Change details</button></>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? "Please wait..." : otpStage ? mode === "register" ? "Verify and create account" : "Verify and sign in" : "Get OTP"}</button>
        </form>
        <p className="auth-footnote">Your chats belong to you. Private by design.</p>
      </section>
    </main>
  );
}

