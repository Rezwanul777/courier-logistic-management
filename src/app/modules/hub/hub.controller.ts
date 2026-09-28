import { Request, Response } from "express";
import { HubService } from "./hub.service";



const createHub =
async(
req:Request,
res:Response
)=>{


const result =
await HubService.createHub(
 req.body
);


res.status(201).json({

 success:true,

 message:"Hub created successfully",

 data:result,

});


};





const getActiveHubs =
async(
req:Request,
res:Response
)=>{


const result =
await HubService.getActiveHubs();


res.json({

 success:true,

 message:"Hubs retrieved",

 data:result,

});


};







const getAdminHubs =
async(
req:Request,
res:Response
)=>{


const result =
await HubService.getAdminHubs(
 req.query
);



res.json({

 success:true,

 message:"Admin hubs retrieved",

 data:result,

});


};







const updateHub =
async(
req:Request,
res:Response
)=>{


const result =
await HubService.updateHub(

 Number(req.params.id),

 req.body

);



res.json({

 success:true,

 message:"Hub updated",

 data:result,

});


};






const deleteHub =
async(
req:Request,
res:Response
)=>{


const result =
await HubService.deleteHub(

 Number(req.params.id)

);



res.json({

 success:true,

 message:"Hub deleted",

 data:result,

});


};





export const HubController={

 createHub,

 getActiveHubs,

 getAdminHubs,

 updateHub,

 deleteHub,

};
