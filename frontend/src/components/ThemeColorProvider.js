import { useEffect, useState } from 'react';
import api from '../lib/api';

// Convert hex to HSL
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function ThemeColorProvider({ children }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load settings and apply colors
    const applyColors = (settings) => {
      if (settings?.primary_color) {
        const hsl = hexToHSL(settings.primary_color);
        const root = document.documentElement;
        
        // Set primary color CSS variable
        root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        
        // Adjust primary-foreground based on luminance
        if (hsl.l > 60) {
          root.style.setProperty('--primary-foreground', '0 0% 9%');
        } else {
          root.style.setProperty('--primary-foreground', '0 0% 98%');
        }
      }
    };

    // Try localStorage first for instant load
    const cached = localStorage.getItem('app_settings');
    if (cached) {
      try {
        applyColors(JSON.parse(cached));
      } catch (e) {}
    }

    // Then fetch from API
    api.get('/settings').then(res => {
      if (res.data) {
        applyColors(res.data);
        localStorage.setItem('app_settings', JSON.stringify(res.data));
      }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  return children;
}

export default ThemeColorProvider;
