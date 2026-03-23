"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const images = [
  {
    src: "https://cdn.shopify.com/s/files/1/0636/5226/6115/files/ai-image-generator-hero-image.png?v=1764933882",
    alt: "AI Generated Art",
    title: "AI Image Generation",
  },
  {
    src: "https://cdn.shopify.com/s/files/1/0636/5226/6115/files/8e70bede-1e79-4acc-8e27-d42f3ed7d973.jpg?v=1764933882",
    alt: "Creative AI Art",
    title: "Creative Visuals",
  },
  {
    src: "https://cdn.shopify.com/s/files/1/0636/5226/6115/files/c976836e-d582-4165-8097-ebedb90d9839.webp?v=1764933881",
    alt: "AI Artwork",
    title: "Artistic Expression",
  },
  {
    src: "https://cdn.shopify.com/s/files/1/0636/5226/6115/files/9b0c0525-4efb-45b8-909f-32ff73d35472_3.webp?v=1764933881",
    alt: "AI Creation",
    title: "Digital Creation",
  },
  {
    src: "https://cdn.shopify.com/s/files/1/0636/5226/6115/files/astronaut-space-with-planets-background_884500-1553.avif?v=1764933880",
    alt: "Space Exploration",
    title: "Infinite Possibilities",
  },
];

export function ModelCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);


  return (
    <section className="relative pt-16 md:pt-24 pb-16 overflow-hidden bg-white rounded-t-[60px] md:rounded-t-[80px] rounded-b-[60px] md:rounded-b-[80px]">
      {/* Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Create <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Stunning Visuals</span> with AI
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Generate breathtaking images, artwork, and creative content with our AI-powered tools
          </p>
        </div>

        {/* Carousel */}
        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{
            loop: true,
            align: "center",
          }}
        >
          <CarouselContent className="flex h-[400px] md:h-[500px]">
            {images.map((img, index) => (
              <CarouselItem
                key={index}
                className="relative flex items-center justify-center basis-[80%] sm:basis-[55%] md:basis-[40%] lg:basis-[30%] xl:basis-[25%]"
              >
                <motion.div
                  initial={false}
                  animate={{
                    clipPath:
                      current !== index
                        ? "inset(12% 0 12% 0 round 1.5rem)"
                        : "inset(0 0 0 0 round 1.5rem)",
                    scale: current === index ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full w-full overflow-hidden rounded-3xl"
                >
                  <div
                    className={`relative h-full w-full border transition-all duration-500 ${
                      current === index
                        ? "border-emerald-500/50 shadow-2xl shadow-emerald-500/20"
                        : "border-gray-800"
                    }`}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="h-full w-full scale-105 object-cover"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  </div>
                </motion.div>

                {/* Title Below Card */}
                <AnimatePresence mode="wait">
                  {current === index && (
                    <motion.div
                      initial={{ opacity: 0, filter: "blur(10px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(10px)" }}
                      transition={{ duration: 0.5 }}
                      className="absolute bottom-0 left-0 right-0 flex h-[15%] translate-y-full items-center justify-center p-2 text-center"
                    >
                      <span className="text-lg font-medium bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                        {img.title}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CarouselItem>
            ))}
          </CarouselContent>


          {/* Pagination Dots Only */}
          <div className="flex items-center justify-center gap-4 mt-12 pb-8">
          </div>
        </Carousel>
      </div>
    </section>
  );
}
