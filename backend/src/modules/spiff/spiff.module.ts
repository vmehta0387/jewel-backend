import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { SpiffController } from './spiff.controller';
import { SpiffService } from './spiff.service';
import { GiftbitService } from './giftbit.service';
import { SpiffPointLedger } from './entities/spiff-point-ledger.entity';
import { SpiffRedemptionClaim } from './entities/spiff-redemption-claim.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpiffPointLedger,
      SpiffRedemptionClaim,
      Order,
      User,
      Company,
      Branch,
    ]),
    AuthModule,
  ],
  controllers: [SpiffController],
  providers: [SpiffService, GiftbitService],
  exports: [SpiffService],
})
export class SpiffModule {}
