"use client";

export default function Home() {
  const handleStart = () => {
    alert("Bienvenue sur KS SMS Send !");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#0f172a",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "32px",
          borderRadius: "20px",
          background: "#1e293b",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "36px", marginBottom: "12px" }}>
          KS SMS Send
        </h1>

        <p style={{ color: "#cbd5e1", marginBottom: "28px" }}>
          Envoyez vos SMS simplement et rapidement.
        </p>

        <button
          onClick={handleStart}
          style={{
            width: "100%",
            padding: "15px",
            border: "none",
            borderRadius: "10px",
            background: "#2563eb",
            color: "white",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Commencer
        </button>
      </section>
    </main>
  );
}
