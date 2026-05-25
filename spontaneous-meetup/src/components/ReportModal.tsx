"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { ReportReason } from "@/types";
import { REPORT_REASONS } from "@/lib/mock-data";

interface Props {
  targetId: string;
  targetName: string;
  targetType: "user" | "group";
  onClose: () => void;
}

export default function ReportModal({ targetId, targetName, targetType, onClose }: Props) {
  const { reportUser, reportGroup, blockUser } = useStore();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [blockToo, setBlockToo] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!reason) return;
    if (targetType === "user") {
      reportUser(targetId, reason);
      if (blockToo) blockUser(targetId);
    } else {
      reportGroup(targetId, reason);
    }
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mobile-sheet mobile-sheet-bottom bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm shadow-xl">
        {submitted ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🛡️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Report submitted</h3>
            <p className="text-sm text-gray-500 mb-5">
              Thanks for keeping hangr safe. We&apos;ll review this shortly.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Report {targetType === "user" ? "User" : "Group"}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">
                ×
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Reporting{" "}
              <span className="font-semibold text-gray-800">{targetName}</span>
            </p>

            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    reason === r
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-red-500"
                  />
                  <span className="text-sm font-medium text-gray-800">{r}</span>
                </label>
              ))}
            </div>

            {targetType === "user" && (
              <label className="flex items-center gap-2.5 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockToo}
                  onChange={(e) => setBlockToo(e.target.checked)}
                  className="w-4 h-4 accent-gray-700 rounded"
                />
                <span className="text-sm text-gray-700">
                  Also block this user
                </span>
              </label>
            )}

            <button
              onClick={handleSubmit}
              disabled={!reason}
              className="w-full bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-40"
            >
              Submit Report
            </button>
          </>
        )}
      </div>
    </div>
  );
}
