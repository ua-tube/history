import { Module } from '@nestjs/common';
import { VideoManagerService } from './video-manager.service';
import { VideoManagerController } from './video-manager.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from '../common/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
  ],
  controllers: [VideoManagerController],
  providers: [VideoManagerService],
})
export class VideoManagerModule {}
