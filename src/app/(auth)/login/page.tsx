import Image from "next/image";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export const metadata = {
  title: "Sign In — AressCRM",
};

export default function LoginPage() {
  return (
    <>
      <div className="mb-7 flex flex-col items-center text-center">
        <Image
          src="/aress-CRM-logo.png"
          alt="AressCRM"
          width={320}
          height={116}
          className="mb-3 h-12 w-auto brightness-200 saturate-150"
          priority
        />
        <h1 className="text-lg font-semibold text-white tracking-wide">Welcome back</h1>
        <p className="mt-1 text-xs" style={{ color: "rgba(0,210,172,0.7)" }}>
          Sign in to your account
        </p>
      </div>
      <LoginForm />
    </>
  );
}
