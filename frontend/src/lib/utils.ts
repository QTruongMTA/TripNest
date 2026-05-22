export function formatVnd(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value); }
export function formatDate(value: Date | string) { return new Intl.DateTimeFormat("vi-VN").format(new Date(value)); }
