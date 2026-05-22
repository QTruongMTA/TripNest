import type { ButtonHTMLAttributes } from "react";
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`rounded-full bg-emerald-700 px-4 py-2 font-medium text-white transition hover:bg-emerald-800 ${className}`} {...props} />; }
