import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-1">Ledger</h1>
        <p className="text-slate-400 text-center mb-8 text-sm">
          Your expenses, your rules.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
