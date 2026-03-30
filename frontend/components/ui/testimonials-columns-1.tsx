"use client";
import React from "react";
import { motion } from "framer-motion";

type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={`flex flex-col items-center${props.className ? ` ${props.className}` : ""}`}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-[#fdf6f9] dark:bg-[#060104] w-full items-center"
      >
        {[...new Array(2).fill(0).map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <div
                key={i}
                className="p-7 rounded-2xl border border-gray-100 dark:border-pink-950/60 bg-white dark:bg-[#1c0510] shadow-[0_1px_4px_0_rgb(0,0,0,0.06)] dark:shadow-[0_1px_3px_0_rgb(0,0,0,0.4)] max-w-xl w-full"
              >
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{text}</p>
                <div className="flex items-center gap-3 mt-5">
                  <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full ring-2 ring-pink-100 dark:ring-pink-900/60 object-cover"
                  />
                  <div className="flex flex-col">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-5">{name}</div>
                    <div className="text-xs text-[#861043] dark:text-pink-400 leading-5">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))]}
      </motion.div>
    </div>
  );
};
