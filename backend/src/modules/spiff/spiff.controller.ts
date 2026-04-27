import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { SpiffService } from './spiff.service';
import {
  CreateSpiffClaimDto,
  FindSpiffClaimsQueryDto,
  FulfillSpiffClaimDto,
  ReviewSpiffClaimDto,
  SpiffLeaderboardQueryDto,
} from './dto/spiff.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard)
@Controller('spiff')
export class SpiffController {
  constructor(private readonly spiffService: SpiffService) {}

  @Get('config')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  getConfig() {
    return this.spiffService.getConfig();
  }

  @Get('summary')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  getMySummary(@Request() req: { user: AuthUser }) {
    return this.spiffService.getMySummary(req.user);
  }

  @Get('leaderboard')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  getLeaderboard(
    @Query() query: SpiffLeaderboardQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.getLeaderboard(query, req.user);
  }

  @Get('claims')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  findClaims(
    @Query() query: FindSpiffClaimsQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.findClaims(query, req.user);
  }

  @Post('claims')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  createClaim(
    @Body() dto: CreateSpiffClaimDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.createClaim(dto, req.user);
  }

  @Patch('claims/:id/review')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  reviewClaim(
    @Param('id') id: string,
    @Body() dto: ReviewSpiffClaimDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.reviewClaim(id, dto, req.user);
  }

  @Patch('claims/:id/fulfill')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  fulfillClaim(
    @Param('id') id: string,
    @Body() dto: FulfillSpiffClaimDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.fulfillClaim(id, dto, req.user);
  }
}
