import { VideoVisibility } from '../../common/schemas';

export class UpdateVideoDto {
  id: string;
  title: string;
  description: string;
  tags: string;
  thumbnailUrl: string;
  previewThumbnailUrl: string;
  visibility: VideoVisibility;
}
