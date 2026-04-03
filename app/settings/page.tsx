"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    User,
    Lock,
    FileText,
    Trash2,
    Globe,
    Loader2,
    Monitor,
    Camera,
    AlertTriangle,
    Sparkles,
    MessageCircle,
    Layers,
    Clock,
    Zap,
    ShieldCheck,
    Languages,
    Wand2,
    ChevronRight,
    CheckCircle2,
    Eye,
    EyeOff
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getDocuments, deleteDocument, type DocumentMeta } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(true);
    const [userEmail, setUserEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [userId, setUserId] = useState("");
    const [userCreatedAt, setUserCreatedAt] = useState("");
    const [language, setLanguage] = useState("fr");
    const [isEditingName, setIsEditingName] = useState(false);
    const t = useTranslation(language);

    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI states for password
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    // Profile update state
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Documents state
    const [documents, setDocuments] = useState<DocumentMeta[]>([]);
    const [isDeletingDoc, setIsDeletingDoc] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUserEmail(data.user.email ?? "");
                setUserName(data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User");
                setUserId(data.user.id);
                // format account creation date
                const date = new Date(data.user.created_at);
                setUserCreatedAt(date.toLocaleDateString());
            } else {
                router.push("/login");
            }
            setIsLoading(false);
        });

        getDocuments()
            .then((docs) => setDocuments(docs))
            .catch(() => console.error("Could not load documents"));

        const savedLang = localStorage.getItem("app-lang");
        if (savedLang) {
            setLanguage(savedLang);
            document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
        }
    }, [router, supabase]);

    const handleUpdateProfile = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();
        setIsUpdatingProfile(true);
        const { error } = await supabase.auth.updateUser({
            data: { full_name: userName }
        });

        setIsUpdatingProfile(false);
        setIsEditingName(false);
        if (error) {
            toast.error("Erreur lors de la mise à jour du profil");
        } else {
            toast.success("Profil mis à jour avec succès");
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");

        if (!currentPassword || !newPassword || !confirmPassword) {
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError(t("passwordTooShort"));
            return;
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            setPasswordError(t("passwordRequireRegex"));
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(t("passwordMismatch"));
            return;
        }

        setIsUpdatingPassword(true);

        // Verify current password first by attempting re-authentication
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword
        });

        if (authError) {
            setIsUpdatingPassword(false);
            setPasswordError(t("incorrectCurrentPassword"));
            return;
        }

        // Proceed to update password
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        setIsUpdatingPassword(false);
        if (updateError) {
            setPasswordError(updateError.message);
        } else {
            toast.success(t("passwordChangedSuccess"));
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);
        }
    };

    const handleDeleteDocument = async (id: string, filename: string) => {
        setIsDeletingDoc(id);
        try {
            await deleteDocument(id);
            setDocuments(prev => prev.filter(d => d.id !== id));
            toast.success(`${t("deleteDocTitle")} - ${filename}`);
        } catch {
            toast.error(t("cancel")); // just as a fallback
        }
        setIsDeletingDoc(null);
    };

    const handleDeleteAccount = async () => {
        toast.success(t("cancel"));
        await supabase.auth.signOut();
        router.push("/");
    };

    const handleLanguageChange = (val: string) => {
        setLanguage(val);
        localStorage.setItem("app-lang", val);
        document.documentElement.dir = val === "ar" ? "rtl" : "ltr";
        window.dispatchEvent(new Event("languageChange"));
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin text-teal" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-10">
            <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-6 py-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="hover:bg-muted">
                    <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
                </Button>
                <h1 className="text-xl font-bold">{t("settingsTitle")}</h1>
            </div>

            <div className="max-w-4xl mx-auto mt-8 px-6">
                <Tabs defaultValue="profile" orientation="vertical" className="flex flex-col md:flex-row gap-8 w-full max-w-full">

                    <TabsList className="flex flex-col h-auto w-full md:w-64 bg-transparent justify-start gap-1 p-0 items-stretch">
                        <TabsTrigger value="profile" className="w-full justify-start gap-3 py-2.5 px-3 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-lg">
                            <User className="h-4 w-4" />
                            {t("profile")}
                        </TabsTrigger>
                        <TabsTrigger value="security" className="w-full justify-start gap-3 py-2.5 px-3 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-lg">
                            <Lock className="h-4 w-4" />
                            {t("password")}
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="w-full justify-start gap-3 py-2.5 px-3 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-lg">
                            <Monitor className="h-4 w-4" />
                            {t("preferences")}
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="w-full justify-start gap-3 py-2.5 px-3 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-lg">
                            <FileText className="h-4 w-4" />
                            {t("myDocuments")}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 min-w-0">
                        {/* PROFILE TAB */}
                        <TabsContent value="profile" className="mt-0 outline-none w-full">
                            <div className="flex flex-col gap-8 max-w-3xl">
                                <div>
                                    <h2 className="text-2xl font-bold mb-6">{t("account")}</h2>

                                    <div className="space-y-0.5 rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between p-4 border-b">
                                            <span className="text-sm font-medium">{t("fullName")}</span>
                                            {isEditingName ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={userName}
                                                        onChange={(e) => setUserName(e.target.value)}
                                                        className="h-8 w-40 text-right"
                                                    />
                                                    <Button size="sm" onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="h-8">
                                                        {isUpdatingProfile ? <Loader2 className="h-3 w-3 animate-spin" /> : t("saveChanges")}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground">{userName}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)} className="h-8 text-xs hover:bg-muted">
                                                        {t("edit")}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-4 border-b">
                                            <span className="text-sm font-medium">{t("email")}</span>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="text-sm font-medium">{userEmail}</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BENEFITS SECTION */}
                                <div>
                                    <p className="text-sm font-semibold mb-4 text-foreground/90">
                                        {t("benefitsTitle")}
                                    </p>

                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <Sparkles className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit1")}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <MessageCircle className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit3")}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <Wand2 className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit2")}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <Layers className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit4")}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <Clock className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit5")}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <Zap className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit6")}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <ShieldCheck className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit7")}</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                                            <Languages className="h-5 w-5 mt-0.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                                            <span>{t("benefit8")}</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* EXTRA ACCOUNT INFO */}
                                <div className="pt-6 border-t mt-2">
                                    <h3 className="text-[11px] font-semibold mb-4 text-muted-foreground uppercase tracking-wider">{t("accountInfo")}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">{t("memberSince")}</span>
                                            <span className="text-sm font-medium">{userCreatedAt}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">{t("accountStatus")}</span>
                                            <span className="text-sm font-medium flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t("active")}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-4">
                                        <span className="text-xs text-muted-foreground">{t("userId")}</span>
                                        <span className="text-xs text-muted-foreground font-mono bg-muted/30 w-fit px-2 py-0.5 rounded">{userId}</span>
                                    </div>
                                </div>

                            </div>
                        </TabsContent>

                        {/* SECURITY TAB */}
                        <TabsContent value="security" className="mt-0 outline-none w-full">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("changePassword")}</CardTitle>
                                    <CardDescription>{t("changePasswordDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form id="password-form" onSubmit={handleUpdatePassword} className="space-y-5 max-w-sm">
                                        <div className="grid gap-2">
                                            <Label htmlFor="current-password">{t("currentPassword")}</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="current-password"
                                                    type={showCurrent ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    required
                                                    className="pl-9 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrent(!showCurrent)}
                                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="new-password">{t("newPassword")}</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="new-password"
                                                    type={showNew ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    required
                                                    className="pl-9 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNew(!showNew)}
                                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="confirm-password">{t("confirmNewPassword")}</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="confirm-password"
                                                    type={showConfirm ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                    className="pl-9 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm(!showConfirm)}
                                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {passwordError && (
                                            <p className="text-sm text-destructive">{passwordError}</p>
                                        )}
                                    </form>
                                </CardContent>
                                <CardFooter className="border-t px-6 py-4 flex justify-end bg-muted/20">
                                    <Button type="submit" form="password-form" disabled={isUpdatingPassword} className="bg-teal hover:bg-teal-light">
                                        {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t("updatePasswordBtn")}
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* DANGER ZONE (Delete Account) */}
                            <Card className="mt-8 border-destructive/20 shadow-sm max-w-full">
                                <CardHeader>
                                    <CardTitle className="text-destructive flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        {t("deleteAccountTitle")}
                                    </CardTitle>
                                    <CardDescription>
                                        {t("deleteAccountDesc")}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">{t("deleteBtn")}</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t("deleteWarning")}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                    {t("confirmDelete")}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* APPEARANCE & PREFERENCES TAB */}
                        <TabsContent value="appearance" className="mt-0 outline-none w-full">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("prefLangTitle")}</CardTitle>
                                    <CardDescription>{t("prefLangDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="flex flex-col gap-3">
                                        <div className="space-y-0.5">
                                            <Label className="text-base flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                {t("uiLang")}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">{t("uiLangDesc")}</p>
                                        </div>
                                        <Select value={language} onValueChange={handleLanguageChange}>
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder={t("chooseLang")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fr">Français</SelectItem>
                                                <SelectItem value="en">English</SelectItem>
                                                <SelectItem value="ar">العربية</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* DOCUMENTS TAB */}
                        <TabsContent value="documents" className="mt-0 outline-none w-full">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("manageFiles")}</CardTitle>
                                    <CardDescription>{t("manageFilesDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {documents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                            <FileText className="h-8 w-8 mb-2 opacity-50" />
                                            <p>{t("noDocuments")}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                                                            <FileText className="h-5 w-5 text-teal" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm truncate">{doc.filename}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{doc.total_pages} {t("pages")}</p>
                                                        </div>
                                                    </div>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0">
                                                                {isDeletingDoc === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t("deleteDocTitle")}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t("deleteDocDesc")}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteDocument(doc.id, doc.filename)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                                                    {t("confirmDocDelete")}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </div>
                </Tabs>
            </div>
        </div>
    );
}
