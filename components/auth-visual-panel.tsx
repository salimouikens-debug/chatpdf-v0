"use client";

import Lottie from "lottie-react";
import connectAnimation from "@/public/Connect with us.json";

export function AuthVisualPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center overflow-hidden bg-[#0B0F1A]">
      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-12 text-center">
        {/* Lottie animation */}
        <div className="mb-8 w-72 h-72">
          <Lottie
            animationData={connectAnimation}
            loop
            autoplay
            className="w-full h-full"
          />
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          From Documents to
          <br />
          Conversations
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
          Create an account in 2 minutes and Join{" "}
          <span className="font-semibold text-white/80">5 Million+</span> happy
          customers to get full access
        </p>
      </div>
    </div>
  );
}
