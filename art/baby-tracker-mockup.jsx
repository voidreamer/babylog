import React, { useState } from 'react';
import { Milk, Baby, Moon, Droplet, Sun, Bath, Plus } from 'lucide-react';

export default function BabyTrackerApp() {
  // Load cute fonts - Neucha + Patrick Hand
  React.useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Neucha&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);
  const [currentTime] = useState(new Date());

  // Generate a subtle wobbly path
  const generateSketchyPath = (width, height, seed) => {
    const roughness = 1.5;
    const points = 60;
    let path = 'M ';
    
    const wobble = (base, index) => {
      return base + Math.sin(seed + index * 0.4) * roughness + Math.cos(seed * 1.2 + index * 0.6) * roughness * 0.4;
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

  const activities = [
    {
      id: 1,
      type: "FEEDING",
      icon: Milk,
      time: "1h 2m ago",
      timestamp: "11:29 AM",
      detail: "formula",
      color: "#d97706",
      bgColor: "from-orange-50 to-amber-50",
      lightBg: "bg-orange-50"
    },
    {
      id: 2,
      type: "DIAPER",
      icon: Baby,
      time: "1h 28m ago",
      timestamp: "11:03 AM",
      detail: "poo",
      color: "#059669",
      bgColor: "from-emerald-50 to-teal-50",
      lightBg: "bg-emerald-50"
    },
    {
      id: 3,
      type: "SLEEPING",
      icon: Moon,
      time: "20m ago",
      timestamp: "Since 12:11 PM",
      detail: "Currently sleeping 💤",
      color: "#4f46e5",
      bgColor: "from-indigo-50 to-blue-50",
      lightBg: "bg-indigo-50"
    },
    {
      id: 4,
      type: "PUMPING",
      icon: Droplet,
      time: "10h 9m ago",
      timestamp: "2:21 AM",
      detail: "30ml",
      color: "#db2777",
      bgColor: "from-pink-50 to-rose-50",
      lightBg: "bg-pink-50"
    },
    {
      id: 5,
      type: "TUMMY TIME",
      icon: Sun,
      time: "1h 26m ago",
      timestamp: "11:04 AM",
      detail: "5min",
      color: "#ca8a04",
      bgColor: "from-yellow-50 to-amber-50",
      lightBg: "bg-yellow-50"
    },
    {
      id: 6,
      type: "BATH",
      icon: Bath,
      time: null,
      timestamp: "Tap to log",
      detail: null,
      color: "#0891b2",
      bgColor: "from-cyan-50 to-blue-50",
      lightBg: "bg-cyan-50"
    }
  ];

  const SketchyCard = ({ activity, index, isEmpty = false }) => {
    const Icon = activity.icon;
    const seed = index * 7.3;
    const cardWidth = 280;
    const cardHeight = isEmpty ? 240 : 280;

    return (
      <div
        className="relative group cursor-pointer transform hover:scale-105 transition-all duration-300"
        style={{
          transform: `rotate(${(index % 2 === 0 ? 1 : -1) * 0.5}deg)`,
          width: `${cardWidth}px`,
          height: `${cardHeight}px`
        }}
      >
        {/* Subtle shadow */}
        <svg
          className="absolute inset-0 opacity-15"
          style={{ transform: 'translate(4px, 4px)' }}
          viewBox={`0 0 ${cardWidth} ${cardHeight}`}
        >
          <path
            d={generateSketchyPath(cardWidth, cardHeight, seed + 0.3)}
            fill={activity.color}
            opacity="0.2"
          />
        </svg>
        
        {/* Main card */}
        <div className="absolute inset-0">
          <svg
            className="absolute inset-0 pointer-events-none"
            viewBox={`0 0 ${cardWidth} ${cardHeight}`}
          >
            <defs>
              {/* Define clip path for this card */}
              <clipPath id={`card-clip-${activity.id}`}>
                <path d={generateSketchyPath(cardWidth, cardHeight, seed)} />
              </clipPath>
            </defs>
            
            {/* Background */}
            <path
              d={generateSketchyPath(cardWidth, cardHeight, seed)}
              fill="white"
            />
            
            {/* Sketchy border */}
            <path
              d={generateSketchyPath(cardWidth, cardHeight, seed)}
              fill="none"
              stroke={activity.color}
              strokeWidth="1.8"
              opacity="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            <path
              d={generateSketchyPath(cardWidth, cardHeight, seed + 0.05)}
              fill="none"
              stroke={activity.color}
              strokeWidth="1.2"
              opacity="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* Content with clipping */}
          <div 
            className="absolute inset-0 p-7 flex flex-col" 
            style={{ clipPath: `url(#card-clip-${activity.id})` }}
          >
            {/* Header with icon and type */}
            <div className="flex items-center gap-3 mb-5">
              <div 
                className={`p-2.5 rounded-xl bg-gradient-to-br ${activity.bgColor}`}
                style={{ opacity: 0.6 }}
              >
                <Icon className="w-6 h-6" style={{ color: activity.color }} />
              </div>
              <span 
                className="text-sm font-semibold tracking-wide" 
                style={{ 
                  color: activity.color, 
                  fontFamily: "'Neucha', cursive", 
                  fontSize: '17px', 
                  fontWeight: 700 
                }}
              >
                {activity.type}
              </span>
              {!isEmpty && (
                <button className="ml-auto p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
            
            {/* Time info */}
            {isEmpty ? (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-gray-600 text-base" style={{ fontFamily: "'Patrick Hand', cursive", fontSize: '19px' }}>{activity.timestamp}</p>
              </div>
            ) : (
              <>
                <h2 
                  className="text-3xl font-bold mb-3" 
                  style={{ 
                    color: activity.color, 
                    fontFamily: "'Neucha', cursive", 
                    fontSize: '48px', 
                    fontWeight: 700, 
                    lineHeight: '1.1' 
                  }}
                >
                  {activity.time}
                </h2>
                <p 
                  className="text-sm mb-2" 
                  style={{ 
                    fontFamily: "'Patrick Hand', cursive", 
                    fontSize: '17px', 
                    color: '#6b7280', 
                    lineHeight: '1.4' 
                  }}
                >
                  {activity.timestamp}
                </p>
                <p 
                  className="text-base" 
                  style={{ 
                    fontFamily: "'Patrick Hand', cursive", 
                    fontSize: '19px', 
                    color: '#4b5563', 
                    fontWeight: 400, 
                    lineHeight: '1.5' 
                  }}
                >
                  {activity.detail}
                </p>
                
                {/* Decorative icon watermark */}
                <div className="mt-auto flex justify-end opacity-10">
                  <Icon className="w-24 h-24" style={{ color: activity.color }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 p-8" style={{ fontFamily: "'Patrick Hand', cursive" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-3xl p-7 shadow-lg">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">☀️</span>
            <h1 className="text-xl font-semibold" style={{ fontFamily: "'Neucha', cursive", fontSize: '30px', color: '#374151' }}>Good afternoon!</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-300 to-emerald-400 flex items-center justify-center">
              <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Neucha', cursive" }}>I</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold" style={{ fontFamily: "'Neucha', cursive", fontSize: '38px', fontWeight: 700, color: '#1f2937' }}>Inna</h2>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p style={{ fontFamily: "'Patrick Hand', cursive", fontSize: '17px', color: '#6b7280', marginTop: '2px' }}>2 weeks old</p>
            </div>
          </div>
          
          <div className="mt-5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-purple-500">✨</span>
              <p className="text-purple-700 font-medium" style={{ fontFamily: "'Neucha', cursive", fontSize: '18px', fontWeight: 600 }}>Super parent! Keep it up!</p>
            </div>
          </div>
        </div>
        
        {/* Activity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {activities.map((activity, index) => (
            <SketchyCard 
              key={activity.id} 
              activity={activity} 
              index={index}
              isEmpty={activity.time === null}
            />
          ))}
        </div>

        {/* Edit Activities Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-white border-2 border-dashed border-purple-300 rounded-3xl p-7 text-center hover:border-purple-400 transition-colors cursor-pointer">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mb-3">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="mb-1" style={{ fontFamily: "'Neucha', cursive", fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>Edit Activities</h3>
            <p style={{ fontFamily: "'Patrick Hand', cursive", fontSize: '17px', color: '#6b7280' }}>1 hidden</p>
          </div>
        </div>
      </div>
    </div>
  );
}