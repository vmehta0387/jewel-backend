import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderHistory } from './entities/order-history.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Design } from '../products/entities/design.entity';
import { User } from '../users/entities/user.entity';
import { UserPermissionAction } from '../permissions/entities/user-permission-action.entity';
import { AuthModule } from '../auth/auth.module';
import { SpiffModule } from '../spiff/spiff.module';
import { NotificationEventsModule } from '../notification-events/notification-events.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderHistory, Company, Branch, Design, User, UserPermissionAction]), AuthModule, SpiffModule, NotificationEventsModule, PricingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
