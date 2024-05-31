import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from '../common/schemas';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import {
  LIBRARY_SVC,
  SEARCH_SVC,
  VIDEO_MANAGER_SVC,
  VIDEO_STORE_SVC,
} from '../common/constants';
import { ClientRMQ } from '@nestjs/microservices';
import { VideoViewsMetricsSyncEvent } from '../common/events';
import { isNotEmpty } from 'class-validator';

@Injectable()
export class HistoryScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(HistoryScheduler.name);
  private readonly clients = [
    { client: this.libraryClient, name: LIBRARY_SVC },
    { client: this.searchClient, name: SEARCH_SVC },
    { client: this.videoManagerClient, name: VIDEO_MANAGER_SVC },
    { client: this.videoStoreClient, name: VIDEO_STORE_SVC },
  ];

  constructor(
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectRedis()
    private readonly redis: Redis,
    @Inject(LIBRARY_SVC)
    private readonly libraryClient: ClientRMQ,
    @Inject(SEARCH_SVC)
    private readonly searchClient: ClientRMQ,
    @Inject(VIDEO_MANAGER_SVC)
    private readonly videoManagerClient: ClientRMQ,
    @Inject(VIDEO_STORE_SVC)
    private readonly videoStoreClient: ClientRMQ,
  ) {}

  onApplicationBootstrap(): void {
    this.clients.forEach(({ client, name }) => {
      client
        .connect()
        .then(() => this.logger.log(`${name} connection established`))
        .catch(() => this.logger.error(`${name} connection failed`));
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async executeAsync() {
    const filter = {
      'metrics.nextSyncDate': {
        $ne: null,
        $lt: Date.now(),
      },
    };

    const videosCountToSync = await this.videoModel.countDocuments(filter);

    if (videosCountToSync === 0) return;

    const runId = randomUUID();
    this.logger.log(`[${runId}] Found ${videosCountToSync} videos to sync`);
    this.logger.log(`[${runId}] Running metrics sync...`);

    const updates = [];
    const perPage = 250;

    for (let page = 0; page < videosCountToSync; page += perPage) {
      const videos = await this.videoModel.find(filter).limit(perPage);

      if (videos.length === 0) continue;

      updates.push(
        new Promise(async (resolve, reject) => {
          try {
            await this.videoModel.updateMany(
              {
                _id: { $in: videos.map((x) => x._id) },
              },
              { 'metrics.nextSyncDate': null },
            );
          } catch (e) {
            reject(e);
          }

          this.logger.log(`[${runId}] Next sync date reset done`);

          const viewCountChanges = videos.map((v) => ({
            id: v._id,
            viewsCountChange: this.redis.getdel(`history:video_views_${v._id}`),
          }));

          const metricsUpdates = [];
          for (const video of videos) {
            const viewsCountChange = BigInt(
              (await viewCountChanges.find((x) => x.id === video._id)
                ?.viewsCountChange) || 0,
            );

            if (isNotEmpty(viewsCountChange) && viewsCountChange > BigInt(0)) {
              metricsUpdates.push(
                new Promise(async (resolve, reject) => {
                  try {
                    video.metrics.viewsCount += viewsCountChange;
                    await video.save();
                  } catch (e) {
                    reject(e);
                  }

                  this.logger.log(
                    `[${runId}] Metrics for video (${video._id}) update done`,
                  );

                  resolve(true);
                }),
              );
            }
          }

          await Promise.all(metricsUpdates);

          this.logger.log(
            `[${runId} emitting metrics changes to other services...`,
          );

          for (const video of videos) {
            this.clients.forEach(({ client }) => {
              client.emit(
                'update_video_views_metrics',
                new VideoViewsMetricsSyncEvent(
                  video._id,
                  video.metrics.viewsCount.toString(),
                  new Date(),
                ),
              );
            });
          }

          resolve(true);
        }),
      );
    }

    await Promise.all(updates);

    this.logger.log(`[${runId}] Metrics sync finished`);
  }
}
