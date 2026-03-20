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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  CreateStonePacketDto,
  CreateDesignMasterDto,
  GetNextDesignNoQueryDto,
  GetNextDesignVersionQueryDto,
  FindPacketsQueryDto,
  FindDesignMastersQueryDto,
  FindProductsQueryDto,
  ReplacePricingTiersDto,
  ReplaceProcessStagesDto,
  ReplaceRelevantDesignsDto,
  ReplaceVendorsDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductStatusDto,
  UpdateDesignMasterDto,
  UpdateDesignMasterStatusDto,
  UpdateStonePacketDto,
  UpdateStonePacketStatusDto,
  UploadStlFileDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard)
@TaskPermissions(TaskPermission.DESIGN_ENTRIES)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto, @Request() req: { user: AuthUser }) {
    return this.productsService.create(dto, req.user);
  }

  @Get()
  findAll(@Query() query: FindProductsQueryDto, @Request() req: { user: AuthUser }) {
    return this.productsService.findAll(query, req.user);
  }

  @Get('packets')
  findPackets(@Query() query: FindPacketsQueryDto) {
    return this.productsService.findPackets(query);
  }

  @Post('packets')
  createPacket(@Body() dto: CreateStonePacketDto, @Request() req: { user: AuthUser }) {
    return this.productsService.createPacket(dto, req.user);
  }

  @Post('gallery-files')
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadGalleryFiles(@UploadedFiles() files: any[], @Request() req: { user: AuthUser }) {
    return this.productsService.uploadGalleryFiles(files || [], req);
  }

  @Post('stl-files/upload')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 100 * 1024 * 1024 } }))
  uploadStlFiles(@UploadedFiles() files: any[], @Request() req: { user: AuthUser }) {
    return this.productsService.uploadStlFiles(files || [], req);
  }

  @Get(':id/stl-file')
  async getStlFile(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    const file = await this.productsService.getStlFileContent(id, req.user);
    return new StreamableFile(file.buffer, {
      type: 'model/stl',
      disposition: `inline; filename="${file.fileName}"`,
    });
  }

  @Put('packets/:id')
  updatePacket(
    @Param('id') id: string,
    @Body() dto: UpdateStonePacketDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.updatePacket(id, dto, req.user);
  }

  @Patch('packets/:id/status')
  updatePacketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStonePacketStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.updatePacketStatus(id, dto.isActive, req.user);
  }

  @Get('masters')
  findMasters(@Query() query: FindDesignMastersQueryDto) {
    return this.productsService.findMasters(query);
  }

  @Get('global-base-prices')
  findActiveGlobalBasePrices() {
    return this.productsService.findActiveGlobalBasePrices();
  }

  @Get('next-design-no')
  getNextDesignNo(
    @Query() query: GetNextDesignNoQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.getNextDesignNo(query, req.user);
  }

  @Get('next-version')
  getNextDesignVersion(
    @Query() query: GetNextDesignVersionQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.getNextDesignVersion(query, req.user);
  }

  @Post('masters')
  createMaster(@Body() dto: CreateDesignMasterDto, @Request() req: { user: AuthUser }) {
    return this.productsService.createMaster(dto, req.user);
  }

  @Put('masters/:id')
  updateMaster(
    @Param('id') id: string,
    @Body() dto: UpdateDesignMasterDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.updateMaster(id, dto, req.user);
  }

  @Patch('masters/:id/status')
  updateMasterStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDesignMasterStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.updateMasterStatus(id, dto.isActive, req.user);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.getHistory(id, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.findOne(id, req.user);
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

  @Post(':id/stl-files')
  uploadStlFile(
    @Param('id') id: string,
    @Body() dto: UploadStlFileDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.uploadStlFile(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.productsService.remove(id, req.user);
  }
}
