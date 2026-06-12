"use client";

import SmoothScrollLayout from "../SmoothScrollLayout";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import About from "./components/About";
import OnePlatform from "./components/OnePlatform";
import TabsShowcase from "./components/TabsShowcase";
import WhatYouGet from "./components/WhatYouGet";
import Testimonials from "./components/Testimonials";
import Pricing from "./components/Pricing";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";

export function NewLandingPage() {
  return (
    <SmoothScrollLayout>
        <Navbar />
        <Hero />
        <About />
        <OnePlatform />
        <TabsShowcase />
        <WhatYouGet />
        <Pricing />
        <FAQ />
        <Testimonials />
        <Footer />
    </SmoothScrollLayout>
  );
}


