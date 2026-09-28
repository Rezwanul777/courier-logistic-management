import { prisma } from "../../lib/prisma";
import {
  ICreateHub,
  IUpdateHub,
} from "./hub.interface";



const createHub = async (
  payload: ICreateHub
) => {


  const zone = await prisma.zone.findFirst({
    where:{
      id: payload.zoneId,
      deletedAt:null,
    },
  });


  if(!zone){
    throw new Error(
      "Zone not found"
    );
  }



  const hub = await prisma.hub.create({

    data:{
      code: payload.code,
      name: payload.name,
      address: payload.address,
      zoneId: payload.zoneId,
    },

    include:{
      zone:true,
    },

  });


  return hub;

};





const getActiveHubs = async()=>{


 return await prisma.hub.findMany({

  where:{
    deletedAt:null,
  },

  include:{
    zone:true,
  },

  orderBy:{
    createdAt:"desc",
  },

 });


};






const getAdminHubs = async(
 query:any
)=>{


const page =
 Number(query.page) || 1;


const limit =
 Number(query.limit) || 10;


const skip =
 (page-1)*limit;



const where:any={};


if(query.search){

 where.OR=[

 {
  name:{
   contains:query.search,
   mode:"insensitive",
  },
 },

 {
  code:{
   contains:query.search,
   mode:"insensitive",
  },
 },

 ];

}



const [items,total]=
await prisma.$transaction([


 prisma.hub.findMany({

  where:{
   ...where,
   deletedAt:null,
  },

  include:{
    zone:true,
  },

  skip,
  take:limit,

  orderBy:{
   createdAt:"desc",
  },

 }),



 prisma.hub.count({

  where:{
   ...where,
   deletedAt:null,
  },

 })


]);



return {

 items,

 pagination:{

  page,

  limit,

  total,

  totalPages:
   Math.ceil(total/limit),

 }

};


};







const updateHub = async(
 id:number,
 payload:IUpdateHub
)=>{


return await prisma.hub.update({

 where:{
  id,
 },

 data:payload,

});


};







const deleteHub = async(
 id:number
)=>{


return await prisma.hub.update({

 where:{
  id,
 },

 data:{
  deletedAt:new Date(),
 },

});


};






export const HubService={

 createHub,

 getActiveHubs,

 getAdminHubs,

 updateHub,

 deleteHub,

};
