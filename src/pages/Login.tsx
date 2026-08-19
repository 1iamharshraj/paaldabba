import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";

type Mode = "login" | "register";
type Role = "milkman" | "client";

export default function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("milkman");
  const [milkmanUsername, setMilkmanUsername] = useState("");
  const [error, setError] = useState("");

  const onSuccess = async () => {
    await utils.invalidate();
    navigate("/dashboard");
  };

  const loginMut = trpc.auth.login.useMutation({
    onSuccess,
    onError: (e) => setError(e.message),
  });
  const registerMut = trpc.auth.register.useMutation({
    onSuccess,
    onError: (e) => setError(e.message),
  });

  const busy = loginMut.isPending || registerMut.isPending;

  const submit = () => {
    setError("");
    if (mode === "login") {
      loginMut.mutate({ username: username.trim(), password });
    } else {
      registerMut.mutate({
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
        role,
        milkmanUsername:
          role === "client" ? milkmanUsername.trim() || undefined : undefined,
      });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background:
          "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(245,238,220,0.08), transparent 60%), #0a0a0c",
      }}
    >
      <div className="liquid-glass-strong rounded-3xl w-full max-w-sm p-8">
        <div className="text-center mb-7">
          <img
            src="/icons/icon-192.png"
            alt="MilkTrack"
            className="w-16 h-16 rounded-2xl mx-auto mb-4"
          />
          <h1 className="font-geist-mono font-black text-2xl text-white tracking-tight">
            MILKTRACK
          </h1>
          <p className="font-mono-data text-[10px] tracking-[0.25em] uppercase text-[#f5eedc]/50 mt-2">
            Your daily milk ledger
          </p>
        </div>

        {/* mode tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#f5eedc]/[0.06] border border-[#f5eedc]/10 mb-6">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`rounded-full py-2.5 font-mono-data text-[11px] tracking-[0.2em] uppercase transition-all ${
                mode === m
                  ? "bg-[#f5eedc] text-[#141311] font-bold"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <>
              <input
                type="text"
                placeholder="Display name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={64}
                className="w-full rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4 py-3.5 font-geist-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5eedc]/50 transition-colors"
              />
              <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#f5eedc]/[0.06] border border-[#f5eedc]/10">
                {(["milkman", "client"] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setError("");
                    }}
                    className={`rounded-full py-2 font-mono-data text-[11px] tracking-[0.15em] uppercase transition-all ${
                      role === r
                        ? "bg-[#f5eedc] text-[#141311] font-bold"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {r === "milkman" ? "Milkman" : "Client"}
                  </button>
                ))}
              </div>
              {role === "client" && (
                <input
                  type="text"
                  placeholder="Milkman username (optional)"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={milkmanUsername}
                  onChange={(e) => setMilkmanUsername(e.target.value)}
                  className="w-full rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4 py-3.5 font-geist-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5eedc]/50 transition-colors"
                />
              )}
            </>
          )}
          <input
            type="text"
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4 py-3.5 font-geist-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5eedc]/50 transition-colors"
          />
          <input
            type="password"
            placeholder={mode === "register" ? "Password (min 6 chars)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
            className="w-full rounded-2xl border border-[#f5eedc]/20 bg-[#f5eedc]/5 px-4 py-3.5 font-geist-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f5eedc]/50 transition-colors"
          />
        </div>

        {error && (
          <p className="font-mono-data text-[11px] text-red-300/90 mt-3 text-center">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy || username.trim().length < 3 || password.length < 6}
          className="milk-btn-primary rounded-full w-full py-4 mt-5 font-geist-mono text-sm tracking-wide"
        >
          {busy
            ? "One sec…"
            : mode === "login"
              ? "Sign in →"
              : "Create my ledger →"}
        </button>

        <p className="font-mono-data text-[10px] text-white/35 text-center mt-4 leading-relaxed">
          {mode === "register"
            ? "Registering creates your own private milk ledger."
            : "No account yet? Flip to Register above."}
        </p>

        <Link
          to="/"
          className="block font-mono-data text-[10px] tracking-[0.2em] uppercase text-white/35 text-center mt-5 hover:text-white/60 transition-colors"
        >
          ← Back home
        </Link>
      </div>
    </div>
  );
}
