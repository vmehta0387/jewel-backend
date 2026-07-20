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
import { Roles } from '../auth/decorators/roles.decorator';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { ActionPermissionsGuard } from '../auth/guards/action-permissions.guard';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { ActionPermissions, AnyActionPermissions } from '../auth/decorators/action-permissions.decorator';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { SpiffService } from './spiff.service';
import {
  CreateSpiffClaimDto,
  FindSpiffClaimsQueryDto,
  FulfillSpiffClaimDto,
  ReviewSpiffClaimDto,
  SpiffLeaderboardQueryDto,
  UpdateSpiffConfigDto,
} from './dto/spiff.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard, ActionPermissionsGuard)
@Controller('spiff')
export class SpiffController {
  constructor(private readonly spiffService: SpiffService) {}

  @Get('config')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @AnyActionPermissions('spiff.view', 'mobile.spiff.view')
  async getConfig() {
    return this.spiffService.getConfig();
  }

  @Patch('config')
  @Roles(UserRole.SUPER_ADMIN)
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @ActionPermissions('spiff.config.edit')
  async updateConfig(
    @Body() dto: UpdateSpiffConfigDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.updateConfig(dto, req.user);
  }

  @Get('summary')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @AnyActionPermissions('spiff.view', 'mobile.spiff.view')
  getMySummary(@Request() req: { user: AuthUser }) {
    return this.spiffService.getMySummary(req.user);
  }

  @Get('leaderboard')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @AnyActionPermissions('spiff.view', 'mobile.spiff.leaderboard.view')
  getLeaderboard(
    @Query() query: SpiffLeaderboardQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.getLeaderboard(query, req.user);
  }

  @Get('claims')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @AnyActionPermissions('spiff.view', 'mobile.spiff.view')
  findClaims(
    @Query() query: FindSpiffClaimsQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.findClaims(query, req.user);
  }

  @Post('claims')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @AnyActionPermissions('spiff.claim.create', 'mobile.spiff.claim.create')
  createClaim(
    @Body() dto: CreateSpiffClaimDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.createClaim(dto, req.user);
  }

  @Patch('claims/:id/review')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @AnyActionPermissions('spiff.claim.review', 'mobile.spiff.claim.review')
  reviewClaim(
    @Param('id') id: string,
    @Body() dto: ReviewSpiffClaimDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.reviewClaim(id, dto, req.user);
  }

  @Patch('claims/:id/fulfill')
  @TaskPermissions(TaskPermission.ORDER_ENTRIES)
  @ActionPermissions('spiff.claim.fulfill')
  fulfillClaim(
    @Param('id') id: string,
    @Body() dto: FulfillSpiffClaimDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.spiffService.fulfillClaim(id, dto, req.user);
  }
}
