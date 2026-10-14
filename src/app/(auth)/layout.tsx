import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-main flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 flex justify-center">
        <Link href="/" className="group flex flex-col items-center">
          <Logo size="lg" showTagline />
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {children}
      </div>

      <div className="mt-8 text-center text-xs text-text-secondary/60 relative z-10">
        &copy; 2026 Mr.BOB Kampung Inggris. All rights reserved.
      </div>
    </div>
  );
}
