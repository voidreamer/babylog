import React from 'react';
import { Heart, Coffee, Book, Music, Star, Sun } from 'lucide-react';

export default function SketchyBorderCards() {
  const cards = [
    {
      id: 1,
      title: "Morning Ritual",
      description: "Start your day with intention and warmth",
      icon: Coffee,
      color: "from-amber-100 to-orange-50",
      bgColor: "bg-amber-50",
      strokeColor: "#d97706"
    },
    {
      id: 2,
      title: "Reading Corner",
      description: "Get lost in stories and imagination",
      icon: Book,
      color: "from-blue-100 to-indigo-50",
      bgColor: "bg-blue-50",
      strokeColor: "#2563eb"
    },
    {
      id: 3,
      title: "Music Moments",
      description: "Let melodies fill your space",
      icon: Music,
      color: "from-purple-100 to-pink-50",
      bgColor: "bg-purple-50",
      strokeColor: "#9333ea"
    },
    {
      id: 4,
      title: "Favorite Things",
      description: "Collect moments that make you smile",
      icon: Heart,
      color: "from-rose-100 to-red-50",
      bgColor: "bg-rose-50",
      strokeColor: "#e11d48"
    },
    {
      id: 5,
      title: "Special Moments",
      description: "Treasure the little things",
      icon: Star,
      color: "from-yellow-100 to-amber-50",
      bgColor: "bg-yellow-50",
      strokeColor: "#eab308"
    },
    {
      id: 6,
      title: "Bright Days",
      description: "Embrace the sunshine",
      icon: Sun,
      color: "from-orange-100 to-yellow-50",
      bgColor: "bg-orange-50",
      strokeColor: "#f97316"
    }
  ];

  // Generate a wobbly path that looks hand-drawn
  const generateSketchyPath = (width, height, seed) => {
    const roughness = 3;
    const points = 80; // More points = more detailed sketch
    let path = 'M ';
    
    // Helper to add wobble
    const wobble = (base, index) => {
      return base + Math.sin(seed + index * 0.5) * roughness + Math.cos(seed * 1.3 + index * 0.7) * roughness * 0.5;
    };
    
    // Top edge
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const y = wobble(0, i);
      path += `${x},${y} `;
    }
    
    // Right edge
    for (let i = 0; i <= points; i++) {
      const x = wobble(width, i + points);
      const y = (i / points) * height;
      path += `${x},${y} `;
    }
    
    // Bottom edge
    for (let i = points; i >= 0; i--) {
      const x = (i / points) * width;
      const y = wobble(height, i + points * 2);
      path += `${x},${y} `;
    }
    
    // Left edge
    for (let i = points; i >= 0; i--) {
      const x = wobble(0, i + points * 3);
      const y = (i / points) * height;
      path += `${x},${y} `;
    }
    
    path += 'Z';
    return path;
  };

  // Generate a sketchy blob path
  const generateBlobPath = (width, height, seed) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width * 0.4;
    const radiusY = height * 0.4;
    const points = 40;
    
    let path = 'M ';
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusVariation = 1 + Math.sin(seed + i * 0.8) * 0.15 + Math.cos(seed * 1.5 + i * 1.2) * 0.1;
      const x = centerX + Math.cos(angle) * radiusX * radiusVariation;
      const y = centerY + Math.sin(angle) * radiusY * radiusVariation;
      
      if (i === 0) {
        path += `${x},${y} `;
      } else {
        // Add some waviness with quadratic curves
        const prevAngle = ((i - 1) / points) * Math.PI * 2;
        const prevRadiusVariation = 1 + Math.sin(seed + (i - 1) * 0.8) * 0.15;
        const cpx = centerX + Math.cos((angle + prevAngle) / 2) * radiusX * prevRadiusVariation * 1.1;
        const cpy = centerY + Math.sin((angle + prevAngle) / 2) * radiusY * prevRadiusVariation * 1.1;
        path += `Q ${cpx},${cpy} ${x},${y} `;
      }
    }
    
    path += 'Z';
    return path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-800">
          Hand-Drawn Cards
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {cards.map((card, index) => {
            const Icon = card.icon;
            const seed = index * 7.3; // Different seed for each card
            const cardWidth = 280;
            const cardHeight = 320;
            
            return (
              <div
                key={card.id}
                className="relative group cursor-pointer transform hover:scale-105 transition-all duration-300"
                style={{
                  transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (1 + Math.random())}deg)`,
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`
                }}
              >
                {/* Sketchy shadow */}
                <svg
                  className="absolute inset-0 opacity-20"
                  style={{ transform: 'translate(6px, 6px)' }}
                  viewBox={`0 0 ${cardWidth} ${cardHeight}`}
                >
                  <path
                    d={generateSketchyPath(cardWidth, cardHeight, seed + 0.5)}
                    fill={card.strokeColor}
                    opacity="0.3"
                  />
                </svg>
                
                {/* Main card container */}
                <div className="absolute inset-0">
                  {/* SVG with sketchy border */}
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    viewBox={`0 0 ${cardWidth} ${cardHeight}`}
                  >
                    {/* White background with sketchy clip */}
                    <path
                      d={generateSketchyPath(cardWidth, cardHeight, seed)}
                      fill="white"
                    />
                    
                    {/* Multiple sketchy border lines for hand-drawn effect */}
                    <path
                      d={generateSketchyPath(cardWidth, cardHeight, seed)}
                      fill="none"
                      stroke={card.strokeColor}
                      strokeWidth="2.5"
                      opacity="0.8"
                    />
                    <path
                      d={generateSketchyPath(cardWidth, cardHeight, seed + 0.1)}
                      fill="none"
                      stroke={card.strokeColor}
                      strokeWidth="2"
                      opacity="0.5"
                    />
                    <path
                      d={generateSketchyPath(cardWidth, cardHeight, seed - 0.1)}
                      fill="none"
                      stroke={card.strokeColor}
                      strokeWidth="1.5"
                      opacity="0.3"
                    />
                    
                    {/* Decorative blob in background */}
                    <path
                      d={generateBlobPath(120, 120, seed + 3)}
                      fill={card.strokeColor}
                      opacity="0.08"
                      transform={`translate(${cardWidth - 100}, 20)`}
                    />
                  </svg>
                  
                  {/* Content */}
                  <div className="absolute inset-0 p-8 flex flex-col">
                    {/* Icon with sketchy circle */}
                    <div className="relative mb-6 w-fit">
                      <svg width="70" height="70" className="absolute -inset-2">
                        <path
                          d={generateBlobPath(70, 70, seed + 5)}
                          fill={card.strokeColor}
                          opacity="0.15"
                        />
                        <path
                          d={generateBlobPath(70, 70, seed + 5)}
                          fill="none"
                          stroke={card.strokeColor}
                          strokeWidth="2"
                          opacity="0.4"
                        />
                        <path
                          d={generateBlobPath(70, 70, seed + 5.1)}
                          fill="none"
                          stroke={card.strokeColor}
                          strokeWidth="1.5"
                          opacity="0.25"
                        />
                      </svg>
                      <div className="relative z-10 p-3">
                        <Icon className="w-8 h-8" style={{ color: card.strokeColor }} />
                      </div>
                    </div>
                    
                    {/* Text content */}
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      {card.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed flex-grow">
                      {card.description}
                    </p>
                    
                    {/* Sketchy underline */}
                    <svg className="mt-4 w-full h-3" viewBox="0 0 200 10">
                      <path
                        d={`M 5,5 ${Array.from({ length: 20 }, (_, i) => {
                          const x = 10 + i * 9;
                          const y = 5 + Math.sin(seed + i * 0.5) * 2;
                          return `L ${x},${y}`;
                        }).join(' ')}`}
                        stroke={card.strokeColor}
                        strokeWidth="2"
                        fill="none"
                        opacity="0.3"
                      />
                      <path
                        d={`M 5,5.5 ${Array.from({ length: 20 }, (_, i) => {
                          const x = 10 + i * 9;
                          const y = 5.5 + Math.sin(seed + 0.3 + i * 0.5) * 2;
                          return `L ${x},${y}`;
                        }).join(' ')}`}
                        stroke={card.strokeColor}
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-gray-600 italic">
            ✨ Each card drawn with wobbly, hand-sketched borders!
          </p>
        </div>
      </div>
    </div>
  );
}