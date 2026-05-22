import { TravelerNotificationBell } from "@/components/shared/TravelerNotificationBell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-5 flex justify-end">
        <TravelerNotificationBell />
      </div>
      {children}
    </section>
  );
}
