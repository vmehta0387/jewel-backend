import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
import {
  FindMasterTableQueryDto,
  FindOneMasterTableDto,
  MasterTableTypeParamDto,
  SaveMasterTableDto,
} from './dto/master-table.dto';

@Controller('products/master-tables')
@UseGuards(JwtAuthGuard)
export class MasterTablesController {
  constructor(private readonly masterTablesService: MasterTablesService) { }

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

  @Post(':masterType/find-one')
  findOne(@Param() params: MasterTableTypeParamDto, @Body() dto: FindOneMasterTableDto) {
    return this.masterTablesService.findOne(params.masterType, dto);
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
  @Put(':masterType/:id')
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


  // @Get('mobile/masters')
  // @TaskPermissions()
  // @ActionPermissions()
  // findMobileMasters(@Query() query: FindDesignMastersQueryDto) {
  //   return this.productsService.findMasters(query);
  // }

  // @Get('lookup/masters')
  // @TaskPermissions()
  // @ActionPermissions()
  // findLookupMasters(@Query() query: FindDesignMastersQueryDto) {
  //   return this.productsService.findMasters(query);
  // }

  // @Get('masters')
  // @TaskPermissions()
  // @AnyActionPermissions(
  //   'master.view',
  //   'dashboard.price_activity.view',
  //   'dashboard.price_activity.gold_price.view',
  // )
  // findMasters(@Query() query: FindDesignMastersQueryDto) {
  //   return this.productsService.findMasters(query);
  // }

  // @Get('masters/export/template')
  // @ActionPermissions('master.import')
  // async exportMasterTemplate(@Query() query: FindDesignMastersQueryDto) {
  //   const file = await this.productsService.exportMasterTemplate(query);
  //   return new StreamableFile(file.buffer, {
  //     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //     disposition: `attachment; filename="${file.fileName}"`,
  //   });
  // }

  // @Get('masters/export')
  // @ActionPermissions('master.view')
  // async exportMasters(@Query() query: FindDesignMastersQueryDto) {
  //   const file = await this.productsService.exportMasters(query);
  //   return new StreamableFile(file.buffer, {
  //     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //     disposition: `attachment; filename="${file.fileName}"`,
  //   });
  // }

  // @Post('masters/import')
  // @ActionPermissions('master.import')
  // @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  // importMasters(
  //   @UploadedFile() file: { buffer?: Buffer; originalname?: string },
  //   @Query() query: FindDesignMastersQueryDto,
  //   @Request() req: { user: AuthUser },
  // ) {
  //   return this.productsService.importMasters(file, query, req.user);
  // }

  // @Post('masters')
  // @ActionPermissions('master.create')
  // createMaster(@Body() dto: CreateDesignMasterDto, @Request() req: { user: AuthUser }) {
  //   return this.productsService.createMaster(dto, req.user);
  // }

  // @Put('masters/:id')
  // @TaskPermissions()
  // @AnyActionPermissions('master.edit', 'dashboard.price_activity.gold_price.update')
  // updateMaster(
  //   @Param('id') id: string,
  //   @Body() dto: UpdateDesignMasterDto,
  //   @Request() req: { user: AuthUser },
  // ) {
  //   return this.productsService.updateMaster(id, dto, req.user);
  // }

  // @Patch('masters/:id/status')
  // @ActionPermissions('master.status_update')
  // updateMasterStatus(
  //   @Param('id') id: string,
  //   @Body() dto: UpdateDesignMasterStatusDto,
  //   @Request() req: { user: AuthUser },
  // ) {
  //   return this.productsService.updateMasterStatus(id, dto.isActive, req.user);
  // }

  // @Get('masters/:id/price-history')
  // @TaskPermissions()
  // @ActionPermissions()
  // getMetalPriceHistory(@Param('id') id: string) {
  //   return this.productsService.getMetalPriceHistory(id);
  // }


    // @Get('packets')
    // @TaskPermissions()
    // @ActionPermissions()
    // findPackets(@Query() query: FindPacketsQueryDto) {
    //   return this.productsService.findPackets(query);
    // }

    //  @Get('packets/export/template')
    //   async exportPacketTemplate() {
    //     const file = await this.productsService.exportPacketTemplate();
    //     return new StreamableFile(file.buffer, {
    //       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    //       disposition: `attachment; filename="${file.fileName}"`,
    //     });
    //   }
    
    //   @Get('packets/export')
    //   async exportPackets(@Query() query: FindPacketsQueryDto) {
    //     const file = await this.productsService.exportPackets(query);
    //     return new StreamableFile(file.buffer, {
    //       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    //       disposition: `attachment; filename="${file.fileName}"`,
    //     });
    //   }
    
    //   @Post('packets/import')
    //   @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
    //   importPackets(
    //     @UploadedFile() file: { buffer?: Buffer; originalname?: string },
    //     @Request() req: { user: AuthUser },
    //   ) {
    //     return this.productsService.importPackets(file, req.user);
    //   }
    
    //   @Post('packets')
    //   createPacket(@Body() dto: CreateStonePacketDto, @Request() req: { user: AuthUser }) {
    //     return this.productsService.createPacket(dto, req.user);
    //   }
    
    //   @Get('packets/:id')
    //   @TaskPermissions()
    //   @ActionPermissions()
    //   getPacket(@Param('id') id: string) {
    //     return this.productsService.getPacket(id);
    //   }
    

}
