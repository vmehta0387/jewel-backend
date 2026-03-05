import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Design } from './entities/design.entity';
import { DesignMetal } from './entities/design-metal.entity';
import { DesignGemstone } from './entities/design-gemstone.entity';
import { DesignLabor } from './entities/design-labor.entity';
import { DesignFinding } from './entities/design-finding.entity';
import { DesignProcessStage } from './entities/design-process-stage.entity';
import { DesignPricingTier } from './entities/design-pricing-tier.entity';
import { DesignVendor } from './entities/design-vendor.entity';
import { DesignRelevant } from './entities/design-relevant.entity';
import { DesignStlFile } from './entities/design-stl-file.entity';
import { DesignHistory } from './entities/design-history.entity';
import { StonePacket } from './entities/stone-packet.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { DesignMaster } from './entities/design-master.entity';
import { GlobalBasePrice } from '../pricing/entities/global-base-price.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Design,
      DesignMetal,
      DesignGemstone,
      DesignLabor,
      DesignFinding,
      DesignProcessStage,
      DesignPricingTier,
      DesignVendor,
      DesignRelevant,
      DesignStlFile,
      DesignHistory,
      StonePacket,
      DesignMaster,
      GlobalBasePrice,
      Company,
      Branch,
    ]),
    AuthModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
