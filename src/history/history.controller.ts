import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { AuthUserGuard, OptionalAuthUserGuard } from '../common/guards';
import { UserId } from '../common/decorators';
import {
  PaginationDto,
  RecordVideoViewDto,
  SearchUserHistoryDto,
  SwitchWatchHistoryDto,
} from './dto';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @UseGuards(OptionalAuthUserGuard)
  @Post('record')
  recordVideoView(@Body() dto: RecordVideoViewDto, @UserId() userId?: string) {
    return this.historyService.recordVideoView(dto, userId);
  }

  @UseGuards(AuthUserGuard)
  @Get()
  searchUserWatchHistory(
    @Query() query: SearchUserHistoryDto,
    @Query() pagination: PaginationDto,
    @UserId() userId: string,
  ) {
    return this.historyService.searchUserWatchHistory(
      query,
      pagination,
      userId,
    );
  }

  @UseGuards(AuthUserGuard)
  @Delete()
  clearUserWatchHistory(@UserId() userId: string) {
    return this.historyService.clearUserWatchHistory(userId);
  }

  @UseGuards(AuthUserGuard)
  @Delete('video/:videoId')
  deleteVideoFromUserWatchHistory(
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @UserId() userId: string,
  ) {
    return this.historyService.deleteVideoFromUserWatchHistory(videoId, userId);
  }

  @UseGuards(AuthUserGuard)
  @Post('switch-watch-history')
  switchWatchHistory(
    @Body() dto: SwitchWatchHistoryDto,
    @UserId() userId: string,
  ) {
    return this.historyService.switchWatchHistory(dto.enabled, userId);
  }

  @UseGuards(AuthUserGuard)
  @Get('settings')
  getUserWatchHistorySettings(@UserId() userId: string) {
    return this.historyService.getUserWatchHistorySettings(userId);
  }
}
