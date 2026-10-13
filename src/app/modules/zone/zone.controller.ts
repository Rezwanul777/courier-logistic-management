
import { catchAsync } from "../../utils/catchAsync";
import { ZoneService } from "./zone.service";

const createZone = catchAsync(async (req, res) => {
  const data = await ZoneService.createZone(req.body);
  res.status(201).json({
    success: true,
    message: "Zone created successfully.",
    data,
  });
});

const getZones = catchAsync(async (_req, res) => {
  const data = await ZoneService.getZones();
  res.status(200).json({
    success: true,
    message: "Zones retrieved successfully.",
    data,
  });
});

const getAdminZones = catchAsync(async (req, res) => {
  const data = await ZoneService.getAdminZones(req.query);
  res.status(200).json({
    success: true,
    message: "Admin zones retrieved successfully.",
    data,
  });
});

const updateZone = catchAsync(async (req, res) => {
  const data = await ZoneService.updateZone(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Zone updated successfully.",
    data,
  });
});

const deleteZone = catchAsync(async (req, res) => {
  const data = await ZoneService.deleteZone(
    Number(req.params.id),
  );
  res.status(200).json({
    success: true,
    message: "Zone archived successfully.",
    data,
  });
});

export const ZoneController = {
  createZone,
  getZones,
  getAdminZones,
  updateZone,
  deleteZone,
};
