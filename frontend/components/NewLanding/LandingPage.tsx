"use client";

import { FeaturesSection } from "./components/FeaturesSection";
import { HeroSection } from "./components/HeroSection";
import { HoverBlurSurface } from "./components/HoverBlurSurface";
import { FAQSection } from "./components/FAQSection";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { Testimonials } from "./components/Testimonials";
import { PricingSection } from "./components/PricingSection";

export function NewLandingPage() {
  return (
    <>
      <Navbar />
      <HoverBlurSurface className="w-full dark:bg-[#230713] pb-20">
        <HeroSection />
      </HoverBlurSurface>

      <FeaturesSection />
      <PricingSection />
      <Testimonials />
      <FAQSection />
      <Footer />
    </>
  );
}
