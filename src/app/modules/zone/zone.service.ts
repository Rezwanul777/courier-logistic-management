import { prisma } from "../../lib/prisma";
import {
  ICreateZone,
  IUpdateZone,
} from "./zone.interface";


const createZone = async (
  payload: ICreateZone
) => {

  return await prisma.zone.create({
    data: payload,
  });

};


const getZones = async () => {

  return await prisma.zone.findMany({
    where:{
      deletedAt:null,
    },
    orderBy:{
      createdAt:"desc",
    },
  });

};


const getAdminZones = async (
  query:any
)=>{

  const page =
    Number(query.page) || 1;

  const limit =
    Number(query.limit) || 10;


  const skip =
    (page-1)*limit;


  const where:any = {
    deletedAt:null,
  };


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

      prisma.zone.findMany({
        where,
        skip,
        take:limit,
        orderBy:{
          createdAt:"desc",
        },
      }),

      prisma.zone.count({
        where,
      }),

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



const updateZone = async(
 id:number,
 payload:IUpdateZone
)=>{

 return await prisma.zone.update({
  where:{
    id,
  },
  data:payload,
 });

};



const deleteZone = async(
 id:number
)=>{

 return await prisma.zone.update({
  where:{
    id,
  },
  data:{
    deletedAt:new Date(),
  },
 });

};



export const ZoneService={
 createZone,
 getZones,
 getAdminZones,
 updateZone,
 deleteZone,
};
