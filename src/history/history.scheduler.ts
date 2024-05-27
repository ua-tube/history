import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Promise } from 'mongoose';
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

  @Cron(CronExpression.EVERY_MINUTE)
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

      const viewCountChanges = videos.map(v => ({
        id: v._id,
        viewsCountChange: this.redis.getdel(
          `history:video_views_${v._id}`,
        )
      }))

      const promises: Promise<any>[] = [];
      for (const video of videos) {
        promises.push(
          new Promise(async (resolve) => {
            const viewsCountChange = BigInt(await viewCountChanges.find(x => x.id === video._id)?.viewsCountChange);
          
            if (viewsCountChange && viewsCountChange !== BigInt(0)) {
              video.metrics.viewsCount += viewsCountChange;
              await video.save();
            }
            // await this.videoModel.updateOne(
            //   { _id: video._id },
            //   { 'metrics.viewsCount': BigInt(value) },
            // );
            resolve(true);
          }),
        );
      }

      await Promise.all(promises);

      for (const video of videos) {
        this.clients.forEach(({ client }) => {
          client.emit(
            'update_video_views_metrics',
            new VideoViewsMetricsSyncEvent(
              video._id, 
              String(video.metrics.viewsCount), 
              new Date()),
          );
        });
      }
    }

    this.logger.log(`[${runId}] Metrics sync finished`);
  }
}
