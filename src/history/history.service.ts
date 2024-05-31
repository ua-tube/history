import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { PaginationDto, RecordVideoViewDto, SearchUserHistoryDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  Creator,
  CreatorDocument,
  Video,
  VideoDocument,
} from '../common/schemas';
import { Model, Types } from 'mongoose';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectMeiliSearch } from 'nestjs-meilisearch';
import { EnqueuedTask, Index, Meilisearch } from 'meilisearch';
import { UserHistoryIndex } from './interfaces';
import moment from 'moment';

@Injectable()
export class HistoryService implements OnModuleInit {
  private readonly indexName = 'user_history';
  private index: Index<UserHistoryIndex>;

  constructor(
    @InjectModel(Creator.name)
    private readonly creatorModel: Model<CreatorDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectRedis()
    private readonly redis: Redis,
    @InjectMeiliSearch()
    private readonly meiliSearch: Meilisearch,
  ) {}

  async onModuleInit() {
    // Setup MeiliSearch index
    await this.meiliSearch.createIndex(this.indexName, { primaryKey: 'id' });
    this.index = this.meiliSearch.index(this.indexName);
    await Promise.all([
      this.index.updateSortableAttributes(['viewAt']),
      this.index.updateFilterableAttributes(['creatorId', 'videoId']),
    ]);
  }

  async recordVideoView(dto: RecordVideoViewDto, creatorId?: string) {
    const video = await this.videoModel.findOne({ _id: dto.videoId });

    if (!video) throw new BadRequestException('Video not found');

    await this.redis.incr(`history:video_views_${dto.videoId}`);

    if (!video.metrics.nextSyncDate) {
      video.metrics.nextSyncDate = moment().add(1, 'm').toDate();
      await video.save();
    }

    if (creatorId) {
      const creator = await this.getCreator(creatorId, false);

      if (creator?.recordWatchHistory) {
        const { hits } = await this.index.search(null, {
          limit: 1,
          filter: [`creatorId=${creatorId}`, `videoId=${dto.videoId}`],
          sort: ['viewAt:desc'],
        });

        const now = moment();
        const tomorrow = now.add(1, 'd');

        if (
          hits.length > 0 &&
          now.unix() - moment(hits[0].viewAt).unix() < tomorrow.unix()
        ) {
          return false;
        }

        await this.index.addDocuments([
          {
            id: new Types.ObjectId().toHexString(),
            creatorId,
            videoId: dto.videoId,
            title: video.title,
            tags: video.tags,
            viewAt: now.toDate(),
          },
        ]);

        return true;
      }
    }
  }

  async searchUserWatchHistory(
    dto: SearchUserHistoryDto,
    pagination: PaginationDto,
    creatorId: string,
  ) {
    await this.getCreator(creatorId);

    const {
      hits,
      page,
      hitsPerPage,
      totalPages,
      totalHits,
      estimatedTotalHits,
    } = await this.index.search(dto?.query, {
      page: pagination?.page ?? 1,
      hitsPerPage: pagination?.perPage ?? 20,
      filter: [`creatorId=${creatorId}`],
      sort: ['viewAt:desc'],
    });

    // const [videos, creators] = await Promise.all([
    //   this.videoModel.find({ _id: { $in: hits.map((hit) => hit.videoId) } }),
    //   this.creatorModel.find({
    //     _id: { $in: hits.map((hit) => hit.creatorId) },
    //   }),
    // ]);

    const videos = await this.videoModel
      .find({
        _id: { $in: hits.map((hit) => hit.videoId) },
      })
      .populate('creator')
      .exec();

    return {
      hits: videos,
      page,
      hitsPerPage,
      totalPages,
      totalHits,
      estimatedTotalHits,
    };
  }

  async clearUserWatchHistory(creatorId: string) {
    await this.getCreator(creatorId);

    const enqueuedTask = await this.index.deleteDocuments({
      filter: [`creatorId=${creatorId}`],
    });

    await this.handleMeiliTask(enqueuedTask);
  }

  async deleteVideoFromUserWatchHistory(videoId: string, creatorId: string) {
    await this.getCreator(creatorId);

    const enqueuedTask = await this.index.deleteDocuments({
      filter: [`videoId=${videoId}`, `creatorId=${creatorId}`],
    });

    await this.handleMeiliTask(enqueuedTask);
  }

  async switchWatchHistory(enabled: boolean, creatorId: string) {
    await this.getCreator(creatorId);

    await this.creatorModel.updateOne(
      { _id: creatorId },
      { recordWatchHistory: enabled },
    );
  }

  async getUserWatchHistorySettings(creatorId: string) {
    const creator = await this.getCreator(creatorId);

    return {
      recordWatchHistoryEnabled: creator.recordWatchHistory,
    };
  }

  private async getCreator(creatorId: string, throwError = true) {
    const creator = await this.creatorModel.findOne({
      _id: creatorId,
    });

    if (!creator && throwError)
      throw new BadRequestException('Creator not found');

    return creator;
  }

  private async handleMeiliTask(enqueuedTask: EnqueuedTask) {
    const success = await new Promise<boolean>((resolve) => {
      const timeout = setInterval(async () => {
        const task = await this.index.getTask(enqueuedTask.taskUid);
        if (task.finishedAt) {
          clearTimeout(timeout);
          resolve(task.status === 'succeeded');
        }
      }, 500);
    });

    if (!success) throw new InternalServerErrorException();
  }
}
