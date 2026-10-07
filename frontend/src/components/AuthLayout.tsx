import type { ReactNode } from "react";
import { LottiePlayer } from "./LottiePlayer";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  animationSrc: string;
  segment?: readonly [number, number];
  children: ReactNode;
  footer: ReactNode;
};

export function AuthLayout({
  title,
  subtitle,
  animationSrc,
  segment,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="auth-screen">
      <section className="auth-art">
        <p className="brand">Infinity</p>
        <LottiePlayer className="auth-lottie" src={animationSrc} segment={segment} />
        <div className="auth-art-copy">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}
