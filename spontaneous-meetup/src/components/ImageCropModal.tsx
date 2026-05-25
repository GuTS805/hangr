"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  file: File;
  aspectRatio: number; // width / height  (1 = avatar, 2.5 = cover)
  shape: "circle" | "rect";
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ file, aspectRatio, shape, onConfirm, onCancel }: Props) {
  const [imgSrc, setImgSrc] = useState("");
  const [ready, setReady]   = useState(false);
  // forceRender trick — refs drive layout, state drives re-render
  const [tick, setTick] = useState(0);
  const redraw = () => setTick((n) => n + 1);

  // Viewport + frame geometry (set once on mount)
  const vw  = useRef(0);
  const vh  = useRef(0);
  const fw  = useRef(0); // frame width
  const fh  = useRef(0); // frame height

  // Image state (refs to avoid stale closures in pointer handlers)
  const natW     = useRef(0);
  const natH     = useRef(0);
  const scale    = useRef(1);
  const minScale = useRef(1);
  const ox       = useRef(0); // offset of image centre from viewport centre
  const oy       = useRef(0);

  // Pointer tracking
  const ptrs       = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist  = useRef<number | null>(null);
  const dragAnchor = useRef({ ox: 0, oy: 0, cx: 0, cy: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    vw.current = window.innerWidth;
    vh.current = window.innerHeight;
    if (shape === "circle") {
      const d = Math.min(vw.current * 0.82, vh.current * 0.52);
      fw.current = d;
      fh.current = d;
    } else {
      fw.current = vw.current * 0.9;
      fh.current = fw.current / aspectRatio;
    }
    setReady(true);
  }, [shape, aspectRatio]);

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    natW.current = e.currentTarget.naturalWidth;
    natH.current = e.currentTarget.naturalHeight;
    const min = Math.max(fw.current / natW.current, fh.current / natH.current);
    minScale.current = min;
    scale.current    = min;
    ox.current       = 0;
    oy.current       = 0;
    redraw();
  }

  function clamp(newOx: number, newOy: number, s: number) {
    const iw = natW.current * s;
    const ih = natH.current * s;
    const mox = Math.max(0, (iw - fw.current) / 2);
    const moy = Math.max(0, (ih - fh.current) / 2);
    return {
      ox: Math.max(-mox, Math.min(mox, newOx)),
      oy: Math.max(-moy, Math.min(moy, newOy)),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.current.size === 1) {
      dragAnchor.current = { ox: ox.current, oy: oy.current, cx: e.clientX, cy: e.clientY };
    }
    if (ptrs.current.size === 2) {
      const [a, b] = Array.from(ptrs.current.values());
      pinchDist.current = Math.hypot(b.x - a.x, b.y - a.y);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.current.size === 2) {
      const [a, b] = Array.from(ptrs.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (pinchDist.current != null && pinchDist.current > 0) {
        const next = Math.max(minScale.current, Math.min(scale.current * (dist / pinchDist.current), minScale.current * 6));
        const c = clamp(ox.current, oy.current, next);
        scale.current = next;
        ox.current = c.ox;
        oy.current = c.oy;
        redraw();
      }
      pinchDist.current = dist;
      return;
    }

    if (ptrs.current.size === 1) {
      const dx = e.clientX - dragAnchor.current.cx;
      const dy = e.clientY - dragAnchor.current.cy;
      const c = clamp(dragAnchor.current.ox + dx, dragAnchor.current.oy + dy, scale.current);
      ox.current = c.ox;
      oy.current = c.oy;
      redraw();
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    ptrs.current.delete(e.pointerId);
    pinchDist.current = null;
    if (ptrs.current.size === 1) {
      const [ptr] = Array.from(ptrs.current.values());
      dragAnchor.current = { ox: ox.current, oy: oy.current, cx: ptr.x, cy: ptr.y };
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.max(minScale.current, Math.min(scale.current * (1 - e.deltaY * 0.001), minScale.current * 6));
    const c = clamp(ox.current, oy.current, next);
    scale.current = next;
    ox.current = c.ox;
    oy.current = c.oy;
    redraw();
  }

  function confirm() {
    const s  = scale.current;
    const outW = Math.min(Math.round(fw.current * 2), shape === "circle" ? 600 : 1200);
    const outH = Math.round(outW / aspectRatio);
    const canvas = document.createElement("canvas");
    canvas.width  = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    // Frame top-left relative to viewport
    const frameLeft = vw.current / 2 - fw.current / 2;
    const frameTop  = vh.current / 2 - fh.current / 2;
    // Image top-left relative to viewport
    const imgLeft = vw.current / 2 + ox.current - (natW.current * s) / 2;
    const imgTop  = vh.current / 2 + oy.current - (natH.current * s) / 2;
    // Crop region in source image pixels
    const cropX = (frameLeft - imgLeft) / s;
    const cropY = (frameTop  - imgTop)  / s;
    const cropW = fw.current / s;
    const cropH = fh.current / s;

    const img = new Image();
    img.onload = () => {
      if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(outW / 2, outH / 2, outW / 2, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
      onConfirm(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = imgSrc;
  }

  if (!ready) return null;

  const s  = scale.current;
  const iw = natW.current * s;
  const ih = natH.current * s;
  const W  = vw.current;
  const H  = vh.current;
  const FW = fw.current;
  const FH = fh.current;
  const imgLeft  = W / 2 + ox.current - iw / 2;
  const imgTop   = H / 2 + oy.current - ih / 2;
  const frameLeft = W / 2 - FW / 2;
  const frameTop  = H / 2 - FH / 2;
  void tick; // consumed by redraw() calls

  return (
    <div className="fixed inset-0 z-50 bg-black" style={{ touchAction: "none" }}>

      {/* Draggable image layer */}
      <div
        className="absolute inset-0"
        style={{ cursor: "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {imgSrc && (
          <img
            src={imgSrc}
            alt=""
            draggable={false}
            onLoad={onImgLoad}
            style={{
              position: "absolute",
              left: imgLeft,
              top: imgTop,
              width: iw || undefined,
              height: ih || undefined,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Dark overlay with crop cutout */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={W}
        height={H}
      >
        <defs>
          <mask id="crop-mask">
            <rect width={W} height={H} fill="white" />
            {shape === "circle" ? (
              <circle cx={W / 2} cy={H / 2} r={FW / 2} fill="black" />
            ) : (
              <rect x={frameLeft} y={frameTop} width={FW} height={FH} rx={6} fill="black" />
            )}
          </mask>
        </defs>
        <rect width={W} height={H} fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />

        {/* Crop border */}
        {shape === "circle" ? (
          <circle cx={W / 2} cy={H / 2} r={FW / 2} fill="none" stroke="white" strokeWidth="2" />
        ) : (
          <rect x={frameLeft} y={frameTop} width={FW} height={FH} rx={6} fill="none" stroke="white" strokeWidth="2" />
        )}

        {/* Rule-of-thirds grid */}
        {[1, 2].map((n) => (
          <g key={n}>
            <line x1={frameLeft + FW * n / 3} y1={frameTop} x2={frameLeft + FW * n / 3} y2={frameTop + FH} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <line x1={frameLeft} y1={frameTop + FH * n / 3} x2={frameLeft + FW} y2={frameTop + FH * n / 3} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
          </g>
        ))}
      </svg>

      {/* Top label */}
      <div className="absolute top-0 inset-x-0 flex justify-center pt-14 pointer-events-none">
        <span className="text-white/50 text-xs tracking-wide">Move and scale</span>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-10 pb-14 pt-8 bg-gradient-to-t from-black/60 to-transparent">
        <button
          onClick={onCancel}
          className="text-white text-base font-medium tracking-wide active:opacity-60 transition-opacity"
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          className="w-16 h-16 rounded-full bg-white/15 border-2 border-white flex items-center justify-center active:scale-95 transition-transform backdrop-blur-sm"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

    </div>
  );
}
