import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../hooks/use-auth";
import { getErrorMessage, hasErrorCode, isLightningUnavailable } from "../lib/errors";
import { checkInvoiceStatus, purchaseVideo } from "../server/payments";
import { getVideoAccess, getVideoMeta } from "../server/videos";

type VideoMeta = Awaited<ReturnType<typeof getVideoMeta>>;
type Invoice = Awaited<ReturnType<typeof purchaseVideo>>;

export const Route = createFileRoute("/learn/$videoId")({
  component: VideoPlayerPage,
  head: () => ({ meta: [{ title: "Watch - SkillSats" }] }),
});

function VideoPlayerPage() {
  const { videoId } = Route.useParams();
  const { user } = useAuth();
  const loadMeta = useServerFn(getVideoMeta);
  const loadAccess = useServerFn(getVideoAccess);
  const createInvoice = useServerFn(purchaseVideo);
  const checkInvoice = useServerFn(checkInvoiceStatus);
  const [video, setVideo] = useState<VideoMeta | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void Promise.all([
      loadMeta({ data: { videoId } }),
      loadAccess({ data: { videoId } }).catch((caught) => {
        if (hasErrorCode(caught, "UNAUTHENTICATED")) {
          return { hasAccess: false as const, videoUrl: null };
        }
        throw caught;
      }),
    ])
      .then(([metadata, access]) => {
        if (cancelled) return;
        setVideo(metadata);
        setVideoUrl(access.hasAccess ? access.videoUrl : null);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Unable to load this video."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadAccess, loadMeta, videoId]);

  const startPolling = (rHash: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      void checkInvoice({ data: { rHash } })
        .then((status) => {
          if (!status.settled || !status.videoUrl) return;
          if (pollingRef.current) clearInterval(pollingRef.current);
          setVideoUrl(status.videoUrl);
          setPurchasing(false);
        })
        .catch((caught) => {
          if (isLightningUnavailable(caught) && pollingRef.current) {
            clearInterval(pollingRef.current);
            setPurchasing(false);
          }
          setError(
            isLightningUnavailable(caught)
              ? "Lightning payments are unavailable in this environment."
              : getErrorMessage(caught, "Could not verify payment."),
          );
        });
    }, 2_000);
  };

  const handleUnlock = async () => {
    setError("");
    setPurchasing(true);
    try {
      const nextInvoice = await createInvoice({ data: { videoId } });
      setInvoice(nextInvoice);
      startPolling(nextInvoice.r_hash);
    } catch (caught) {
      setError(
        isLightningUnavailable(caught)
          ? "Lightning payments are unavailable in this environment."
          : getErrorMessage(caught, "Could not create a Lightning invoice."),
      );
      setPurchasing(false);
    }
  };

  const copyInvoice = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice.payment_request);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  if (loading) return <p className="py-20 text-center text-gray-400">Loading video...</p>;
  if (!video) {
    return <p className="rounded-lg bg-red-500/10 p-4 text-red-300">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
        {videoUrl ? (
          <video src={videoUrl} controls autoPlay className="h-full w-full object-contain" />
        ) : !user ? (
          <div className="max-w-md p-6 text-center">
            <h2 className="text-xl font-bold">Login to unlock this video</h2>
            <p className="mt-2 text-sm text-gray-400">
              Purchases are linked to your SkillSats account.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block rounded-md bg-yellow-400 px-5 py-2 font-bold text-black"
            >
              Login
            </Link>
          </div>
        ) : !invoice ? (
          <div className="max-w-md p-6 text-center">
            <h2 className="text-xl font-bold">{video.title}</h2>
            <p className="mt-2 text-gray-400">
              Unlock for{" "}
              <span className="font-mono font-bold text-yellow-400">{video.priceSats} sats</span>
            </p>
            <button
              type="button"
              onClick={handleUnlock}
              disabled={purchasing}
              className="mt-5 rounded-md bg-yellow-400 px-5 py-2 font-bold text-black disabled:opacity-50"
            >
              {purchasing ? "Creating invoice..." : `Unlock for ${video.priceSats} sats`}
            </button>
          </div>
        ) : (
          <div className="grid w-full max-w-2xl gap-6 p-6 md:grid-cols-2">
            <div className="mx-auto rounded-lg bg-white p-3">
              <QRCodeSVG value={invoice.payment_request} size={210} />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-bold">Pay with Lightning</h2>
              <p className="mt-2 text-sm text-gray-400">
                Send {invoice.amount_sats} sats. Access opens automatically after settlement.
              </p>
              <textarea
                readOnly
                value={invoice.payment_request}
                className="mt-4 h-20 resize-none rounded border border-white/10 bg-[#111118] p-2 font-mono text-xs"
              />
              <button
                type="button"
                onClick={copyInvoice}
                className="mt-2 rounded border border-white/15 px-3 py-2 text-sm"
              >
                {copied ? "Copied" : "Copy invoice"}
              </button>
              <p className="mt-3 text-sm text-yellow-400">Waiting for payment...</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="rounded bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <section className="rounded-xl border border-white/10 bg-[#111118] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <p className="mt-1 text-sm text-gray-400">@{video.creatorUsername}</p>
          </div>
          <span className="font-mono font-bold text-yellow-400">
            {video.isFree ? "FREE" : `${video.priceSats} sats`}
          </span>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-gray-300">{video.description}</p>
      </section>
    </div>
  );
}
