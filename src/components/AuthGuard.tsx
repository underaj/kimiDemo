"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUtils } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = AuthUtils.isLoggedIn();

      if (!loggedIn) {
        // If not logged in, redirect to login page
        router.push("/login");
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying identity...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Don't show anything when redirecting to login page
  }

  return <>{children}</>;
}
