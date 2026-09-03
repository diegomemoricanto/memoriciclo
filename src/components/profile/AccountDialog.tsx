import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Layers,
  LogOut,
  Settings2,
  Shield,
  Trophy,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut, updateProfile, uploadAvatar, useAuth } from "@/lib/auth-store";

type SectionId = "dados" | "preferencias" | "ranking" | "categorias" | "notificacoes" | "seguranca";

const SECTIONS: { id: SectionId; label: string; icon: typeof UserCog; badge?: string }[] = [
  { id: "dados", label: "Dados Pessoais", icon: UserCog },
  { id: "preferencias", label: "Preferências", icon: Settings2 },
  { id: "ranking", label: "Ranking", icon: Trophy, badge: "NOVO" },
  { id: "categorias", label: "Categorias", icon: Layers },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "seguranca", label: "Segurança", icon: Shield },
];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type FormState = {
  first_name: string;
  last_name: string;
  nickname: string;
  birthday: string;
  gender: string;
  city: string;
  uf: string;
  email: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  nickname: "",
  birthday: "",
  gender: "Não Informado",
  city: "",
  uf: "",
  email: "",
};

export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, email } = useAuth();
  const [section, setSection] = useState<SectionId>("dados");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const parts = (profile?.full_name ?? "").split(" ");
    setForm({
      first_name: profile?.first_name ?? parts[0] ?? "",
      last_name: profile?.last_name ?? parts.slice(1).join(" "),
      nickname: profile?.nickname ?? "",
      birthday: profile?.birthday ?? "",
      gender: profile?.gender ?? "Não Informado",
      city: profile?.city ?? "",
      uf: profile?.uf ?? "",
      email: profile?.email ?? email ?? "",
    });
  }, [open, profile, email]);

  const name = profile?.nickname ?? profile?.first_name ?? profile?.full_name ?? "Estudante";

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();
      await updateProfile({
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        nickname: form.nickname.trim() || null,
        birthday: form.birthday || null,
        gender: form.gender || null,
        city: form.city.trim() || null,
        uf: form.uf || null,
        email: form.email.trim() || null,
        full_name: fullName || null,
      });
      toast.success("Dados salvos com sucesso.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar seus dados. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadAvatar(file);
      toast.success("Foto de perfil atualizada.");
    } catch {
      toast.error("Não foi possível enviar a foto.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="grid md:grid-cols-[260px_1fr]">
          <aside className="flex flex-col gap-4 bg-muted/60 p-5">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Minha Conta</DialogTitle>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Trocar foto de perfil"
                className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-mint text-lg font-semibold text-mint-foreground"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`Foto de ${name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  name.slice(0, 1).toUpperCase()
                )}
                <span className="absolute inset-x-0 bottom-0 flex justify-center bg-foreground/50 py-0.5">
                  <Camera className="h-3 w-3 text-background" />
                </span>
              </button>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Foto de perfil
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-1"
                  onClick={() => fileRef.current?.click()}
                >
                  Carregar Foto
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </div>

            <nav className="flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                    section === s.id
                      ? "bg-mint text-mint-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                  {s.badge && (
                    <span className="ml-auto rounded-md bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                      {s.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={async () => {
                onOpenChange(false);
                await signOut();
              }}
              className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </aside>

          <div className="flex min-h-[420px] flex-col p-6">
            {section === "dados" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </Field>
                <Field label="Sobrenome">
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </Field>
                <Field label="Apelido">
                  <Input
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  />
                </Field>
                <Field label="Aniversário">
                  <Input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                  />
                </Field>
                <Field label="Gênero">
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option>Não Informado</option>
                    <option>Feminino</option>
                    <option>Masculino</option>
                    <option>Outro</option>
                  </select>
                </Field>
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Field label="Cidade">
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </Field>
                  <Field label="UF">
                    <select
                      value={form.uf}
                      onChange={(e) => setForm({ ...form, uf: e.target.value })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">--</option>
                      {UFS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="E-mail">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <SectionPlaceholder id={section} />
            )}

            <div className="mt-auto flex justify-end gap-3 pt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                variant="mint"
                disabled={saving || section !== "dados"}
                onClick={() => void handleSave()}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const PLACEHOLDERS: Record<Exclude<SectionId, "dados">, { title: string; text: string }> = {
  preferencias: {
    title: "Preferências",
    text: "Ajustes de tema, som do cronômetro e idioma serão configuráveis aqui.",
  },
  ranking: {
    title: "Ranking",
    text: "Compare sua constância e horas estudadas com outros estudantes. Em breve.",
  },
  categorias: {
    title: "Categorias",
    text: "Organize disciplinas e assuntos em categorias personalizadas.",
  },
  notificacoes: {
    title: "Notificações",
    text: "Escolha quando receber lembretes de estudo e avisos de prova.",
  },
  seguranca: {
    title: "Segurança",
    text: "Sua conta usa login com Google. Sessões e dispositivos aparecerão aqui.",
  },
};

function SectionPlaceholder({ id }: { id: Exclude<SectionId, "dados"> }) {
  const info = PLACEHOLDERS[id];
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">{info.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{info.text}</p>
    </div>
  );
}
