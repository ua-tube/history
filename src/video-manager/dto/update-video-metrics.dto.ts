import { VideoVisibility } from '../../common/schemas';

export class UpdateVideoMetricsDto {
  id: string;
  creatorId: string;
  title?: string;
  description?: string;
  tags?: string;
  thumbnailUrl?: string;
  previewThumbnailUrl?: string;
  lengthSeconds?: number;
  visibility?: VideoVisibility;
  createdAt?: Date;
}
