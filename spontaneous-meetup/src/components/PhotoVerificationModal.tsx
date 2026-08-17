"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { loadFaceModels, getFaceDescriptor, loadImage, faceDistance, FACE_MATCH_THRESHOLD } from "@/lib/faceVerify";

interface Props {
  onClose: () => void;
}

type Step = "no-photo" | "intro" | "camera" | "processing" | "success" | "fail" | "camera-error";

const POSE_PROMPTS = [
  { emoji: "✌️", text: "Peace sign + big smile" },
  { emoji: "😊", text: "Just smile at the camera" },
  { emoji: "🤚", text: "Show your palm" },
  { emoji: "😉", text: "Give the camera a wink" },
  { emoji: "👉", text: "Point at yourself" },
];

function hasRealPhoto(avatar: string | undefined) {
  return !!avatar && (avatar.startsWith("http") || avatar.startsWith("data:"));
}

export default function PhotoVerificationModal({ onClose }: Props) {
  const { currentUser, verifyPhoto } = useStore();

  const [pose] = useState(() => POSE_PROMPTS[Math.floor(Math.random() * POSE_PROMPTS.length)]);
  const [step, setStep] = useState<Step>(() => (hasRealPhoto(currentUser?.avatar) ? "intro" : "no-photo"));
  const [failReason, setFailReason] = useState("");

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadFaceModels(); // warm up in the background while the user reads the prompt
    return () => stopCamera();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setStep("camera");
      // video element only exists once we're in the "camera" step
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      setStep("camera-error");
    }
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !currentUser) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // mirror so the saved selfie matches what the user saw on screen
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    stopCamera();
    setStep("processing");

    try {
      await loadFaceModels();
      const [selfieDescriptor, refDescriptor] = await Promise.all([
        getFaceDescriptor(canvas),
        loadImage(currentUser.avatar).then(getFaceDescriptor),
      ]);

      if (!selfieDescriptor) {
        setFailReason("Koi face detect nahi hua — achi lighting mein, camera ke saamne seedha dekh ke try karo.");
        setStep("fail");
        return;
      }
      if (!refDescriptor) {
        setFailReason("Tumhari profile photo mein face clearly detect nahi ho paaya. Pehle ek clear profile photo laga lo.");
        setStep("fail");
        return;
      }

      const distance = faceDistance(selfieDescriptor, refDescriptor);
      if (distance <= FACE_MATCH_THRESHOLD) {
        await verifyPhoto(canvas.toDataURL("image/jpeg", 0.9));
        setStep("success");
      } else {
        setFailReason("Selfie tumhari profile photo se match nahi hui. Same person, better lighting mein try karo.");
        setStep("fail");
      }
    } catch {
      setFailReason("Kuch gadbad ho gayi. Phir se try karo.");
      setStep("fail");
    }
  }

  function retry() {
    setFailReason("");
    setStep("intro");
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm border-2 border-black bg-white shadow-[6px_6px_0_#0A0A0A] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-black">Photo Verification</h2>
          <button onClick={onClose} className="text-black/40 hover:text-black text-2xl leading-none cursor-pointer">×</button>
        </div>

        {step === "no-photo" && (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">📷</p>
            <p className="text-sm font-mono text-black/60 mb-5">
              Verify karne ke liye pehle ek clear profile photo lagao (Edit Profile se) — usी se tumhari live selfie match hogi.
            </p>
            <button onClick={onClose} className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase py-3 shadow-[3px_3px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
              Got it
            </button>
          </div>
        )}

        {step === "intro" && (
          <div className="text-center py-2">
            <p className="text-5xl mb-3">{pose.emoji}</p>
            <p className="text-sm font-black uppercase text-black mb-1">{pose.text}</p>
            <p className="text-xs font-mono text-black/50 mb-5 uppercase">
              Live selfie lenge aur tumhari profile photo se match karenge
            </p>
            <button onClick={startCamera} className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase py-3 shadow-[3px_3px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
              Start Camera
            </button>
          </div>
        )}

        {step === "camera" && (
          <div>
            <div className="relative border-2 border-black overflow-hidden mb-3" style={{ aspectRatio: "1/1" }}>
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] h-[85%] border-2 border-dashed border-[#FFE500] rounded-full" />
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="bg-black text-[#FFE500] text-xs font-black uppercase px-2 py-1">
                  {pose.emoji} {pose.text}
                </span>
              </div>
            </div>
            <button onClick={capture} className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase py-3 shadow-[3px_3px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
              Capture
            </button>
          </div>
        )}

        {step === "processing" && (
          <div className="text-center py-8">
            <p className="text-sm font-mono text-black/50 uppercase animate-pulse">Matching face…</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">✓</p>
            <h3 className="text-lg font-black uppercase text-black mb-2">Verified!</h3>
            <p className="text-sm font-mono text-black/60 mb-5">Tumhare profile pe ab Photo Verified badge dikhega.</p>
            <button onClick={onClose} className="w-full bg-black text-[#FFE500] border-2 border-black font-black uppercase py-3 shadow-[3px_3px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
              Done
            </button>
          </div>
        )}

        {step === "fail" && (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">✗</p>
            <p className="text-sm font-mono text-black/60 mb-5">{failReason}</p>
            <button onClick={retry} className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase py-3 shadow-[3px_3px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
              Try Again
            </button>
          </div>
        )}

        {step === "camera-error" && (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🚫</p>
            <p className="text-sm font-mono text-black/60 mb-5">
              Camera access nahi mila. Browser settings mein camera permission on karke phir try karo.
            </p>
            <button onClick={retry} className="w-full bg-[#FFE500] border-2 border-black text-black font-black uppercase py-3 shadow-[3px_3px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
              Try Again
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
