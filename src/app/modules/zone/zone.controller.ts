import { Request, Response } from "express";
import { ZoneService } from "./zone.service";


const createZone = async(
 req:Request,
 res:Response
)=>{

const result =
 await ZoneService.createZone(
  req.body
 );


res.status(201).json({
 success:true,
 message:"Zone created successfully",
 data:result,
});

};



const getZones =
async(req:Request,res:Response)=>{


const result =
 await ZoneService.getZones();


res.json({
 success:true,
 message:"Zones retrieved",
 data:result,
});


};



const getAdminZones =
async(req:Request,res:Response)=>{


const result =
 await ZoneService.getAdminZones(
  req.query
 );


res.json({
 success:true,
 message:"Zones retrieved",
 data:result,
});


};



const updateZone =
async(req:Request,res:Response)=>{


const result =
 await ZoneService.updateZone(
 Number(req.params.id),
 req.body
 );


res.json({
 success:true,
 message:"Zone updated",
 data:result,
});


};



const deleteZone =
async(req:Request,res:Response)=>{


const result =
 await ZoneService.deleteZone(
 Number(req.params.id)
 );


res.json({
 success:true,
 message:"Zone deleted",
 data:result,
});


};



export const ZoneController={
 createZone,
 getZones,
 getAdminZones,
 updateZone,
 deleteZone,
};
