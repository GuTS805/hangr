"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

interface Props {
  toUserId: string;
  toUserName: string;
  groupId: string;
  onClose: () => void;
}

export default function ReviewModal({ toUserId, toUserName, groupId, onClose }: Props) {
  const { submitReview } = useStore();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (rating === 0) return;
    submitReview(toUserId, groupId, rating, comment.trim());
    setSubmitted(true);
  }

  const labels = ["", "Poor", "Okay", "Good", "Great", "Excellent"];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        {submitted ? (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">⭐</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Review submitted!</h3>
            <p className="text-sm text-gray-500 mb-5">
              Your review helps build trust in the community.
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
              <h2 className="text-lg font-bold text-gray-900">Rate Meetup</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">
                ×
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              How was your experience with{" "}
              <span className="font-semibold text-gray-800">{toUserName}</span>?
            </p>

            {/* Star rating */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  <span className={star <= (hovered || rating) ? "text-amber-400" : "text-gray-200"}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <p className="text-center text-sm font-semibold text-amber-500 mb-4">
                {labels[hovered || rating]}
              </p>
            )}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              Submit Review
            </button>
          </>
        )}
      </div>
    </div>
  );
}
