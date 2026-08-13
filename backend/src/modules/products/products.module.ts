import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { MasterTablesController } from './master-tables.controller';
import { ProductsService } from './products.service';
import { MasterTablesService } from './master-tables.service';
import { Design } from './entities/design.entity';
import { DesignMetal } from './entities/design-metal.entity';
import { DesignGemstone } from './entities/design-gemstone.entity';
import { DesignLabor } from './entities/design-labor.entity';
import { DesignOverhead } from './entities/design-overhead.entity';
import { DesignFinding } from './entities/design-finding.entity';
import { DesignProcessStage } from './entities/design-process-stage.entity';
import { DesignPricingTier } from './entities/design-pricing-tier.entity';
import { DesignVendor } from './entities/design-vendor.entity';
import { DesignRelevant } from './entities/design-relevant.entity';
import { DesignStlFile } from './entities/design-stl-file.entity';
import { DesignHistory } from './entities/design-history.entity';
import { MetalPriceHistory } from './entities/metal-price-history.entity';
import { StonePacket } from './entities/stone-packet.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { DesignMaster } from './entities/design-master.entity';
import { DESIGN_MASTER_TABLE_ENTITIES } from './entities/design-master-tables.entity';
import { GlobalBasePrice } from '../pricing/entities/global-base-price.entity';
import { User } from '../users/entities/user.entity';
import { DesignMediaLibrary } from './entities/design-media-library.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Design,
      DesignMetal,
      DesignGemstone,
      DesignLabor,
      DesignOverhead,
      DesignFinding,
      DesignProcessStage,
      DesignPricingTier,
      DesignVendor,
      DesignRelevant,
      DesignStlFile,
      DesignHistory,
      MetalPriceHistory,
      StonePacket,
      DesignMaster,
      ...DESIGN_MASTER_TABLE_ENTITIES,
      DesignMediaLibrary,
      GlobalBasePrice,
      User,
      Company,
      Branch,
    ]),
    AuthModule,
    NotificationsModule,
    PricingModule,
  ],
  controllers: [ProductsController, MasterTablesController],
  providers: [ProductsService, MasterTablesService],
  exports: [ProductsService],
})
export class ProductsModule {}
