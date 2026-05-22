"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function OperatorIndex() {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (user?.role === "OPERATOR_SUB") {
      router.replace("/operator/tasks");
    } else {
      router.replace("/operator/dashboard");
    }
  }, [user, router]);
  return null;
}
