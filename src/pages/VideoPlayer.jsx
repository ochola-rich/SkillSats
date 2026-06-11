import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import client from '../api/client';

export default function VideoPlayer() {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  
  // Paywall & Polling State
  const [loading, setLoading] = useState(true);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [rHash, setRHash] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const pollingRef = useRef(null);

  // 1. Fetch metadata and check access on load
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        // Fetch public metadata
        const metaRes = await client.get(`/api/videos/${videoId}`);
        setVideo(metaRes.data);

        // Try to fetch the stream URL (will fail if paid and not purchased)
        try {
          const accessRes = await client.get(`/api/videos/${videoId}/access`);
          setVideoUrl(accessRes.data.url);
        } catch (accessErr) {
          if (accessErr.response && accessErr.response.status === 402) {
            setNeedsPayment(true);
          }
        }
      } catch (err) {
        console.error('Error loading video', err);
      } finally {
        setLoading(false);
      }
    };

    loadVideoData();
    
    // Cleanup polling on unmount
    return () => clearInterval(pollingRef.current);
  }, [videoId]);

  // 2. Handle Purchase Button Click
  const handlePurchase = async () => {
    try {
      const { data } = await client.post(`/api/videos/${videoId}/purchase`);
      setInvoice(data.payment_request);
      setRHash(data.r_hash);
      startPolling(data.r_hash);
    } catch (err) {
      console.error('Failed to create invoice', err);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  // 3. Poll for settlement every 2 seconds
  const startPolling = (hash) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await client.get(`/api/invoices/${hash}/status`);
        if (data.settled) {
          clearInterval(pollingRef.current);
          setPaymentSuccess(true);
          
          // Show success animation briefly before loading video
          setTimeout(() => {
            setVideoUrl(data.videoUrl);
            setNeedsPayment(false);
            setPaymentSuccess(false);
          }, 2000);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);
  };

  const copyInvoice = () => {
    navigator.clipboard.writeText(invoice);
    alert('Invoice copied to clipboard!');
  };

  if (loading) return <div className="p-8 text-white">Loading video...</div>;
  if (!video) return <div className="p-8 text-white">Video not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">{video.title}</h1>
      <p className="text-gray-400 mb-6">{video.description}</p>

      <div className="relative aspect-video bg-black rounded-lg border border-gray-800 overflow-hidden flex items-center justify-center">
        
        {/* State: Video Unlocked */}
        {videoUrl && !needsPayment && (
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            className="w-full h-full object-contain"
            controlsList="nodownload"
          />
        )}

        {/* State: Payment Success Animation */}
        {paymentSuccess && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
            <span className="text-6xl mb-4 animate-bounce">⚡</span>
            <h2 className="text-2xl font-bold text-yellow-400">Payment Received!</h2>
            <p className="text-white mt-2">Unlocking video...</p>
          </div>
        )}

        {/* State: Paywall / Invoice Screen */}
        {needsPayment && !paymentSuccess && (
          <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center z-10 backdrop-blur-sm">
            
            {!invoice ? (
              // Initial Paywall CTA
              <>
                <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Premium Content</h2>
                <p className="text-gray-400 mb-6 max-w-md">
                  This video is locked. Support the creator directly via the Lightning Network to unlock it instantly.
                </p>
                <button 
                  onClick={handlePurchase}
                  className="bg-yellow-400 text-gray-950 font-bold px-6 py-3 rounded-md hover:bg-yellow-500 transition-colors flex items-center gap-2"
                >
                  ⚡ Unlock for {video.priceSats} sats
                </button>
              </>
            ) : (
              // Invoice Display
              <div className="bg-white p-6 rounded-xl flex flex-col items-center max-w-sm w-full">
                <QRCodeSVG 
                  value={invoice} 
                  size={200}
                  level="M"
                  includeMargin={true}
                />
                
                <div className="mt-4 w-full">
                  <p className="text-gray-950 font-bold mb-2 text-center">Pay {video.priceSats} sats</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={invoice} 
                      className="w-full bg-gray-100 text-gray-600 text-xs p-2 rounded border border-gray-300 outline-none"
                    />
                    <button 
                      onClick={copyInvoice}
                      className="bg-gray-900 text-white text-xs px-3 py-2 rounded hover:bg-gray-800 transition-colors font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-yellow-400 rounded-full animate-spin"></div>
                  Waiting for payment...
                </div>
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
}