"use client";

import { useEffect, lazy, Suspense } from 'react'
import { AnimatedNavbar } from "@/components/landing/AnimatedNavbar";
import { AnimatedHero } from "@/components/landing/AnimatedHero";
const AdventureSection = lazy(() => import("@/components/landing/AdventureSection").then(m => ({ default: m.AdventureSection })));
const AIChangingSection = lazy(() => import("@/components/landing/AIChangingSection").then(m => ({ default: m.AIChangingSection })));
const HorizontalScrollSection = lazy(() => import("@/components/landing/HorizontalScrollSection").then(m => ({ default: m.HorizontalScrollSection })));
const AnimatedModels = lazy(() => import("@/components/landing/AnimatedModels").then(m => ({ default: m.AnimatedModels })));
const ModelCarousel = lazy(() => import("@/components/landing/ModelCarousel").then(m => ({ default: m.ModelCarousel })));
const AnimatedCTA = lazy(() => import("@/components/landing/AnimatedCTA").then(m => ({ default: m.AnimatedCTA })));
const AnimatedFAQ = lazy(() => import("@/components/landing/AnimatedFAQ").then(m => ({ default: m.AnimatedFAQ })));
const AnimatedFooter = lazy(() => import("@/components/landing/AnimatedFooter").then(m => ({ default: m.AnimatedFooter })));

// Simple loading placeholder - minimal
const SectionLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export function LandingPage() {
  useEffect(() => {
    // Use native smooth scroll - no heavy libraries
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }, [])

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ColabPlatforms AI",
    "description": "Advanced AI chatbot platform by ColabPlatforms. Chat with multiple LLM models simultaneously - Gemini, Claude, Perplexity, and more.",
    "url": "https://ai.colabplatforms.com",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free tier with 10K tokens"
    },
    "creator": {
      "@type": "Organization",
      "name": "ColabPlatforms"
    },
    "keywords": "AI, ColabPlatforms, LLM, models, Multichat, chatbot, colab, gemini, claude, perplexity",
    "featureList": [
      "Multi-model AI chat",
      "Gemini AI integration",
      "Claude AI support", 
      "Perplexity AI access",
      "Real-time streaming",
      "Token-based usage",
      "Mobile responsive"
    ]
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        {/* Main Content */}
        <div className="relative z-10">
          <AnimatedNavbar />
          <AnimatedHero />
          
          <Suspense fallback={<SectionLoader />}>
            <AdventureSection />
          </Suspense>
          
          <Suspense fallback={<SectionLoader />}>
            <AIChangingSection />
          </Suspense>
          
          {/* Features & Models sections with seamless background */}
          <div className="features-models-bg">
            <Suspense fallback={<SectionLoader />}>
              <HorizontalScrollSection />
            </Suspense>
            <Suspense fallback={<SectionLoader />}>
              <AnimatedModels />
            </Suspense>
          </div>
          
          {/* CSS for seamless background */}
          <style jsx>{`
            .features-models-bg {
              position: relative;
              background-color: #000;
            }
            .features-models-bg::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-image: url('/features-bg.png.jpg');
              background-size: 100% 100%;
              background-position: top left;
              background-repeat: no-repeat;
              pointer-events: none;
              z-index: 0;
            }
          `}</style>
          
          {/* CTA, FAQ & Footer wrapper with shared background - negative margin to eliminate gap */}
          <div 
            className="relative bg-black -mt-px"
            style={{ 
              backgroundImage: 'url(https://cdn.shopify.com/s/files/1/0636/5226/6115/files/tab_3.png?v=1766233741)',
              backgroundSize: 'cover',
              backgroundPosition: 'top center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* White Carousel Section */}
            <Suspense fallback={<SectionLoader />}>
              <ModelCarousel />
            </Suspense>
            <Suspense fallback={<SectionLoader />}>
              <AnimatedCTA />
            </Suspense>
            <Suspense fallback={<SectionLoader />}>
              <AnimatedFAQ />
            </Suspense>
            <Suspense fallback={<SectionLoader />}>
              <AnimatedFooter />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
