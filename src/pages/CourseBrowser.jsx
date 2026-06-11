import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function CourseBrowser() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data } = await client.get('/api/videos');
        setVideos(data);
      } catch (error) {
        console.error('Failed to fetch videos', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) return <div className="p-8 text-white">Loading courses...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Explore Courses</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Link 
            key={video.id} 
            to={`/learn/${video.id}`}
            className="block bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-yellow-400/50 transition-colors"
          >
            {/* Thumbnail Placeholder */}
            <div className="aspect-video bg-gray-800 flex items-center justify-center">
              <span className="text-4xl">⚡</span>
            </div>
            
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-1 truncate">{video.title}</h2>
              <p className="text-sm text-gray-400 mb-3">by @{video.creatorUsername || 'creator'}</p>
              
              <div className="flex items-center justify-between">
                {video.isFree ? (
                  <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded">FREE</span>
                ) : (
                  <span className="text-yellow-400 font-medium text-sm flex items-center gap-1">
                    ⚡ {video.priceSats} sats
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}