
import { catchAsync } from "../../utils/catchAsync";
import { HubService } from "./hub.service";

const createHub = catchAsync(async (req, res) => {
  const data = await HubService.createHub(req.body);
  res.status(201).json({
    success: true,
    message: "Hub created successfully.",
    data,
  });
});

const getActiveHubs = catchAsync(async (_req, res) => {
  const data = await HubService.getActiveHubs();
  res.status(200).json({
    success: true,
    message: "Hubs retrieved successfully.",
    data,
  });
});

const getAdminHubs = catchAsync(async (req, res) => {
  const data = await HubService.getAdminHubs(req.query);
  res.status(200).json({
    success: true,
    message: "Admin hubs retrieved successfully.",
    data,
  });
});

const updateHub = catchAsync(async (req, res) => {
  const data = await HubService.updateHub(
    Number(req.params.id),
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Hub updated successfully.",
    data,
  });
});

const deleteHub = catchAsync(async (req, res) => {
  const data = await HubService.deleteHub(
    Number(req.params.id),
  );
  res.status(200).json({
    success: true,
    message: "Hub archived successfully.",
    data,
  });
});

export const HubController = {
  createHub,
  getActiveHubs,
  getAdminHubs,
  updateHub,
  deleteHub,
};
