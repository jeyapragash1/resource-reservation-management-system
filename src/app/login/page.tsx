import { currentUser } from "@/backend/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/frontend/components/login-form";
import { Brand } from "@/frontend/components/icon";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await currentUser()) redirect("/overview");
  return (
    <main className="login-page">
      <section className="login-intro">
        <Brand full />
        <div className="login-copy">
          <h1>
            Resource
            <br />
            Reservation System
          </h1>
          <p>
            Book and manage shared facilities and resources
            <br className="desktop-break" /> in a simple, organized and
            efficient way.
          </p>
        </div>
        <div
          className="login-building"
          role="img"
          aria-label="Modern office building"
        />
        <span className="login-caption">
          One workspace. Every resource. A clear schedule.
        </span>
      </section>
      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}
