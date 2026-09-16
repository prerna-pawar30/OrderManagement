import React from "react";

export default function WelcomeBanner({ name, subtitle }) {
  return (
    <div className="relative overflow-hidden rounded-xl2 border border-orange-100 bg-gradient-to-br from-orange-50 via-orange-50/60 to-white p-8 shadow-panel dark:border-white/10 dark:from-orange-500/10 dark:via-orange-500/5 dark:to-ink-900 sm:p-12">
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-orange-200/40 dark:bg-orange-500/10" />
      <div className="pointer-events-none absolute -bottom-14 right-14 h-32 w-32 rounded-full bg-orange-300/30 dark:bg-orange-500/10" />
      <div className="relative">
        <h2 className="font-display text-xl font-bold text-orange-700 dark:text-orange-400 sm:text-2xl">
          Hello {name},
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-sm text-mist-500 dark:text-mist-300">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
