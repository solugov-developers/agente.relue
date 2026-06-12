"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function InstallPrompt({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(true); // assume instalado até saber (evita flash)
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    const sa =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(sa);
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;

  const btn =
    "inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.04] px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--blue)]/60 hover:text-[var(--ink)] " +
    className;

  // Android / Chrome / Edge: instalador nativo
  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className={btn}
      >
        <Download size={16} /> Instalar app
      </button>
    );
  }

  // iOS Safari: instrução (não há prompt programático)
  if (isIOS) {
    return (
      <>
        <button type="button" onClick={() => setIosOpen(true)} className={btn}>
          <Download size={16} /> Instalar no iPhone
        </button>
        {iosOpen && (
          <div
            onClick={() => setIosOpen(false)}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-[var(--ink)]">Instalar o Relue</h3>
                <button onClick={() => setIosOpen(false)} aria-label="Fechar" className="text-[var(--muted)]">
                  <X size={18} />
                </button>
              </div>
              <ol className="space-y-3 text-sm text-[var(--ink-soft)]">
                <li className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
                    <Share size={16} />
                  </span>
                  Toque no botão <b>Compartilhar</b> (na barra do Safari).
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
                    <SquarePlus size={16} />
                  </span>
                  Escolha <b>Adicionar à Tela de Início</b>.
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)] num text-xs font-bold">
                    3
                  </span>
                  Toque em <b>Adicionar</b> — pronto, vira um app.
                </li>
              </ol>
              <button
                onClick={() => setIosOpen(false)}
                className="mt-5 w-full rounded-xl bg-[var(--blue)] py-2.5 text-sm font-semibold text-white"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
