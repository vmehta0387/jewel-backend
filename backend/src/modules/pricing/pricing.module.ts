import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PricingController } from './pricing.controller';
import { CompanyAdminPricingController } from './company-admin-pricing.controller';
import { PricingService } from './pricing.service';
import { PricingRule } from './entities/pricing-rule.entity';
import { GlobalBasePrice } from './entities/global-base-price.entity';
import { Design } from '../products/entities/design.entity';
import { DesignMetal } from '../products/entities/design-metal.entity';
import { DesignGemstone } from '../products/entities/design-gemstone.entity';
import { DesignLabor } from '../products/entities/design-labor.entity';
import { DesignFinding } from '../products/entities/design-finding.entity';
import { DESIGN_MASTER_TABLE_ENTITIES } from '../products/entities/design-master-tables.entity';
import { MasterTablesService } from '../products/master-tables.service';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { CompanyPricingSlab } from '../companies/entities/company-pricing-slab.entity';
import { BranchPricingSlab } from '../branches/entities/branch-pricing-slab.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingRule,
      GlobalBasePrice,
      Design,
      DesignMetal,
      DesignGemstone,
      DesignLabor,
      DesignFinding,
      ...DESIGN_MASTER_TABLE_ENTITIES,
      Company,
      Branch,
      CompanyPricingSlab,
      BranchPricingSlab,
      User,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [PricingController, CompanyAdminPricingController],
  providers: [PricingService, MasterTablesService],
  exports: [PricingService],
})
export class PricingModule {}
