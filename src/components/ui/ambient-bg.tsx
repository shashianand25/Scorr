"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
}

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    // Colors for particles
    const colors = [
      "rgba(0, 229, 160, OPACITY)",
      "rgba(168, 85, 247, OPACITY)",
      "rgba(59, 130, 246, OPACITY)",
      "rgba(0, 200, 255, OPACITY)",
    ];

    // Create particles
    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    // Create ambient blobs
    const blobs: Blob[] = [
      {
        x: width * 0.15,
        y: height * 0.2,
        vx: 0.15,
        vy: 0.1,
        radius: Math.min(width, height) * 0.35,
        color: "0, 229, 160",
        opacity: 0.06,
      },
      {
        x: width * 0.85,
        y: height * 0.7,
        vx: -0.12,
        vy: -0.08,
        radius: Math.min(width, height) * 0.3,
        color: "168, 85, 247",
        opacity: 0.05,
      },
      {
        x: width * 0.5,
        y: height * 0.5,
        vx: 0.08,
        vy: 0.15,
        radius: Math.min(width, height) * 0.25,
        color: "59, 130, 246",
        opacity: 0.04,
      },
    ];

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / width,
        y: e.clientY / height,
      };
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    let _frame = 0;

    function draw() {
      if (!ctx) return;
      _frame++;

      ctx.clearRect(0, 0, width, height);

      // Draw ambient blobs
      blobs.forEach((blob) => {
        // Move blob slowly
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Bounce off edges softly
        if (blob.x < -blob.radius * 0.5) blob.vx *= -1;
        if (blob.x > width + blob.radius * 0.5) blob.vx *= -1;
        if (blob.y < -blob.radius * 0.5) blob.vy *= -1;
        if (blob.y > height + blob.radius * 0.5) blob.vy *= -1;

        // Mouse influence (very subtle)
        const dx = mouseRef.current.x * width - blob.x;
        const dy = mouseRef.current.y * height - blob.y;
        blob.x += dx * 0.0002;
        blob.y += dy * 0.0002;

        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        gradient.addColorStop(0, `rgba(${blob.color}, ${blob.opacity})`);
        gradient.addColorStop(1, `rgba(${blob.color}, 0)`);

        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Draw cursor glow
      const cx = mouseRef.current.x * width;
      const cy = mouseRef.current.y * height;
      const cursorGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      cursorGradient.addColorStop(0, "rgba(0, 229, 160, 0.04)");
      cursorGradient.addColorStop(1, "rgba(0, 229, 160, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 200, 0, Math.PI * 2);
      ctx.fillStyle = cursorGradient;
      ctx.fill();

      // Draw and connect particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle dot
        const colorStr = p.color.replace("OPACITY", p.opacity.toString());
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = colorStr;
        ctx.fill();

        // Connect nearby particles with lines
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dist = Math.hypot(p.x - other.x, p.y - other.y);
          if (dist < 120) {
            const lineOpacity = (1 - dist / 120) * 0.08;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 229, 160, ${lineOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.9 }}
      aria-hidden="true"
    />
  );
}
