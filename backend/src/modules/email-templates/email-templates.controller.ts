import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { FindEmailTemplatesQueryDto, PreviewEmailTemplateDto, SaveEmailTemplateActionDto, SaveEmailTemplateDto, UpdateEmailTemplateDto } from './dto/email-template.dto';
import { CloneEmailTemplateDto, TestSendEmailTemplateDto } from './dto/email-template-operations.dto';
import { EmailTemplatesService } from './email-templates.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_REP)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  findAll(@Query() query: FindEmailTemplatesQueryDto) {
    return this.emailTemplatesService.findAll(query);
  }

  @Post()
  create(@Body() body: SaveEmailTemplateDto, @Request() req: { user: AuthUser }) {
    return this.emailTemplatesService.create(body, req.user);
  }

  @Post('actions')
  createAction(@Body() body: SaveEmailTemplateActionDto) {
    return this.emailTemplatesService.createAction(body);
  }

  @Delete('actions/:id')
  deleteAction(@Param('id') id: number) {
    return this.emailTemplatesService.deleteAction(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.emailTemplatesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() body: UpdateEmailTemplateDto, @Request() req: { user: AuthUser }) {
    return this.emailTemplatesService.update(Number(id), body, req.user);
  }

  @Delete(':id')
  archive(@Param('id') id: number, @Request() req: { user: AuthUser }) {
    return this.emailTemplatesService.archive(Number(id), req.user);
  }

  @Post(':id/preview')
  preview(@Param('id') id: number, @Body() body: PreviewEmailTemplateDto) {
    return this.emailTemplatesService.preview(Number(id), body);
  }

  @Post(':id/clone')
  clone(@Param('id') id: number, @Body() body: CloneEmailTemplateDto, @Request() req: { user: AuthUser }) {
    return this.emailTemplatesService.clone(Number(id), body, req.user);
  }

  @Post(':id/test-send')
  testSend(@Param('id') id: number, @Body() body: TestSendEmailTemplateDto) {
    return this.emailTemplatesService.testSend(Number(id), body);
  }
}