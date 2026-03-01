import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { Company } from '../companies/entities/company.entity';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { BranchPricingSlab } from './entities/branch-pricing-slab.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Company, User, BranchPricingSlab]), AuthModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
