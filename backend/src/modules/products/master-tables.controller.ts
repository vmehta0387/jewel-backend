import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { MasterTablesService } from './master-tables.service';
import { FindMasterTableQueryDto, MasterTableTypeParamDto, SaveMasterTableDto } from './dto/master-table.dto';

@Controller('products/master-tables')
@UseGuards(JwtAuthGuard)
export class MasterTablesController {
  constructor(private readonly masterTablesService: MasterTablesService) {}

  @Get('METAL_NAME/get_live_price')
  getMetalLivePrice() {
    return this.masterTablesService.getMetalLivePrice();
  }

  @Get(':masterType/dropdown')
  dropdown(@Param() params: MasterTableTypeParamDto, @Query() query: FindMasterTableQueryDto) {
    return this.masterTablesService.dropdown(params.masterType, query);
  }

  @Get(':masterType/export/template')
  async exportTemplate(@Param() params: MasterTableTypeParamDto) {
    const file = await this.masterTablesService.exportTemplate(params.masterType);
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Get(':masterType/export')
  async exportRows(@Param() params: MasterTableTypeParamDto, @Query() query: FindMasterTableQueryDto) {
    const file = await this.masterTablesService.exportRows(params.masterType, query);
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Post(':masterType/import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importRows(
    @Param() params: MasterTableTypeParamDto,
    @UploadedFile() file: { buffer?: Buffer; originalname?: string },
    @Request() req: { user: AuthUser },
  ) {
    return this.masterTablesService.importRows(params.masterType, file, req.user);
  }

  @Get(':masterType')
  list(@Param() params: MasterTableTypeParamDto, @Query() query: FindMasterTableQueryDto) {
    return this.masterTablesService.list(params.masterType, query);
  }

  @Get(':masterType/:id')
  get(@Param() params: MasterTableTypeParamDto, @Param('id', ParseIntPipe) id: number) {
    return this.masterTablesService.get(params.masterType, id);
  }

  @Post(':masterType')
  create(
    @Param() params: MasterTableTypeParamDto,
    @Body() dto: SaveMasterTableDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.masterTablesService.create(params.masterType, dto, req.user);
  }

  @Patch(':masterType/:id')
  update(
    @Param() params: MasterTableTypeParamDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<SaveMasterTableDto>,
    @Request() req: { user: AuthUser },
  ) {
    return this.masterTablesService.update(params.masterType, id, dto, req.user);
  }

  @Patch(':masterType/:id/status')
  setActive(
    @Param() params: MasterTableTypeParamDto,
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
    @Request() req: { user: AuthUser },
  ) {
    return this.masterTablesService.setActive(params.masterType, id, isActive, req.user);
  }
}
