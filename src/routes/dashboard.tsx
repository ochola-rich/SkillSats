import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { useAuth } from "../hooks/use-auth";
import { satsToUsd } from "../lib/domain";
import { getErrorMessage } from "../lib/errors";
import { createVideo, listMyVideos } from "../server/videos";

type CreatorVideo = Awaited<ReturnType<typeof listMyVideos>>[number];

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Creator dashboard - SkillSats" }] }),
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const loadVideos = useServerFn(listMyVideos);
  const publishVideo = useServerFn(createVideo);
  const [videos, setVideos] = useState<CreatorVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [priceSats, setPriceSats] = useState(0);
  const [isFree, setIsFree] = useState(false);
  const [courseId, setCourseId] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [, nextVideos] = await Promise.all([refreshUser(), loadVideos()]);
      setVideos(nextVideos);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load the creator dashboard."));
    } finally {
      setLoading(false);
    }
  }, [loadVideos, refreshUser]);

  useEffect(() => {
    if (user?.role !== "CREATOR") {
      void navigate({ to: "/", replace: true });
      return;
    }
    void loadDashboard();
  }, [loadDashboard, navigate, user?.role]);

  const purchaseCount = useMemo(
    () => videos.reduce((total, video) => total + video.purchaseCount, 0),
    [videos],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await publishVideo({
        data: { title, description, url: videoUrl, priceSats, isFree, courseId },
      });
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setPriceSats(0);
      setIsFree(false);
      setCourseId("");
      setMessage("Video published.");
      await loadDashboard();
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to publish this video."));
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== "CREATOR") return <p className="text-center text-gray-400">Redirecting...</p>;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Creator balance"
          value={`${user.balanceSats.toLocaleString()} sats (~$${satsToUsd(user.balanceSats)})`}
        />
        <Stat label="Videos uploaded" value={String(videos.length)} />
        <Stat label="Settled purchases" value={String(purchaseCount)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-xl border border-white/10 bg-[#111118] p-6">
          <h2 className="text-xl font-bold">Publish a video</h2>
          {message && (
            <p className="mt-4 rounded bg-green-500/10 p-3 text-sm text-green-300">{message}</p>
          )}
          {error && <p className="mt-4 rounded bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Title">
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </Field>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                required
              />
            </Field>
            <Field label="Video URL - CDN link or local path">
              <input
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                required
              />
            </Field>
            <Field label="Course ID">
              <input
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                placeholder="course-lightning-basics"
                required
              />
            </Field>
            <Field label="Price in sats">
              <input
                type="number"
                min={isFree ? 0 : 1}
                disabled={isFree}
                value={isFree ? 0 : priceSats}
                onChange={(event) => setPriceSats(Number(event.target.value))}
                required
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(event) => setIsFree(event.target.checked)}
              />
              This is a free sample
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
            >
              {submitting ? "Publishing..." : "Publish video"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#111118] p-6">
          <h2 className="text-xl font-bold">My videos</h2>
          {loading ? (
            <p className="py-10 text-center text-gray-400">Loading videos...</p>
          ) : videos.length === 0 ? (
            <p className="py-10 text-center text-gray-400">No videos published yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-white/10">
              {videos.map((video) => (
                <div key={video.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <h3 className="font-semibold">{video.title}</h3>
                    <p className="mt-1 font-mono text-xs text-yellow-400">
                      {video.isFree ? "FREE" : `${video.priceSats} sats`}
                    </p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {video.purchaseCount} purchase{video.purchaseCount === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111118] p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-yellow-400">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-gray-300">
      {label}
      <div className="form-control mt-1">{children}</div>
    </label>
  );
}
