"use client";

import dynamic from "next/dynamic";
import type { Props, CustomPin } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-400"
      style={{ height: "460px" }}
    >
      <div className="w-9 h-9 rounded-full border-[3px] border-slate-300 border-t-blue-500 animate-spin" />
      <p className="text-sm font-medium text-slate-500">Loading map…</p>
    </div>
  ),
});

export default MapView;
export type { Props, CustomPin };
