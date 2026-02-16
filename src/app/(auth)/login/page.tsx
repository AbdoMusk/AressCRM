import Image from "next/image";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export const metadata = {
  title: "Sign In — AressCRM",
};

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/aress-CRM-logo.png"
          alt="AressCRM"
          width={180}
          height={48}
          className="mb-2 h-12 w-auto"
          priority
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sign in to your account
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
