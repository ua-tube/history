import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Promise } from 'mongoose';
import { Video, VideoDocument } from '../common/schemas';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class HistoryScheduler {
  private readonly logger = new Logger(HistoryScheduler.name);

  constructor(
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async executeAsync() {
    const runId = randomUUID();
    this.logger.log(`[${runId}] Running metrics sync...`);
    const videos = await this.videoModel
      .find(
        {
          'metrics.nextSyncDate': {
            $ne: null,
            $lt: Date.now(),
          },
        },
        { _id: 1 },
      )
      .limit(250)
      .exec();

    this.logger.log(`[${runId}] Found ${videos.length} videos to sync`);
    if (videos.length > 0) {
      await this.videoModel.updateMany(
        {
          _id: { $in: videos.map((x) => x._id) },
        },
        { 'metrics.nextSyncDate': null },
      );

      const promises: Promise<any>[] = [];
      for (const video of videos) {
        promises.push(
          new Promise(async (resolve: any) => {
            const value = await this.redis.getdel(
              `history:video_views_${video._id}`,
            );
            await this.videoModel.updateOne(
              { _id: video._id },
              { 'metrics.nextSyncDate': Number(value) },
            );
            resolve();
          }),
        );
      }
      await Promise.all(promises);
    }
    this.logger.log(`[${runId}] Metrics sync finished`);
  }
}
