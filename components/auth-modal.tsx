"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatPdfLogo } from "@/components/chatpdf-logo";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";

interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
    const router = useRouter();
    const supabase = createClient();

    type AuthMode = "signup" | "login" | "verify" | "forgot_password" | "reset_verify" | "reset_update";
    const [mode, setMode] = useState<AuthMode>("signup");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [resendMessage, setResendMessage] = useState<string | null>(null);

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        setError(null);
        setResendMessage(null);
        setShowPassword(false);
        setSuccess(false);
    };

    const switchMode = (newMode: AuthMode) => {
        const tempEmail = email; // keep email when switching to related flows
        resetForm();
        if (newMode === "forgot_password" || newMode === "reset_verify" || newMode === "reset_update" || newMode === "verify") {
            setEmail(tempEmail);
        }
        setMode(newMode);
    };

    async function handleResendCode() {
        setError(null);
        setResendMessage(null);
        setResendLoading(true);

        const { error } = await supabase.auth.resend({
            type: mode === "reset_verify" ? 'signup' /* Supabase uses signup or generic for resend, but resetPasswordForEmail handles initial sending */ : 'signup',
            email,
        });

        if (error) {
            setError("Impossible de renvoyer le code. Veuillez réessayer plus tard.");
        } else {
            setResendMessage("Un nouveau code vient d'être envoyé.");
        }
        setResendLoading(false);
    }

    async function handleGoogleAuth() {
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) setError(error.message);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (mode === "signup") {
            if (password !== confirmPassword) {
                setError("Les mots de passe ne correspondent pas.");
                setLoading(false);
                return;
            }

            if (password.length < 6) {
                setError("Le mot de passe doit contenir au moins 6 caractères.");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            if (data?.user && data.user.identities && data.user.identities.length === 0) {
                setError("Ce compte existe déjà. Veuillez vous connecter.");
                setLoading(false);
                return;
            }

            // If email confirmation is disabled in Supabase, a session is created instantly
            if (data?.session) {
                setLoading(false);
                onOpenChange(false);
                onSuccess?.();
                router.refresh();
            } else {
                setMode("verify");
                setLoading(false);
            }
        } else if (mode === "verify") {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup'
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            setLoading(false);
            onOpenChange(false);
            onSuccess?.();
            router.refresh();
        } else if (mode === "forgot_password") {
            // Send the 6-digit OTP for password recovery
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }
            setMode("reset_verify");
            setLoading(false);
        } else if (mode === "reset_verify") {
            // Verify the 6-digit OTP
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'recovery'
            });
            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }
            setMode("reset_update");
            setLoading(false);
        } else if (mode === "reset_update") {
            // Update to the new password
            if (password !== confirmPassword) {
                setError("Les mots de passe ne correspondent pas.");
                setLoading(false);
                return;
            }
            if (password.length < 6) {
                setError("Le mot de passe doit contenir au moins 6 caractères.");
                setLoading(false);
                return;
            }
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }
            setLoading(false);
            onOpenChange(false);
            onSuccess?.();
            router.refresh();
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            setLoading(false);
            onOpenChange(false);
            onSuccess?.();
            router.refresh();
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                if (!val) resetForm();
                onOpenChange(val);
            }}
        >
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                {/* Hidden accessible title */}
                <DialogTitle className="sr-only">
                    {mode === "signup" ? "Créer un compte" : "Se connecter"}
                </DialogTitle>

                {mode === "verify" || mode === "reset_verify" ? (
                    <div className="flex flex-col px-8 py-8">
                        <div className="flex justify-center mb-6">
                            <ChatPdfLogo variant="light" size={38} />
                        </div>
                        <h3 className="text-xl font-bold text-center text-foreground mb-2">Vérifiez votre email</h3>
                        <p className="text-center text-sm text-muted-foreground mb-6">
                            Nous avons envoyé un code de confirmation à <strong>{email}</strong>.
                        </p>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Code à 6 chiffres"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    required
                                    maxLength={6}
                                    className="w-full text-center tracking-[0.5em] text-lg rounded-xl border border-border bg-background py-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all font-mono"
                                />
                            </div>
                            {error && <p className="text-sm text-destructive text-center">{error}</p>}
                            {resendMessage && <p className="text-sm text-teal text-center font-medium">{resendMessage}</p>}
                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-sm font-semibold text-white shadow-md shadow-teal/20 hover:bg-teal-light disabled:opacity-60 transition-all"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Vérifier
                            </button>

                            <div className="flex flex-col items-center mt-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resendLoading}
                                    className="text-sm font-medium text-teal hover:underline disabled:opacity-50"
                                >
                                    {resendLoading ? "Envoi en cours..." : "Renvoyer le code"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => switchMode(mode === "verify" ? "signup" : "login")}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Retour
                                </button>
                            </div>
                        </form>
                    </div>
                ) : success ? (
                    /* ====== Success state ====== */
                    <div className="flex flex-col items-center gap-4 px-8 py-10">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10">
                            <Mail className="h-7 w-7 text-teal" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Vérifiez votre email</h3>
                        <p className="text-center text-sm text-muted-foreground">
                            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
                            Consultez votre boîte de réception et cliquez sur le lien pour activer votre compte.
                        </p>
                        <button
                            onClick={() => {
                                resetForm();
                                switchMode("login");
                            }}
                            className="mt-2 text-sm font-medium text-teal hover:underline"
                        >
                            Retour à la connexion
                        </button>
                    </div>
                ) : (
                    /* ====== Form ====== */
                    <div className="flex flex-col px-8 py-8">
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            <ChatPdfLogo variant="light" size={38} />
                        </div>

                        {/* Google button */}
                        <button
                            onClick={handleGoogleAuth}
                            type="button"
                            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted/50 transition-colors"
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continuer avec Google
                        </button>

                        {/* Separator */}
                        <div className="relative my-5">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-background px-3 text-muted-foreground">ou</span>
                            </div>
                        </div>

                        {/* Email / password form */}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {mode === "signup" && (
                                <div>
                                    <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Nom
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            id="auth-name"
                                            type="text"
                                            placeholder="Ton nom"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            autoComplete="name"
                                            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-muted-foreground/60"
                                        />
                                    </div>
                                </div>
                            )}

                            {(mode === "signup" || mode === "login" || mode === "forgot_password") && (
                                <div>
                                    <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Adresse e-mail
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            id="auth-email"
                                            type="email"
                                            placeholder="you@mail.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-muted-foreground/60"
                                        />
                                    </div>
                                </div>
                            )}

                            {(mode === "signup" || mode === "login" || mode === "reset_update") && (
                                <div>
                                    <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-foreground">
                                        {mode === "reset_update" ? "Nouveau mot de passe" : "Mot de passe"}
                                    </label>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        <input
                                            id="auth-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Mot de passe"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete={mode === "signup" || mode === "reset_update" ? "new-password" : "current-password"}
                                            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-muted-foreground/60"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(mode === "signup" || mode === "reset_update") && (
                                <div>
                                    <label htmlFor="auth-confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Confirmer le mot de passe
                                    </label>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        <input
                                            id="auth-confirm-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Confirmer le mot de passe"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            autoComplete="new-password"
                                            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-muted-foreground/60"
                                        />
                                    </div>
                                </div>
                            )}

                            {mode === "login" && (
                                <div className="flex justify-end">
                                    <span className="text-xs text-muted-foreground">
                                        Mot de passe oublié ?{" "}
                                        <button
                                            type="button"
                                            className="font-medium text-teal hover:underline"
                                            onClick={() => switchMode("forgot_password")}
                                        >
                                            Réinitialiser
                                        </button>
                                    </span>
                                </div>
                            )}

                            {error && (
                                <p className="text-sm text-destructive text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-sm font-semibold text-white shadow-md shadow-teal/20 hover:bg-teal-light disabled:opacity-60 transition-all"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {mode === "signup" ? "Créer un compte" : mode === "forgot_password" ? "Envoyer le code" : mode === "reset_update" ? "Mettre à jour le mot de passe" : "Se connecter"}
                            </button>
                        </form>

                        {/* Toggle mode */}
                        <p className="mt-5 text-center text-sm text-muted-foreground">
                            {mode === "forgot_password" || mode === "reset_update" ? (
                                <button
                                    type="button"
                                    onClick={() => switchMode("login")}
                                    className="font-semibold text-teal hover:underline"
                                >
                                    Retour à la connexion
                                </button>
                            ) : mode === "signup" ? (
                                <>
                                    Tu as déjà un compte ?{" "}
                                    <button
                                        type="button"
                                        onClick={() => switchMode("login")}
                                        className="font-semibold text-teal hover:underline"
                                    >
                                        Se connecter
                                    </button>
                                </>
                            ) : (
                                <>
                                    Pas encore de compte ?{" "}
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signup")}
                                        className="font-semibold text-teal hover:underline"
                                    >
                                        Créer un compte
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
