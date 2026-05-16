"use client";

import { motion } from "framer-motion";
import Eyebrow from "./Eyebrow";

export default function PageHero({
  num,
  eyebrow,
  title,
  italicTail,
  intro,
}: {
  num: string;
  eyebrow: string;
  title: string;
  italicTail?: string;
  intro: string;
}) {
  return (
    <section className="relative pt-32 md:pt-40 pb-12 md:pb-16 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-bullion-400/[0.07] blur-[140px]" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[860px] h-px bg-gradient-to-r from-transparent via-bullion-400/40 to-transparent" />
      </div>

      <div className="container-vault max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <Eyebrow num={num}>{eyebrow}</Eyebrow>

          <h1 className="mt-5 font-display text-cream text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] tracking-tight">
            {title}
            {italicTail && (
              <>
                <br />
                <span className="italic text-cream-muted">{italicTail}</span>
              </>
            )}
          </h1>

          <p className="mt-7 max-w-2xl text-cream-muted text-lg leading-relaxed">
            {intro}
          </p>
        </motion.div>
      </div>

      <div className="container-vault max-w-4xl mt-14">
        <div className="rule-bullion" />
      </div>
    </section>
  );
}
