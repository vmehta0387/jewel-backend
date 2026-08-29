import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplateAction } from './entities/email-template-action.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailTemplateVersion } from './entities/email-template-version.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate, EmailTemplateAction, EmailTemplateVersion]), EmailModule],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}