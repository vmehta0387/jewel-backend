import { Body, Controller, Get, Headers, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ActivityEventsService } from './activity-events.service';
import { FindActivityEventsQueryDto, RecordActivityEventsBatchDto } from './dto/activity-event.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activity-events')
export class ActivityEventsController {
  constructor(private readonly activityEventsService: ActivityEventsService) {}

  @Post('batch')
  recordBatch(
    @Body() dto: RecordActivityEventsBatchDto,
    @Request() req: { user: AuthUser },
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.activityEventsService.recordBatch(dto, req.user, deviceId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll(@Query() query: FindActivityEventsQueryDto) {
    return this.activityEventsService.findAll(query);
  }
}
