import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Design } from '../products/entities/design.entity';
import { AuthModule } from '../auth/auth.module';
import { SpiffModule } from '../spiff/spiff.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Company, Branch, Design]), AuthModule, SpiffModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
