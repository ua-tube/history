import { Document } from 'mongoose';
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Creator } from './creator.schema';

export type VideoDocument = Video & Document;

export enum VideoVisibility {
  Private = 'Private',
  Unlisted = 'Unlisted',
  Public = 'Public',
}

export enum VideoStatus {
  Preparing = 'Preparing',
  Ready = 'Ready',
  Published = 'Published',
  Unregistered = 'Unregistered',
}

@Schema({
  versionKey: false,
  _id: false,
  timestamps: { createdAt: true, updatedAt: false },
})
export class Video {
  @Prop(String)
  _id: string;

  @Prop({ type: String, ref: 'Creator' })
  creator: Creator;

  @Prop(String)
  title: string;

  @Prop(String)
  description: string;

  @Prop(String)
  tags: string;

  @Prop(String)
  thumbnailUrl?: string;

  @Prop(String)
  previewThumbnailUrl?: string;

  @Prop(Number)
  lengthSeconds: number;

  @Prop({
    type: String,
    enum: VideoVisibility,
    default: VideoVisibility.Private,
  })
  visibility: VideoVisibility;

  @Prop({ type: String, enum: VideoStatus, default: VideoStatus.Preparing })
  status: VideoStatus;

  @Prop(
    raw({
      viewsCount: { type: BigInt },
      nextSyncDate: { type: Date },
    }),
  )
  metrics: {
    viewsCount: bigint;
    nextSyncDate: Date;
  };
}

export const VideoSchema = SchemaFactory.createForClass(Video);
