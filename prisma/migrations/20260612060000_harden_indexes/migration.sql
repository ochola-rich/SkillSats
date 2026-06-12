CREATE INDEX "Video_creatorId_idx" ON "Video"("creatorId");
CREATE INDEX "Video_courseId_idx" ON "Video"("courseId");
CREATE UNIQUE INDEX "Purchase_rHash_key" ON "Purchase"("rHash");
CREATE INDEX "Purchase_userId_videoId_settled_idx" ON "Purchase"("userId", "videoId", "settled");
CREATE INDEX "AdWatch_userId_adId_watchedAt_idx" ON "AdWatch"("userId", "adId", "watchedAt");
