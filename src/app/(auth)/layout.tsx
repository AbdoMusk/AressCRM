export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-gradient-bg relative min-h-screen w-full overflow-hidden flex items-center">
      {/* Horizontal scan line */}
      <div className="auth-scan-line" />

      {/* Ambient radial glows */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: "32%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vmin",
          height: "80vmin",
          background:
            "radial-gradient(circle, rgba(0,255,210,0.08) 0%, rgba(0,120,255,0.04) 40%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: "20%",
          top: "30%",
          width: "50vmin",
          height: "50vmin",
          background:
            "radial-gradient(circle, rgba(120,0,255,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: "45%",
          top: "75%",
          width: "40vmin",
          height: "40vmin",
          background:
            "radial-gradient(circle, rgba(0,200,255,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Spinning rings – wrapper centers them, inner element rotates */}
      <div
        className="auth-ring-wrapper"
        style={{ left: "32%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div
          className="auth-ring"
          style={{
            width: "clamp(340px, 60vmin, 660px)",
            height: "clamp(340px, 60vmin, 660px)",
            border: "1.5px solid rgba(0, 255, 210, 0.2)",
            animationDuration: "24s, 5s",
          }}
        />
      </div>
      <div
        className="auth-ring-wrapper"
        style={{ left: "32%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div
          className="auth-ring"
          style={{
            width: "clamp(400px, 72vmin, 780px)",
            height: "clamp(400px, 72vmin, 780px)",
            border: "1px solid rgba(0, 180, 255, 0.12)",
            animationDuration: "36s, 7s",
            animationDirection: "reverse, normal",
          }}
        />
      </div>
      <div
        className="auth-ring-wrapper"
        style={{ left: "32%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div
          className="auth-ring"
          style={{
            width: "clamp(460px, 84vmin, 900px)",
            height: "clamp(460px, 84vmin, 900px)",
            border: "1px solid rgba(120, 0, 255, 0.08)",
            animationDuration: "50s, 9s",
          }}
        />
      </div>

      {/* Orbiting particles */}
      <div
        className="pointer-events-none absolute"
        style={{ left: "32%", top: "50%", width: 0, height: 0 }}
      >
        <div
          className="auth-particle"
          style={{
            animationName: "orbit-1, particle-twinkle",
            animationDuration: "12s, 2.4s",
          }}
        />
        <div
          className="auth-particle"
          style={{
            animationName: "orbit-2, particle-twinkle",
            animationDuration: "18s, 3.1s",
            animationDirection: "reverse, normal",
            width: 3,
            height: 3,
          }}
        />
        <div
          className="auth-particle"
          style={{
            animationName: "orbit-3, particle-twinkle",
            animationDuration: "25s, 1.8s",
            background: "#80c0ff",
          }}
        />
        <div
          className="auth-particle"
          style={{
            animationName: "orbit-1, particle-twinkle",
            animationDuration: "15s, 2.8s",
            animationDelay: "4s, 0.5s",
            background: "#aa88ff",
            width: 3,
            height: 3,
          }}
        />
        <div
          className="auth-particle"
          style={{
            animationName: "orbit-2, particle-twinkle",
            animationDuration: "22s, 3.5s",
            animationDelay: "6s, 1s",
          }}
        />
      </div>

      {/* Animated SVG Logo – positioned left */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: "32%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon_aress-1.svg"
          alt=""
          aria-hidden="true"
          className="auth-logo-animated"
          style={{
            width: "clamp(280px, 50vmin, 560px)",
            height: "clamp(280px, 50vmin, 560px)",
          }}
        />
      </div>

      {/* Glass form panel – right side */}
      <div className="relative z-10 ml-auto mr-6 sm:mr-12 lg:mr-20 w-full max-w-[420px] px-4">
        <div className="auth-glass-panel rounded-2xl p-8">{children}</div>
      </div>
    </div>
  );
}
