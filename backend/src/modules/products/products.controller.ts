import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  GetNextDesignNoQueryDto,
  GetNextDesignVersionQueryDto,
  FindDesignMediaLibraryQueryDto,
  FindMobileCatalogProductsQueryDto,
  FindMobileTrendingProductsQueryDto,
  FindProductsQueryDto,
  ReplacePricingTiersDto,
  ReplaceProcessStagesDto,
  ReplaceRelevantDesignsDto,
  ReplaceVendorsDto,
  ResolveMobileDesignConfiguratorQueryDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductStatusDto,
  UploadStlFileDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { ActionPermissionsGuard } from '../auth/guards/action-permissions.guard';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { ActionPermissions, AnyActionPermissions } from '../auth/decorators/action-permissions.decorator';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard, ActionPermissionsGuard)
@TaskPermissions(TaskPermission.DESIGN_ENTRIES)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }


  @Get('mobile/trending')
  @TaskPermissions()
  @ActionPermissions()
  findMobileTrending(
    @Query() query: FindMobileTrendingProductsQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.findMobileTrending(query, req.user);
  }

  @Get('mobile/catalog')
  @TaskPermissions()
  @ActionPermissions()
  findMobileCatalog(
    @Query() query: FindMobileCatalogProductsQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.findMobileCatalog(query, req.user);
  }


  @Get('mobile/category-counts')
  @TaskPermissions()
  @ActionPermissions()
  findMobileCategoryCounts(@Request() req: { user: AuthUser }) {
    return this.productsService.findMobileCategoryCounts(req.user);
  }

  @Get('mobile/categories')
  @TaskPermissions()
  @ActionPermissions()
  findMobileCategories(@Request() req: { user: AuthUser }) {
    return this.productsService.findMobileCategories(req.user);
  }

  @Get('mobile/configurator/:id')
  @TaskPermissions()
  @ActionPermissions()
  findMobileConfigurator(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.findMobileConfigurator(id, req.user);
  }

  @Get('mobile/configurator/:id/resolve')
  @TaskPermissions()
  @ActionPermissions()
  resolveMobileConfigurator(
    @Param('id') id: string,
    @Query() query: ResolveMobileDesignConfiguratorQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.resolveMobileConfigurator(id, query, req.user);
  }

  @Get('dashboard-summary')
  @TaskPermissions()
  @ActionPermissions()
  getDashboardSummary(
    @Query() query: FindProductsQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.getDashboardSummary(query, req.user);
  }


  @Get('export/template')
  async exportDesignTemplate() {
    const file = await this.productsService.exportDesignTemplate();
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Get('export')
  async exportDesigns(@Query() query: FindProductsQueryDto, @Request() req: { user: AuthUser }) {
    const file = await this.productsService.exportDesigns(query, req.user);
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Post('export/by-ids')
  async exportDesignsByIds(@Body() body: { ids?: string[] }, @Request() req: { user: AuthUser }) {
    const file = await this.productsService.exportDesignsByIds(body?.ids || [], req.user);
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  importDesigns(
    @UploadedFile() file: { buffer?: Buffer; originalname?: string },
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.importDesigns(file, req.user);
  }


  @Get('global-base-prices')
  @TaskPermissions()
  @ActionPermissions()
  findActiveGlobalBasePrices() {
    return this.productsService.findActiveGlobalBasePrices();
  }

  @Get('next-design-no')
  @TaskPermissions()
  @ActionPermissions()
  getNextDesignNo(
    @Query() query: GetNextDesignNoQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.getNextDesignNo(query, req.user);
  }

  @Get('next-version')
  @TaskPermissions()
  @ActionPermissions()
  getNextDesignVersion(
    @Query() query: GetNextDesignVersionQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.getNextDesignVersion(query, req.user);
  }

  @Get(':id/history')
  @TaskPermissions()
  @ActionPermissions()
  getHistory(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.getHistory(id, req.user);
  }

  @Get()
  @TaskPermissions()
  findAll(@Query() query: FindProductsQueryDto, @Request() req: { user: AuthUser }) {
    return this.productsService.findAll(query, req.user);
  }

  @Get(':id')
  @TaskPermissions()
  @ActionPermissions()
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @Request() req: { user: AuthUser }) {
    return this.productsService.create(dto, req.user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.updateStatus(id, dto.isActive, req.user);
  }

  @Get('media-library')
  @TaskPermissions()
  @ActionPermissions()
  findMediaLibrary(@Query() query: FindDesignMediaLibraryQueryDto) {
    return this.productsService.findMediaLibrary(query);
  }

  @Delete('media-library/:id')
  removeMediaLibraryItem(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.removeMediaLibraryItem(id, req.user);
  }

  @Post('gallery-files')
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadGalleryFiles(@UploadedFiles() files: any[], @Request() req: { user: AuthUser }) {
    return this.productsService.uploadGalleryFiles(files || [], req);
  }

  @Get(':id/stl-file')
  async getStlFile(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    const file = await this.productsService.getStlFileContent(id, req.user);
    return new StreamableFile(file.buffer, {
      type: 'model/stl',
      disposition: `inline; filename="${file.fileName}"`,
    });
  }

  @Post('stl-files/upload')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 100 * 1024 * 1024 } }))
  uploadStlFiles(@UploadedFiles() files: any[], @Request() req: { user: AuthUser }) {
    return this.productsService.uploadStlFiles(files || [], req);
  }

  @Post(':id/stl-files')
  uploadStlFile(
    @Param('id') id: string,
    @Body() dto: UploadStlFileDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.uploadStlFile(id, dto, req.user);
  }

  @Post(':id/primary')
  setPrimary(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.setPrimaryVersion(id, req.user);
  }

  @Post(':id/relevant-designs')
  replaceRelevantDesigns(
    @Param('id') id: string,
    @Body() dto: ReplaceRelevantDesignsDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.replaceRelevantDesigns(id, dto.designIds, req.user);
  }

  @Post(':id/process-stages')
  replaceProcessStages(
    @Param('id') id: string,
    @Body() dto: ReplaceProcessStagesDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.replaceProcessStages(id, dto.processStages, req.user);
  }

  @Post(':id/pricing-tiers')
  replacePricingTiers(
    @Param('id') id: string,
    @Body() dto: ReplacePricingTiersDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.replacePricingTiers(id, dto.pricingTiers, req.user);
  }

  @Post(':id/vendors')
  replaceVendors(
    @Param('id') id: string,
    @Body() dto: ReplaceVendorsDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.replaceVendors(id, dto.vendors, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.remove(id, req.user);
  }
}
