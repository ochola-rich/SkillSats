import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "../context/auth";
import { getBalance } from "../server/wallet";
import { listMyVideos, createVideo } from "../server/videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && (!user || user.role !== "CREATOR")) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoUrl: "",
    priceSats: 0,
    isFree: false,
    courseId: "",
  });

  const { data: balanceData } = useQuery({
    queryKey: ["balance"],
    queryFn: () => getBalance(),
  });

  const { data: myVideos, isLoading: loadingVideos } = useQuery({
    queryKey: ["myVideos"],
    queryFn: () => listMyVideos(),
  });

  const uploadMutation = useMutation({
    mutationFn: (data: typeof formData) => createVideo({ data }),
    onSuccess: () => {
      toast.success("Video published!");
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      setFormData({
        title: "",
        description: "",
        videoUrl: "",
        priceSats: 0,
        isFree: false,
        courseId: "",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to publish video: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate(formData);
  };

  if (loading || !user || user.role !== "CREATOR") {
    return null;
  }

  const totalSettledPurchases = myVideos?.reduce((sum, v) => sum + v.purchaseCount, 0) || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Creator Dashboard</h1>
          <p className="text-gray-400">Manage your content and track your earnings.</p>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#111118] border border-white/10 rounded-xl p-6">
            <p className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-semibold">Total Balance</p>
            <h2 className="text-3xl font-bold text-yellow-500 mb-1">⚡ {balanceData?.balanceSats.toLocaleString()} sats</h2>
            <p className="text-gray-400 text-sm">~${balanceData?.approximateUSD} USD</p>
          </div>
          <div className="bg-[#111118] border border-white/10 rounded-xl p-6">
            <p className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-semibold">Videos Uploaded</p>
            <h2 className="text-3xl font-bold text-white">{myVideos?.length || 0}</h2>
            <p className="text-gray-400 text-sm">Active lessons</p>
          </div>
          <div className="bg-[#111118] border border-white/10 rounded-xl p-6">
            <p className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-semibold">Total Purchases</p>
            <h2 className="text-3xl font-bold text-white">{totalSettledPurchases}</h2>
            <p className="text-gray-400 text-sm">Settled transactions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Upload Form */}
          <section>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">add_circle</span>
              Upload New Video
            </h3>
            <form onSubmit={handleSubmit} className="bg-[#111118] border border-white/10 rounded-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Video Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Intro to BOLT11"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-[#0a0a0f] border-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will students learn?"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-[#0a0a0f] border-white/5 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  placeholder="Paste a CDN link or local path"
                  required
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="bg-[#0a0a0f] border-white/5"
                />
                <p className="text-[10px] text-gray-500 italic">For the hackathon, use a direct .mp4 link.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Sats)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    disabled={formData.isFree}
                    required={!formData.isFree}
                    value={formData.priceSats}
                    onChange={(e) => setFormData({ ...formData, priceSats: parseInt(e.target.value) || 0 })}
                    className="bg-[#0a0a0f] border-white/5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseId">Course ID</Label>
                  <Input
                    id="courseId"
                    placeholder="e.g. course-lightning-basics"
                    required
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="bg-[#0a0a0f] border-white/5"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="isFree"
                  checked={formData.isFree}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFree: checked as boolean })}
                />
                <Label htmlFor="isFree" className="cursor-pointer">This is the free sample for the course</Label>
              </div>
              <Button
                type="submit"
                disabled={uploadMutation.isPending}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-6 rounded-xl"
              >
                {uploadMutation.isPending ? "Publishing..." : "Publish Video"}
              </Button>
            </form>
          </section>

          {/* Video List */}
          <section>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">list_alt</span>
              My Published Content
            </h3>
            <div className="bg-[#111118] border border-white/10 rounded-xl overflow-hidden">
              {loadingVideos ? (
                <div className="p-10 text-center animate-pulse text-gray-500 text-sm font-mono tracking-widest">LOADING CONTENT...</div>
              ) : myVideos?.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500 mb-2">No videos published yet.</p>
                  <p className="text-sm text-gray-600 italic">Your students are waiting!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {myVideos?.map((video) => (
                    <div key={video.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="max-w-[60%]">
                        <h4 className="font-bold text-white truncate">{video.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {video.isFree ? (
                            <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">FREE</span>
                          ) : (
                            <span className="text-yellow-500 font-mono text-xs">⚡ {video.priceSats} sats</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{video.purchaseCount}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Settled Purchases</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
