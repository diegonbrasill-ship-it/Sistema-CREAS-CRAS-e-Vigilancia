// frontend/src/pages/Login.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, User, Lock } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import prefeituraLogo from "../assets/logos/prefeitura.png";
import secretariaLogo from "../assets/logos/secretaria.png";
import creasLogo from "../assets/logos/creas.png";
import paefiLogo from "../assets/logos/paefi.png";

import "./login.css";

type LoginProps = {
  onLogin?: () => void;
};

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    // ... (sua função handleLogin continua a mesma)
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Por favor, preencha o usuário e a senha.");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success("Login efetuado com sucesso");
      onLogin?.();
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Usuário ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. ESTRUTURA PRINCIPAL ALTERADA para ser o container de posicionamento
    <div className="login-page-background min-h-screen flex flex-col justify-between p-6 relative">
      

      {/* 2. NOVO CABEÇALHO posicionado no topo da tela */}
      <header className="login-header">
        {/* Logo da Prefeitura à Esquerda */}
        <div className="header-side">
          <img
            src={prefeituraLogo}
            alt="Prefeitura"
            className="logo-prefeitura-canto"
          />
        </div>

        {/* Marca do sistema no Centro */}
        <div className="header-center">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Nobly</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">SIMAS PRO</h1>
            <p className="text-sm text-slate-500">Plataforma de gestao socioassistencial</p>
          </div>
        </div>

        {/* Espaço vazio à Direita para garantir a centralização correta da marca */}
        <div className="header-side"></div>
      </header>

      {/* 4. CARD DE LOGIN AGORA DENTRO DE UMA TAG <main> para centralização total */}
      <main className="login-main-content">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-xl">Nobly SIMAS PRO</CardTitle>
            <CardDescription>Utilize seu usuario e senha institucionais.</CardDescription>
          </CardHeader>-
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9" placeholder="Seu usuário" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="Sua senha" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full button-gradient-suas">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="institutional-footer">
        <div className="logo-group">
          <img src={secretariaLogo} alt="Secretaria de Desenvolvimento Social" className="logo-institucional" title="Secretaria de Desenvolvimento Social" />
          <img src={creasLogo} alt="CREAS" className="logo-institucional" title="CREAS" />
          <img src={paefiLogo} alt="PAEFI" className="logo-institucional" title="PAEFI" />
        </div>
      </footer>
    </div>
  );
}











