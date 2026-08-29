import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { EmailService } from '../email/email.service';
import { FindEmailTemplatesQueryDto, PreviewEmailTemplateDto, SaveEmailTemplateActionDto, SaveEmailTemplateDto, UpdateEmailTemplateDto } from './dto/email-template.dto';
import { CloneEmailTemplateDto, TestSendEmailTemplateDto } from './dto/email-template-operations.dto';
import { EmailTemplateAction } from './entities/email-template-action.entity';
import { EmailTemplate, EmailTemplateStatus } from './entities/email-template.entity';
import { EmailTemplateVersion } from './entities/email-template-version.entity';
import { DEFAULT_EMAIL_TEMPLATE_STATUS, DEFAULT_EMAIL_TEMPLATES } from './seeds/default-email-templates';

export interface RenderEmailTemplateInput {
  actionType: string;
  variables: Record<string, unknown>;
  recipientRole?: string | null;
}

export interface RenderedEmailTemplate {
  templateId: number;
  templateKey: string;
  subject: string;
  html: string;
  text: string;
  missingVariables: string[];
}

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    @InjectRepository(EmailTemplateAction)
    private readonly actionRepo: Repository<EmailTemplateAction>,
    @InjectRepository(EmailTemplateVersion)
    private readonly versionRepo: Repository<EmailTemplateVersion>,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaults();
    } catch (error) {
      this.logger.warn(`Email template seed skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findAll(query: FindEmailTemplatesQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const qb = this.templateRepo
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.actions', 'action')
      .orderBy('template.category', 'ASC')
      .addOrderBy('template.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('template.status = :status', { status: query.status });
    if (query.category) qb.andWhere('template.category = :category', { category: query.category.trim().toUpperCase() });
    if (query.actionType) qb.andWhere('action.actionType = :actionType', { actionType: query.actionType.trim().toUpperCase() });
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('template.key LIKE :search', { search })
            .orWhere('template.name LIKE :search', { search })
            .orWhere('template.subject LIKE :search', { search })
            .orWhere('action.actionType LIKE :search', { search });
        }),
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const template = await this.templateRepo.findOne({ where: { id }, relations: ['actions', 'versions'] });
    if (!template) throw new NotFoundException('Email template not found');
    return template;
  }

  async create(dto: SaveEmailTemplateDto, requester: AuthUser) {
    const normalized = this.normalizeTemplateDto(dto);
    await this.ensureUniqueKey(normalized.key);
    const template = this.templateRepo.create({ ...normalized, version: 1, createdBy: requester.id, updatedBy: requester.id });
    const saved = await this.templateRepo.save(template);
    await this.snapshotVersion(saved, requester.id);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateEmailTemplateDto, requester: AuthUser) {
    const template = await this.findOne(id);
    const normalized = this.normalizeTemplateDto(dto);
    if (template.key !== normalized.key) await this.ensureUniqueKey(normalized.key, id);

    Object.assign(template, normalized, { version: template.version + 1, updatedBy: requester.id });
    const saved = await this.templateRepo.save(template);
    await this.snapshotVersion(saved, requester.id);
    return this.findOne(saved.id);
  }

  async archive(id: number, requester: AuthUser) {
    const template = await this.findOne(id);
    template.status = EmailTemplateStatus.ARCHIVED;
    template.updatedBy = requester.id;
    const saved = await this.templateRepo.save(template);
    await this.snapshotVersion(saved, requester.id);
    return saved;
  }

  async clone(id: number, dto: CloneEmailTemplateDto, requester: AuthUser) {
    const source = await this.findOne(id);
    const key = this.normalizeSlug(dto.key || `${source.key}_copy`);
    await this.ensureUniqueKey(key);

    const template = this.templateRepo.create({
      key,
      name: this.requiredText(dto.name || `${source.name} Copy`, 'Template name is required'),
      category: source.category,
      subject: source.subject,
      preheader: source.preheader,
      html: source.html,
      text: source.text,
      requiredVariables: source.requiredVariables || [],
      optionalVariables: source.optionalVariables || [],
      status: EmailTemplateStatus.DRAFT,
      version: 1,
      isDefault: false,
      createdBy: requester.id,
      updatedBy: requester.id,
    });
    const saved = await this.templateRepo.save(template);
    await this.snapshotVersion(saved, requester.id);
    return this.findOne(saved.id);
  }

  async testSend(id: number, dto: TestSendEmailTemplateDto) {
    const template = await this.findOne(id);
    const rendered = this.renderTemplate(template, dto.variables || this.buildSampleVariables(template));
    if (rendered.missingVariables.length) {
      throw new BadRequestException(`Missing variables: ${rendered.missingVariables.join(', ')}`);
    }

    const sent = await this.emailService.sendMail({
      to: { email: dto.to, name: dto.name || undefined },
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    return { success: sent };
  }

  async createAction(dto: SaveEmailTemplateActionDto) {
    const template = await this.templateRepo.findOne({ where: { id: dto.templateId } });
    if (!template) throw new NotFoundException('Email template not found');

    const actionType = this.normalizeKey(dto.actionType);
    const action = this.actionRepo.create({
      actionType,
      templateId: template.id,
      recipientRole: dto.recipientRole?.trim() || null,
      channel: dto.channel?.trim().toUpperCase() || 'EMAIL',
      priority: dto.priority ?? 100,
      isActive: dto.isActive ?? true,
    });
    return this.actionRepo.save(action);
  }

  async deleteAction(id: number) {
    const action = await this.actionRepo.findOne({ where: { id } });
    if (!action) throw new NotFoundException('Email template action not found');
    await this.actionRepo.remove(action);
    return { success: true };
  }

  async preview(id: number, dto: PreviewEmailTemplateDto = {}) {
    const template = await this.findOne(id);
    return this.renderTemplate(template, dto.variables || this.buildSampleVariables(template));
  }

  async renderForAction(input: RenderEmailTemplateInput): Promise<RenderedEmailTemplate | null> {
    const actionType = this.normalizeKey(input.actionType);
    const qb = this.actionRepo
      .createQueryBuilder('action')
      .innerJoinAndSelect('action.template', 'template')
      .where('action.actionType = :actionType', { actionType })
      .andWhere('action.channel = :channel', { channel: 'EMAIL' })
      .andWhere('action.isActive = :isActive', { isActive: true })
      .andWhere('template.status = :status', { status: EmailTemplateStatus.ACTIVE })
      .orderBy('CASE WHEN action.recipientRole = :recipientRole THEN 0 WHEN action.recipientRole IS NULL THEN 1 ELSE 2 END', 'ASC')
      .addOrderBy('action.priority', 'ASC')
      .setParameter('recipientRole', input.recipientRole || '');

    const action = await qb.getOne();
    if (!action?.template) return null;

    return this.renderTemplate(action.template, input.variables);
  }

  private async seedDefaults() {
    for (const seed of DEFAULT_EMAIL_TEMPLATES) {
      let template = await this.templateRepo.findOne({ where: { key: seed.key } });
      if (!template) {
        template = await this.templateRepo.save(
          this.templateRepo.create({
            key: seed.key,
            name: seed.name,
            category: seed.category,
            subject: seed.subject,
            preheader: seed.preheader || null,
            html: seed.html,
            text: seed.text || null,
            requiredVariables: seed.requiredVariables,
            optionalVariables: seed.optionalVariables || [],
            status: DEFAULT_EMAIL_TEMPLATE_STATUS,
            version: 1,
            isDefault: true,
            createdBy: null,
            updatedBy: null,
          }),
        );
        await this.snapshotVersion(template, null);
      }

      for (const actionType of seed.actionTypes) {
        const normalizedAction = this.normalizeKey(actionType);
        const exists = await this.actionRepo.findOne({ where: { actionType: normalizedAction, templateId: template.id, channel: 'EMAIL' } });
        if (!exists) {
          await this.actionRepo.save(
            this.actionRepo.create({ actionType: normalizedAction, templateId: template.id, channel: 'EMAIL', recipientRole: null, priority: 100, isActive: true }),
          );
        }
      }
    }
  }

  private normalizeTemplateDto(dto: SaveEmailTemplateDto) {
    const key = this.normalizeSlug(dto.key);
    const name = this.requiredText(dto.name, 'Template name is required');
    const category = this.normalizeKey(dto.category || 'GENERAL');
    const subject = this.requiredText(dto.subject, 'Subject is required');
    const html = this.requiredText(dto.html, 'HTML content is required');
    const detectedVariables = this.extractVariables([subject, dto.preheader || '', html, dto.text || ''].join('\n'));

    return {
      key,
      name,
      category,
      subject,
      preheader: this.optionalText(dto.preheader),
      html,
      text: this.optionalText(dto.text),
      requiredVariables: this.uniqueStrings(dto.requiredVariables?.length ? dto.requiredVariables : detectedVariables),
      optionalVariables: this.uniqueStrings(dto.optionalVariables || []),
      status: dto.status || EmailTemplateStatus.DRAFT,
      isDefault: dto.isDefault ?? false,
    };
  }

  private async ensureUniqueKey(key: string, excludeId?: number) {
    const existing = await this.templateRepo.findOne({ where: { key } });
    if (existing && existing.id !== excludeId) throw new BadRequestException('Email template key already exists');
  }

  private renderTemplate(template: EmailTemplate, variables: Record<string, unknown>): RenderedEmailTemplate {
    const normalizedVariables = this.normalizeVariables(variables);
    const required = template.requiredVariables || [];
    const missingVariables = required.filter((key) => !Object.prototype.hasOwnProperty.call(normalizedVariables, key));

    const render = (content = '') => content.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_match, key) => this.escapeHtml(String(normalizedVariables[key] ?? '')));
    const subject = render(template.subject);
    const bodyContent = render(template.html);
    const preheader = render(template.preheader || template.subject);
    const html = this.toEmailDocument(subject, preheader, bodyContent);
    const text = template.text ? render(template.text) : this.stripHtml(html);

    return { templateId: template.id, templateKey: template.key, subject, html, text, missingVariables };
  }

  private buildSampleVariables(template: EmailTemplate) {
    const keys = this.uniqueStrings([...(template.requiredVariables || []), ...(template.optionalVariables || []), ...this.extractVariables(`${template.subject}\n${template.html}\n${template.text || ''}`)]);
    return keys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = this.sampleValue(key);
      return acc;
    }, {});
  }

  private sampleValue(key: string) {
    const samples: Record<string, string> = {
      title: 'Order update',
      message: 'Your order status has changed.',
      action_url: '#',
      order_number: 'ORD-1001',
      company_name: 'Sample Company',
      tracking_number: 'TRACK123456',
      carrier: 'FedEx',
      delivery_estimate: 'Tomorrow',
      user_name: 'Sample User',
    };
    return samples[key] || key.replace(/_/g, ' ');
  }

  private async snapshotVersion(template: EmailTemplate, userId: number | null) {
    await this.versionRepo.save(
      this.versionRepo.create({
        templateId: template.id,
        version: template.version,
        subject: template.subject,
        preheader: template.preheader,
        html: template.html,
        text: template.text,
        requiredVariables: template.requiredVariables,
        optionalVariables: template.optionalVariables,
        status: template.status,
        createdBy: userId,
      }),
    );
  }

  private normalizeVariables(variables: Record<string, unknown>) {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(variables || {})) normalized[this.normalizeVariableKey(key)] = value;
    return normalized;
  }

  private extractVariables(content: string) {
    const variables = new Set<string>();
    for (const match of content.matchAll(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g)) variables.add(this.normalizeVariableKey(match[1]));
    return Array.from(variables);
  }

  private normalizeVariableKey(key: string) {
    return String(key || '').trim();
  }

  private normalizeKey(value: string) {
    return this.requiredText(value, 'Key is required').replace(/[^a-zA-Z0-9_:-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toUpperCase();
  }

  private normalizeSlug(value: string) {
    return this.requiredText(value, 'Template key is required').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  }

  private requiredText(value: string | null | undefined, message: string) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new BadRequestException(message);
    return normalized;
  }

  private optionalText(value: string | null | undefined) {
    const normalized = String(value || '').trim();
    return normalized.length ? normalized : null;
  }

  private uniqueStrings(values: string[]) {
    return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
  }

  private toEmailDocument(subject: string, preheader: string, bodyContent: string) {
    if (this.isFullHtmlDocument(bodyContent)) {
      return bodyContent;
    }

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${this.escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${this.escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f1ea"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e7e2d6;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1a1714;padding:18px 28px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">BLITZ <span style="color:#b8924a;">NYC</span></span></td></tr>
<tr><td style="padding:30px 28px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1714;">${bodyContent}<p style="margin:18px 0 0;font-size:15px;color:#1a1714;">- Blitz NYC</p></td></tr>
<tr><td style="background:#faf9f6;border-top:1px solid #e7e2d6;padding:20px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#6b6660;">You're receiving this because you have a Blitz NYC account.<br>Blitz NYC, LLC</td></tr>
</table></td></tr></table></body></html>`;
  }

  private isFullHtmlDocument(value: string) {
    return /<\s*(html|body)(\s|>)/i.test(value || '');
  }
  private stripHtml(html = '') {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}