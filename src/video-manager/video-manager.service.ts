import { Injectable, Logger } from '@nestjs/common';
import { CreateVideoDto, UnregisterVideo, UpdateVideoDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';
import { Video, VideoDocument, VideoStatus } from '../common/schemas';
import { Model } from 'mongoose';

@Injectable()
export class VideoManagerService {
  private readonly logger = new Logger(VideoManagerService.name);

  constructor(
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  async createVideo(payload: CreateVideoDto) {
    const video = await this.videoModel.findOne({ _id: payload.id });

    if (!video) {
      this.logger.warn(`Video (${payload.id}) does not exists`);
      return;
    }

    try {
      await this.videoModel.create({
        _id: payload.id,
        creatorId: payload.creatorId,
        title: payload.title,
        description: payload.description,
        tags: payload.tags,
        visibility: payload.visibility,
        isPublishedWithPublic: false,
        status: 'Preparing',
        lengthSeconds: payload.lengthSeconds,
        createdAt: payload.createdAt,
        metrics: {
          viewsCount: 0,
          nextSyncDate: new Date(),
        },
      });
      this.logger.log(`Video (${payload.id}) is created`);
    } catch {
      this.logger.error(
        `An error occurred when creating video (${payload.id})`,
      );
    }
  }

  async updateVideo(payload: UpdateVideoDto) {
    const video = await this.videoModel.findOne({ _id: payload.id });

    if (!video) {
      this.logger.warn(`Video (${payload.id}) does not exists`);
      return;
    }

    try {
      await this.videoModel.updateOne(
        { _id: payload.id },
        {
          title: payload.title,
          description: payload.description,
          tags: payload.tags,
          thumbnailUrl: payload.thumbnailUrl,
          previewThumbnailUrl: payload.previewThumbnailUrl,
          visibility: payload.visibility,
        },
      );
      this.logger.log(`Video (${payload.id}) is updated`);
    } catch {
      this.logger.error(
        `An error occurred when updating video (${payload.id})`,
      );
    }
  }

  async unregisterVideo(payload: UnregisterVideo) {
    const video = await this.videoModel.findOne({ _id: payload.videoId });

    if (!video) {
      this.logger.warn(`Video (${payload.videoId}) does not exists`);
      return;
    }

    if (video.status === VideoStatus.Unregistered) {
      this.logger.warn(`Video (${payload.videoId}) already unregistered`);
      return;
    }

    await this.videoModel.updateOne(
      { _id: payload.videoId },
      { status: VideoStatus.Unregistered },
    );
  }
}
