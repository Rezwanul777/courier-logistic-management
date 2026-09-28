import {Router} from "express";

import {auth} from "../../middleware/checkAuth";
import {validateRequest} from "../../middleware/validateRequest";

import {ZoneController} from "./zone.controller";
import {ZoneValidation} from "./zone.validation";


const router=Router();





router.get(
 "/",
 ZoneController.getZones
);



export const AdminZoneRoutes=
Router();


AdminZoneRoutes.use(
 auth("ADMIN")
);


AdminZoneRoutes.post(
 "/",
 validateRequest(
  ZoneValidation.createZone
 ),
 ZoneController.createZone
);


AdminZoneRoutes.get(
 "/",
 ZoneController.getAdminZones
);


AdminZoneRoutes.patch(
 "/:id",
 validateRequest(
  ZoneValidation.updateZone
 ),
 ZoneController.updateZone
);


AdminZoneRoutes.delete(
 "/:id",
 ZoneController.deleteZone
);


export const ZoneRoutes=router;
