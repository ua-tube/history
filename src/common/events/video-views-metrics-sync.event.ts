export class VideoViewsMetricsSyncEvent {
  videoId: string;
  viewsCount: string;
  updatedAt: Date;

  constructor(videoId: string, viewsCount: string, updatedAt: Date) {
    this.videoId = videoId;
    this.viewsCount = viewsCount;
    this.updatedAt = updatedAt;
  }
}
