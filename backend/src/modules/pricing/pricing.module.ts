import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingRule } from './entities/pricing-rule.entity';
import { GlobalBasePrice } from './entities/global-base-price.entity';
import { Design } from '../products/entities/design.entity';
import { DesignMetal } from '../products/entities/design-metal.entity';
import { DesignGemstone } from '../products/entities/design-gemstone.entity';
import { DesignLabor } from '../products/entities/design-labor.entity';
import { DesignFinding } from '../products/entities/design-finding.entity';
import { DesignMaster } from '../products/entities/design-master.entity';

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
      DesignMaster,
    ]),
    AuthModule,
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
