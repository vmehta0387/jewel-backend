import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { SpiffController } from './spiff.controller';
import { SpiffService } from './spiff.service';
import { GiftogramService } from './giftogram.service';
import { SpiffPointLedger } from './entities/spiff-point-ledger.entity';
import { SpiffRedemptionClaim } from './entities/spiff-redemption-claim.entity';
import { SpiffSetting } from './entities/spiff-setting.entity';
import { NotificationEventsModule } from '../notification-events/notification-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpiffPointLedger,
      SpiffRedemptionClaim,
      SpiffSetting,
      Order,
      User,
      Company,
      Branch,
    ]),
    AuthModule,
    NotificationEventsModule,
  ],
  controllers: [SpiffController],
  providers: [SpiffService, GiftogramService],
  exports: [SpiffService],
})
export class SpiffModule {}
