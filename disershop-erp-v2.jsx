import { useState, useMemo } from "react";

const FOLIOS = [
  { folio:"2676", merc:"ROPA ALTA VISIBILIDAD", prov:"JACK", linea:"Textil", cat:"Ropa de trabajo", conf:"3/4/2025", etd:"15/7/2025", eta:"26/9/2025", fob:13600, sena:4080, balance:9520, despacho:491454, flete:1297, prioridad:"Media", tipo:"FCL" },
  { folio:"2677", merc:"GORROS", prov:"VICKY", linea:"Textil", cat:"Gorros", conf:"13/5/2025", etd:"7/9/2025", eta:"7/11/2025", fob:70554, sena:21166, balance:49388, despacho:1808577, flete:2000, prioridad:"Media", tipo:"FCL" },
  { folio:"2682", merc:"GORROS", prov:"CATHY", linea:"Textil", cat:"Gorros", conf:"13/5/2025", etd:"10/9/2025", eta:"17/11/2025", fob:50150, sena:15045, balance:35105, despacho:1345237, flete:2000, prioridad:"Media", tipo:"LCL" },
  { folio:"2684", merc:"MATRÍCULAS", prov:"ALICE", linea:"Otros", cat:"Matriculas", conf:"8/5/2025", etd:"10/8/2025", eta:"17/9/2025", fob:72127, sena:21402, balance:50725, despacho:1769603, flete:600, prioridad:"Alta", tipo:"LCL" },
  { folio:"2693", merc:"PISOS MODULARES", prov:"MARY", linea:"Otros", cat:"Pisos modulares", conf:"27/5/2025", etd:"28/8/2025", eta:"3/11/2025", fob:11839, sena:3508, balance:8331, despacho:364010, flete:2500, prioridad:"Alta", tipo:"LCL" },
  { folio:"2699", merc:"BOLSOS YUTE", prov:"MANISH", linea:"Merchandising", cat:"Bolsos", conf:"30/5/2025", etd:"28/9/2025", eta:"24/11/2025", fob:39894, sena:12419, balance:27475, despacho:1453517, flete:2300, prioridad:"Alta", tipo:"LCL" },
  { folio:"2701", merc:"SOMBRILLAS", prov:"LEWIS", linea:"Outdoor", cat:"Sombrillas", conf:"6/6/2025", etd:"2/9/2025", eta:"13/10/2025", fob:17760, sena:5328, balance:12432, despacho:574738, flete:3000, prioridad:"Media", tipo:"LCL" },
  { folio:"2704", merc:"SILLAS", prov:"KEVIN", linea:"Outdoor", cat:"Mesas y sillas", conf:"9/6/2025", etd:"31/7/2025", eta:"21/9/2025", fob:27454, sena:7895, balance:19559, despacho:874863, flete:3500, prioridad:"Alta", tipo:"FCL" },
  { folio:"2705", merc:"PAPEL TRANSFER", prov:"MICHAEL", linea:"Insumos", cat:"Papelería", conf:"9/6/2025", etd:"17/7/2025", eta:"25/9/2025", fob:14269, sena:4379, balance:9891, despacho:360923, flete:400, prioridad:"Alta", tipo:"LCL" },
  { folio:"2706", merc:"DELANTALES", prov:"LISA", linea:"Merchandising", cat:"Delantales", conf:"9/6/2025", etd:"16/10/2025", eta:"25/11/2025", fob:14340, sena:3727, balance:10613, despacho:479493, flete:1600, prioridad:"Urgente", tipo:"LCL" },
  { folio:"2707", merc:"PELOTAS", prov:"SHALLY", linea:"Merchandising", cat:"Pelotas", conf:"9/6/2025", etd:"--", eta:"--", fob:29420, sena:8826, balance:20594, despacho:918139, flete:3000, prioridad:"Media", tipo:"LCL" },
  { folio:"2708", merc:"CAMISETAS DRY", prov:"PETER", linea:"Textil", cat:"Camisetas", conf:"9/6/2025", etd:"9/9/2025", eta:"15/10/2025", fob:219141, sena:63867, balance:108692, despacho:7469660, flete:9000, prioridad:"Alta", tipo:"FCL" },
  { folio:"2709", merc:"BLANCOS SUBLIMACIÓN", prov:"LILY", linea:"Sublimación", cat:"Blancos", conf:"13/5/2025", etd:"27/6/2025", eta:"15/10/2025", fob:81767, sena:0, balance:81767, despacho:2152274, flete:6500, prioridad:"Alta", tipo:"FCL" },
  { folio:"2710", merc:"LAPICERAS", prov:"TINA", linea:"Merchandising", cat:"Lapiceras", conf:"3/7/2025", etd:"2/9/2025", eta:"13/10/2025", fob:40302, sena:10921, balance:29381, despacho:1051117, flete:6500, prioridad:"Alta", tipo:"LCL" },
  { folio:"2717", merc:"PAPEL FOTO", prov:"SUMMER", linea:"Insumos", cat:"Papelería", conf:"26/6/2025", etd:"23/9/2025", eta:"7/11/2025", fob:74498, sena:20393, balance:54105, despacho:1690597, flete:12000, prioridad:"Urgente", tipo:"LCL" },
  { folio:"2718", merc:"TINTAS COREANAS", prov:"DEAN", linea:"Insumos", cat:"Tintas", conf:"29/7/2025", etd:"22/8/2025", eta:"16/10/2025", fob:6000, sena:0, balance:6000, despacho:136640, flete:500, prioridad:"Media", tipo:"LCL" },
  { folio:"2720", merc:"AZULEJOS", prov:"JOANNA", linea:"Sublimación", cat:"Blancos", conf:"16/5/2025", etd:"24/8/2025", eta:"12/10/2025", fob:10517, sena:3155, balance:7362, despacho:295798, flete:700, prioridad:"Media", tipo:"LCL" },
  { folio:"2721", merc:"TOALLAS DEPORTIVAS", prov:"APRIL", linea:"Merchandising", cat:"Toallas", conf:"24/6/2025", etd:"25/8/2025", eta:"14/10/2025", fob:8690, sena:2480, balance:6210, despacho:304899, flete:1200, prioridad:"Media", tipo:"LCL" },
  { folio:"2722", merc:"PARAGUAS", prov:"VIVIAN", linea:"Merchandising", cat:"Paraguas", conf:"12/6/2025", etd:"24/8/2025", eta:"12/10/2025", fob:9443, sena:0, balance:9443, despacho:271243, flete:800, prioridad:"Media", tipo:"LCL" },
  { folio:"2723", merc:"CAMISETAS Y FELPA", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"18/4/2025", etd:"13/8/2025", eta:"26/9/2025", fob:108310, sena:54155, balance:54155, despacho:3705029, flete:5096, prioridad:"Alta", tipo:"FCL" },
  { folio:"2724", merc:"BLANCOS SUB 2do", prov:"LILY", linea:"Sublimación", cat:"Blancos", conf:"13/5/2025", etd:"12/8/2025", eta:"25/9/2025", fob:22398, sena:0, balance:22398, despacho:1552775, flete:4000, prioridad:"Alta", tipo:"LCL" },
  { folio:"2728", merc:"PRENSAS", prov:"JESSICA", linea:"Sublimación", cat:"Prensas", conf:"23/7/2025", etd:"13/10/2025", eta:"2/12/2025", fob:58137, sena:11627, balance:46510, despacho:914626, flete:5000, prioridad:"Alta", tipo:"FCL" },
  { folio:"2729", merc:"CASACAS Y TÚNICAS", prov:"ELLIE", linea:"Textil", cat:"Empresariales", conf:"20/6/2025", etd:"7/10/2025", eta:"9/12/2025", fob:43438, sena:13031, balance:31747, despacho:1546056, flete:3000, prioridad:"Alta", tipo:"LCL" },
  { folio:"2735", merc:"FELPA Y CAMISETAS 1er", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"6/6/2025", etd:"23/9/2025", eta:"19/11/2025", fob:217570, sena:112131, balance:107242, despacho:7384998, flete:3000, prioridad:"Alta", tipo:"FCL" },
  { folio:"2736", merc:"CAMISETAS 2do envio", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"6/6/2025", etd:"21/9/2025", eta:"12/11/2025", fob:109926, sena:55862, balance:54065, despacho:3697533, flete:2400, prioridad:"Media", tipo:"FCL" },
  { folio:"2737", merc:"CAMISETAS 3er envio", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"6/6/2025", etd:"27/9/2025", eta:"8/11/2025", fob:128596, sena:64298, balance:64298, despacho:4310795, flete:2400, prioridad:"Media", tipo:"FCL" },
  { folio:"2738", merc:"SOMBRILLONES", prov:"AMY", linea:"Outdoor", cat:"Sombrillas", conf:"21/8/2025", etd:"16/10/2025", eta:"25/11/2025", fob:6505, sena:1952, balance:4554, despacho:186718, flete:1500, prioridad:"Media", tipo:"LCL" },
  { folio:"2740", merc:"DESARROLLOS VERANO", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"22/7/2025", etd:"25/10/2025", eta:"2/1/2026", fob:122581, sena:61291, balance:61291, despacho:3991474, flete:2500, prioridad:"Alta", tipo:"FCL" },
  { folio:"2741", merc:"PAPEL FOTO", prov:"SUMMER", linea:"Insumos", cat:"Papelería", conf:"6/10/2025", etd:"2/11/2025", eta:"17/12/2025", fob:56161, sena:16848, balance:39313, despacho:1308800, flete:2400, prioridad:"Media", tipo:"LCL" },
  { folio:"2742", merc:"IMANES", prov:"WENDY", linea:"Insumos", cat:"Papelería", conf:"2/9/2025", etd:"--", eta:"--", fob:11540, sena:3462, balance:8078, despacho:306600, flete:1928, prioridad:"Media", tipo:"LCL" },
  { folio:"2743", merc:"CAMISETAS 5to despacho", prov:"IMRAN", linea:"Textil", cat:"Camisetas", conf:"1/6/2025", etd:"12/10/2025", eta:"17/12/2025", fob:256841, sena:51368, balance:205473, despacho:8467488, flete:6000, prioridad:"Media", tipo:"FCL" },
  { folio:"2747", merc:"TAZAS A 1ra carga", prov:"LILY", linea:"Sublimación", cat:"Tazas", conf:"16/10/2025", etd:"27/11/2025", eta:"21/1/2026", fob:13010, sena:13010, balance:0, despacho:386327, flete:1600, prioridad:"Urgente", tipo:"LCL" },
  { folio:"2748", merc:"TAZAS A 2da carga", prov:"LILY", linea:"Sublimación", cat:"Tazas", conf:"16/10/2025", etd:"10/12/2025", eta:"5/2/2026", fob:13010, sena:0, balance:13010, despacho:400521, flete:2500, prioridad:"Media", tipo:"LCL" },
  { folio:"2749", merc:"TAZAS AA", prov:"LILY", linea:"Sublimación", cat:"Tazas", conf:"16/10/2025", etd:"20/11/2025", eta:"16/1/2026", fob:14742, sena:14742, balance:0, despacho:439059, flete:2500, prioridad:"Urgente", tipo:"LCL" },
  { folio:"2750", merc:"FELPA Y CAM 0807", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"7/8/2025", etd:"16/11/2025", eta:"7/1/2026", fob:110601, sena:55300, balance:55300, despacho:3742164, flete:2000, prioridad:"Alta", tipo:"FCL" },
  { folio:"2751", merc:"BLANCOS SUBLIMACIÓN", prov:"LILY", linea:"Sublimación", cat:"Blancos", conf:"21/10/2025", etd:"24/11/2025", eta:"15/1/2026", fob:46605, sena:14293, balance:32312, despacho:1155373, flete:2500, prioridad:"Alta", tipo:"LCL" },
  { folio:"2754", merc:"PAPELES LCL", prov:"SUMMER", linea:"Insumos", cat:"Papelería", conf:"20/11/2025", etd:"--", eta:"--", fob:23040, sena:6912, balance:16128, despacho:513961, flete:1000, prioridad:"Urgente", tipo:"LCL" },
  { folio:"2755", merc:"CAMPERAS 2026", prov:"MICHELLE", linea:"Textil", cat:"Camperas", conf:"23/10/2025", etd:"14/2/2026", eta:"14/4/2026", fob:81142, sena:25156, balance:55986, despacho:0, flete:3000, prioridad:"Alta", tipo:"FCL" },
  { folio:"2757", merc:"FELPA 2026 3er envio", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"7/8/2025", etd:"17/2/2026", eta:"14/4/2026", fob:2331362, sena:0, balance:0, despacho:0, flete:6000, prioridad:"Alta", tipo:"FCL" },
  { folio:"2759", merc:"CAMISETAS DRY", prov:"PETER", linea:"Textil", cat:"Camisetas", conf:"13/11/2025", etd:"25/1/2026", eta:"18/3/2026", fob:83010, sena:24903, balance:64789, despacho:2555827, flete:2500, prioridad:"Alta", tipo:"FCL" },
  { folio:"2760", merc:"SUBLIMACIÓN 1er y 2do", prov:"LILY", linea:"Sublimación", cat:"Blancos", conf:"17/11/2025", etd:"26/12/2025", eta:"25/2/2026", fob:32712, sena:0, balance:32712, despacho:933941, flete:3000, prioridad:"Media", tipo:"LCL" },
  { folio:"2761", merc:"BOLSOS YUTE", prov:"MANISH", linea:"Merchandising", cat:"Bolsos", conf:"23/10/2025", etd:"21/2/2026", eta:"25/4/2026", fob:46905, sena:16097, balance:30809, despacho:0, flete:3000, prioridad:"Media", tipo:"LCL" },
  { folio:"2765", merc:"TINTAS CHINAS", prov:"LILY COLORFLY", linea:"Insumos", cat:"Tintas", conf:"5/12/2025", etd:"13/1/2026", eta:"21/3/2026", fob:8811, sena:2594, balance:6217, despacho:214963, flete:1000, prioridad:"Alta", tipo:"LCL" },
  { folio:"2767", merc:"SUBLIMACIÓN 3er", prov:"LILY", linea:"Sublimación", cat:"Blancos", conf:"17/11/2025", etd:"26/12/2025", eta:"10/2/2026", fob:44449, sena:0, balance:44449, despacho:1076514, flete:3000, prioridad:"Media", tipo:"LCL" },
  { folio:"2770", merc:"PRENSAS", prov:"JESSICA", linea:"Sublimación", cat:"Prensas", conf:"21/11/2025", etd:"11/2/2026", eta:"18/3/2026", fob:43755, sena:0, balance:43755, despacho:719724, flete:2000, prioridad:"Alta", tipo:"FCL" },
  { folio:"2771", merc:"TINTAS COREANAS", prov:"DEAN", linea:"Insumos", cat:"Tintas", conf:"23/12/2025", etd:"15/1/2026", eta:"11/3/2026", fob:7205, sena:7205, balance:0, despacho:164466, flete:500, prioridad:"Urgente", tipo:"LCL" },
  // historico 2024
  { folio:"2578", merc:"CAMPERAS", prov:"MICHELLE", linea:"Textil", cat:"Camperas", conf:"10/10/2024", etd:"--", eta:"--", fob:33424, sena:4853, balance:0, flete:2983, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2624", merc:"SET FUTBOL", prov:"VIKI", linea:"Textil", cat:"Futbol", conf:"17/9/2024", etd:"--", eta:"--", fob:36843, sena:16922, balance:0, flete:1397, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2626", merc:"CAMISETAS", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"3/9/2024", etd:"--", eta:"--", fob:92628, sena:46012, balance:0, flete:4983, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2630", merc:"CAMISETAS", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"1/8/2024", etd:"--", eta:"--", fob:99152, sena:49263, balance:0, flete:5283, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2631", merc:"BOLSOS YUTE", prov:"MANISH", linea:"Merchandising", cat:"Bolsos", conf:"10/10/2024", etd:"--", eta:"--", fob:46390, sena:13917, balance:0, flete:5785, prioridad:"Media", tipo:"LCL", year:2024 },
  { folio:"2632", merc:"PAPEL FOTO", prov:"SUMMER", linea:"Insumos", cat:"Papelería", conf:"15/10/2024", etd:"--", eta:"--", fob:64434, sena:19330, balance:0, flete:4983, prioridad:"Media", tipo:"LCL", year:2024 },
  { folio:"2634", merc:"CAMISETAS DRY", prov:"PETER", linea:"Textil", cat:"Camisetas", conf:"4/10/2024", etd:"--", eta:"--", fob:80376, sena:17740, balance:0, flete:6631, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2635", merc:"CAMPERAS INFLADAS", prov:"RODICK", linea:"Textil", cat:"Camperas", conf:"2/10/2024", etd:"--", eta:"--", fob:220779, sena:58589, balance:0, flete:15915, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2636", merc:"TERMOS Y MATES", prov:"JHON", linea:"Sublimación", cat:"Blancos", conf:"29/10/2024", etd:"--", eta:"--", fob:60000, sena:18000, balance:0, flete:4261, prioridad:"Media", tipo:"LCL", year:2024 },
  { folio:"2637", merc:"MOCHILAS", prov:"LEO", linea:"Merchandising", cat:"Mochilas", conf:"12/11/2024", etd:"--", eta:"--", fob:34860, sena:10458, balance:0, flete:5384, prioridad:"Media", tipo:"LCL", year:2024 },
  { folio:"2641", merc:"BLANCOS SUBLIMACIÓN", prov:"LILY", linea:"Sublimación", cat:"Blancos", conf:"14/11/2024", etd:"--", eta:"--", fob:103944, sena:32549, balance:0, flete:5434, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2643", merc:"GORROS", prov:"VICKY", linea:"Textil", cat:"Gorros", conf:"26/11/2024", etd:"--", eta:"--", fob:67890, sena:20367, balance:0, flete:5500, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2644", merc:"LAPICERAS", prov:"TINA", linea:"Merchandising", cat:"Lapiceras", conf:"19/11/2024", etd:"--", eta:"--", fob:65749, sena:19275, balance:0, flete:5584, prioridad:"Media", tipo:"LCL", year:2024 },
  { folio:"2647", merc:"FELPA", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"3/9/2024", etd:"--", eta:"--", fob:154568, sena:75663, balance:0, flete:10324, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2649", merc:"CAMISETAS", prov:"PAUL", linea:"Textil", cat:"Camisetas", conf:"28/11/2024", etd:"--", eta:"--", fob:115110, sena:33868, balance:0, flete:2660, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2652", merc:"CAMISETAS", prov:"IMRAN", linea:"Textil", cat:"Camisetas", conf:"5/12/2024", etd:"--", eta:"--", fob:224687, sena:67406, balance:0, flete:5854, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2654", merc:"POLAR", prov:"SHEERY", linea:"Textil", cat:"Polar", conf:"6/5/2024", etd:"--", eta:"--", fob:50487, sena:25243, balance:0, flete:5283, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2655", merc:"FELPA", prov:"SHEERY", linea:"Textil", cat:"Camisetas", conf:"3/9/2024", etd:"--", eta:"--", fob:157239, sena:78619, balance:0, flete:10524, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2665", merc:"POLAR", prov:"SHEERY", linea:"Textil", cat:"Polar", conf:"3/9/2024", etd:"--", eta:"--", fob:181765, sena:90882, balance:0, flete:12140, prioridad:"Media", tipo:"FCL", year:2024 },
  { folio:"2666", merc:"ROPA TRABAJO", prov:"IMRAN", linea:"Textil", cat:"Empresariales", conf:"28/11/2024", etd:"--", eta:"--", fob:109929, sena:38953, balance:0, flete:3400, prioridad:"Media", tipo:"FCL", year:2024 },
];

const PRODUCTOS_DEV = [
  { id:"DEV-001", nombre:"Campera Técnica Invierno 2026", codigo:"CAM-TEC-26", prov:"MICHELLE", linea:"Textil", coleccion:"Invierno 2026", prioridad:"Alta", costoObj:28, costoReal:31.5, etapa:5, inicio:"2025-03-01", fin:"2025-10-15" },
  { id:"DEV-002", nombre:"Buzo Premium Algodón Peinado", codigo:"BUZ-ALC-26", prov:"SHEERY", linea:"Textil", coleccion:"Básicos 2026", prioridad:"Alta", costoObj:22, costoReal:0, etapa:6, inicio:"2025-04-01", fin:"2025-11-01" },
  { id:"DEV-003", nombre:"Taza Mágica Premium", codigo:"TAZ-MAG-01", prov:"LILY", linea:"Sublimación", coleccion:"Blancos 2026", prioridad:"Media", costoObj:4.5, costoReal:0, etapa:3, inicio:"2025-05-15", fin:"2025-12-01" },
  { id:"DEV-004", nombre:"Bolso Corporativo Yute XL", codigo:"BOL-YUT-XL", prov:"MANISH", linea:"Merchandising", coleccion:"Corporate 2026", prioridad:"Media", costoObj:8, costoReal:9.2, etapa:9, inicio:"2025-02-01", fin:"2025-09-30" },
  { id:"DEV-005", nombre:"Polar Fleece 380gr", codigo:"POL-380-26", prov:"SHEERY", linea:"Textil", coleccion:"Invierno 2026", prioridad:"Urgente", costoObj:35, costoReal:37.8, etapa:11, inicio:"2025-01-15", fin:"2025-08-30" },
  { id:"DEV-006", nombre:"Prensa Sublimación 40x50", codigo:"PRE-405-01", prov:"JESSICA", linea:"Sublimación", coleccion:"Equipos 2026", prioridad:"Alta", costoObj:180, costoReal:195, etapa:10, inicio:"2025-03-20", fin:"2025-10-30" },
  { id:"DEV-007", nombre:"Camiseta Performance UV+50", codigo:"CAM-UV-26", prov:"PETER", linea:"Textil", coleccion:"Deportivo 2026", prioridad:"Media", costoObj:12, costoReal:0, etapa:1, inicio:"2025-06-01", fin:"2026-01-15" },
  { id:"DEV-008", nombre:"Sombrilla Telescópica 3m", codigo:"SOM-TEL-3M", prov:"LEWIS", linea:"Outdoor", coleccion:"Outdoor 2026", prioridad:"Baja", costoObj:45, costoReal:0, etapa:2, inicio:"2025-06-15", fin:"2026-02-01" },
  { id:"DEV-009", nombre:"Gorro Técnico Invierno", codigo:"GOR-TEC-26", prov:"VICKY", linea:"Textil", coleccion:"Invierno 2026", prioridad:"Alta", costoObj:9, costoReal:10.5, etapa:8, inicio:"2025-02-15", fin:"2025-09-15" },
  { id:"DEV-010", nombre:"Lapicera Metálica Premium", codigo:"LAP-MET-26", prov:"TINA", linea:"Merchandising", coleccion:"Corporate 2026", prioridad:"Media", costoObj:3.5, costoReal:0, etapa:4, inicio:"2025-05-01", fin:"2025-12-15" },
];

const ETAPAS = ["Idea","Research","Diseño","Dev. técnico","Tech Pack","Sample req.","Sample recv.","Revisión","Correcciones","Negociación","Aprobación","Prod. piloto","Prod. masiva","QA","Embarque","Lanzamiento"];
const MESES_N = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const fmt = n => "$" + Math.round(n).toLocaleString("es-UY");
const fmtUYU = n => "$" + Math.round(n).toLocaleString("es-UY") + " UYU";

const parseDate = s => {
  if (!s || s === "--" || s === "#N/A") return null;
  const p = s.split("/");
  if (p.length !== 3) return null;
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
};

const PRIO = {
  Urgente: { bg:"#FCEBEB", c:"#A32D2D" },
  Alta:    { bg:"#FAEEDA", c:"#854F0B" },
  Media:   { bg:"#E6F1FB", c:"#185FA5" },
  Baja:    { bg:"#EAF3DE", c:"#3B6D11" },
};

function PTag({ p }) {
  const s = PRIO[p] || PRIO.Media;
  return <span style={{ fontSize:11, fontWeight:500, padding:"2px 7px", borderRadius:4, background:s.bg, color:s.c, whiteSpace:"nowrap" }}>{p}</span>;
}

function KCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", padding:"11px 13px" }}>
      <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:4, textTransform:"uppercase", letterSpacing:".07em" }}>{label}</div>
      <div style={{ fontSize:19, fontWeight:500, color: accent || "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function TabNav({ active, onChange }) {
  return (
    <div style={{ display:"flex", borderBottom:"0.5px solid var(--color-border-tertiary)", marginBottom:22 }}>
      {[{id:"deposito",ic:"ti-package",lb:"Depósito"},{id:"comex",ic:"ti-chart-bar",lb:"ComEx"},{id:"producto",ic:"ti-paint",lb:"Producto"}].map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          display:"flex", alignItems:"center", gap:7, padding:"9px 18px",
          border:"none", borderBottom: active===t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
          background:"transparent", cursor:"pointer", fontSize:13, fontWeight: active===t.id ? 500 : 400,
          color: active===t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          marginBottom:"-1px", fontFamily:"var(--font-sans)"
        }}>
          <i className={`ti ${t.ic}`} style={{ fontSize:15 }} aria-hidden />{t.lb}
        </button>
      ))}
    </div>
  );
}

function Btn({ active, onClick, children, accent }) {
  return (
    <button onClick={onClick} style={{
      padding:"6px 14px", fontSize:12, border:"0.5px solid var(--color-border-secondary)",
      borderRadius:"var(--border-radius-md)", cursor:"pointer", fontFamily:"var(--font-sans)",
      background: active ? (accent || "var(--color-text-primary)") : "var(--color-background-primary)",
      color: active ? (accent ? "#fff" : "var(--color-background-primary)") : "var(--color-text-secondary)"
    }}>{children}</button>
  );
}

// ══════════════════════════════════════════════════════════════
// DEPÓSITO — Calendario de llegadas
// ══════════════════════════════════════════════════════════════
function Deposito() {
  const TODAY = new Date(2025, 9, 15);
  const [view, setView] = useState("semana");
  const [calNav, setCalNav] = useState({ y:2025, m:9 });

  const withETA = useMemo(() =>
    FOLIOS.map(f => ({ ...f, etaDate: parseDate(f.eta) })).filter(f => f.etaDate),
  []);

  const weekStart = useMemo(() => {
    const d = new Date(TODAY);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0,0,0,0);
    return d;
  }, []);
  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate()+6); d.setHours(23,59,59,999); return d; }, [weekStart]);
  const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const monthEnd   = new Date(TODAY.getFullYear(), TODAY.getMonth()+1, 0, 23,59,59);
  const next60End  = new Date(TODAY); next60End.setDate(next60End.getDate()+60);

  const thisWeek  = withETA.filter(f => f.etaDate >= weekStart && f.etaDate <= weekEnd);
  const thisMonth = withETA.filter(f => f.etaDate >= monthStart && f.etaDate <= monthEnd);
  const next60    = withETA.filter(f => f.etaDate > TODAY && f.etaDate <= next60End);

  // mapa día → cargas para calendario
  const byDay = useMemo(() => {
    const m = {};
    withETA.forEach(f => {
      const k = f.etaDate.toDateString();
      if (!m[k]) m[k] = [];
      m[k].push(f);
    });
    return m;
  }, [withETA]);

  const calDays = useMemo(() => {
    const { y, m } = calNav;
    const first = new Date(y, m, 1);
    const last  = new Date(y, m+1, 0);
    const offset = (first.getDay() || 7) - 1;
    const days = [];
    for (let i=0; i<offset; i++) days.push(null);
    for (let d=1; d<=last.getDate(); d++) days.push(new Date(y, m, d));
    return days;
  }, [calNav]);

  const TC = { FCL:"#378ADD", LCL:"#1D9E75" };

  const Chip = ({ f }) => (
    <div style={{
      background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-secondary)",
      borderLeft:`3px solid ${TC[f.tipo]||"#888"}`, borderRadius:"var(--border-radius-md)",
      padding:"9px 12px", marginBottom:8
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <div style={{ display:"flex", gap:7, alignItems:"center" }}>
          <span style={{ fontSize:10, fontWeight:500, padding:"2px 6px", borderRadius:3, background:f.tipo==="FCL"?"#E6F1FB":"#E1F5EE", color:TC[f.tipo] }}>{f.tipo}</span>
          <span style={{ fontSize:12, fontWeight:500, color:"var(--color-text-info)" }}>#{f.folio}</span>
        </div>
        <PTag p={f.prioridad} />
      </div>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{f.merc}</div>
      <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>{f.prov} · {f.linea} · ETA: <strong>{f.eta}</strong></div>
      {f.balance > 0 && <div style={{ fontSize:11, color:"#A32D2D", marginTop:3 }}>Balance pendiente: {fmt(f.balance)}</div>}
    </div>
  );

  // ── Vista semana ──
  const VistaSemana = () => {
    const dias = [];
    for (let i=0; i<7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate()+i);
      dias.push({ d, cargas: withETA.filter(f => f.etaDate.toDateString()===d.toDateString()), isToday: d.toDateString()===TODAY.toDateString() });
    }
    const dn = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:20 }}>
          {dias.map(({ d, cargas, isToday }, i) => (
            <div key={i} style={{ background: isToday?"var(--color-background-secondary)":"var(--color-background-primary)", border: isToday?"1px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-md)", padding:"8px 6px", minHeight:110 }}>
              <div style={{ fontSize:9, textTransform:"uppercase", color:"var(--color-text-tertiary)", marginBottom:3 }}>{dn[i]}</div>
              <div style={{ fontSize:17, fontWeight:500, marginBottom:6, color: isToday?"var(--color-text-primary)":"var(--color-text-secondary)" }}>{d.getDate()}</div>
              {cargas.map(f => (
                <div key={f.folio} style={{ fontSize:9, padding:"2px 4px", borderRadius:2, marginBottom:3, background:TC[f.tipo]+"22", borderLeft:`2px solid ${TC[f.tipo]}`, lineHeight:1.3, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }} title={f.merc}>
                  <strong>{f.folio}</strong> {f.merc.slice(0,10)}
                </div>
              ))}
              {!cargas.length && <div style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>—</div>}
            </div>
          ))}
        </div>
        {thisWeek.length > 0
          ? <><div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Detalle cargas esta semana</div>{thisWeek.map(f => <Chip key={f.folio} f={f} />)}</>
          : <div style={{ textAlign:"center", padding:"40px 0", color:"var(--color-text-tertiary)", fontSize:13 }}>Sin cargas confirmadas para esta semana.</div>
        }
      </div>
    );
  };

  // ── Vista mes ──
  const VistaMes = () => {
    const diasUnicos = [...new Set(thisMonth.map(f=>f.etaDate.getDate()))].sort((a,b)=>a-b);
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:18 }}>
          <KCard label="Cargas este mes" value={thisMonth.length} />
          <KCard label="Contenedores FCL" value={thisMonth.filter(f=>f.tipo==="FCL").length} accent="#185FA5" />
          <KCard label="Consolidados LCL" value={thisMonth.filter(f=>f.tipo==="LCL").length} accent="#3B6D11" />
          <KCard label="Urgentes" value={thisMonth.filter(f=>f.prioridad==="Urgente").length} accent="#A32D2D" />
          <KCard label="FOB mes" value={fmt(thisMonth.reduce((s,f)=>s+f.fob,0))} />
        </div>
        {!diasUnicos.length
          ? <div style={{ textAlign:"center", padding:"40px 0", color:"var(--color-text-tertiary)", fontSize:13 }}>Sin ETAs confirmados este mes.</div>
          : diasUnicos.map(dia => {
            const cargasDia = thisMonth.filter(f=>f.etaDate.getDate()===dia);
            const fecha = new Date(TODAY.getFullYear(), TODAY.getMonth(), dia);
            return (
              <div key={dia} style={{ marginBottom:18 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--color-background-secondary)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:500 }}>{dia}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{fecha.toLocaleDateString("es-UY",{weekday:"long"})}</div>
                    <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{fecha.toLocaleDateString("es-UY",{day:"numeric",month:"long"})} · {cargasDia.length} carga{cargasDia.length>1?"s":""}</div>
                  </div>
                </div>
                <div style={{ paddingLeft:42 }}>
                  {cargasDia.map(f => <Chip key={f.folio} f={f} />)}
                </div>
              </div>
            );
          })
        }
      </div>
    );
  };

  // ── Calendario grid ──
  const VistaCalendario = () => {
    const dn = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
    const label = new Date(calNav.y, calNav.m).toLocaleDateString("es-UY",{month:"long",year:"numeric"});
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={() => setCalNav(p => { const d = new Date(p.y, p.m-1); return {y:d.getFullYear(),m:d.getMonth()}; })}
            style={{ background:"none", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", padding:"5px 13px", cursor:"pointer", fontSize:14, color:"var(--color-text-secondary)" }}>‹</button>
          <div style={{ fontSize:14, fontWeight:500, textTransform:"capitalize" }}>{label}</div>
          <button onClick={() => setCalNav(p => { const d = new Date(p.y, p.m+1); return {y:d.getFullYear(),m:d.getMonth()}; })}
            style={{ background:"none", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-md)", padding:"5px 13px", cursor:"pointer", fontSize:14, color:"var(--color-text-secondary)" }}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:3 }}>
          {dn.map(d => <div key={d} style={{ fontSize:10, textAlign:"center", color:"var(--color-text-tertiary)", fontWeight:500, padding:"3px 0", textTransform:"uppercase" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
          {calDays.map((d, i) => {
            if (!d) return <div key={"e"+i} style={{ minHeight:70 }} />;
            const k = d.toDateString();
            const cargas = byDay[k] || [];
            const isToday = k === TODAY.toDateString();
            const isPast  = d < TODAY;
            return (
              <div key={k} style={{ minHeight:70, padding:"5px 4px", borderRadius:"var(--border-radius-md)", background: isToday?"var(--color-background-secondary)":"var(--color-background-primary)", border: isToday?"1px solid var(--color-border-primary)":"0.5px solid var(--color-border-tertiary)", opacity: isPast ? 0.55 : 1 }}>
                <div style={{ fontSize:11, fontWeight: isToday?500:400, color: isToday?"var(--color-text-primary)":"var(--color-text-secondary)", marginBottom:3 }}>{d.getDate()}</div>
                {cargas.slice(0,2).map(f => (
                  <div key={f.folio} style={{ fontSize:9, padding:"2px 3px", borderRadius:2, marginBottom:2, background:TC[f.tipo]+"25", borderLeft:`2px solid ${TC[f.tipo]}`, lineHeight:1.2, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }} title={`${f.folio} · ${f.merc} · ${f.tipo}`}>
                    {f.folio} {f.merc.slice(0,7)}
                  </div>
                ))}
                {cargas.length > 2 && <div style={{ fontSize:9, color:"var(--color-text-tertiary)" }}>+{cargas.length-2}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:10, fontSize:11, color:"var(--color-text-secondary)" }}>
          <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:TC.FCL, marginRight:4 }}/>Contenedor FCL</span>
          <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:TC.LCL, marginRight:4 }}/>Consolidado LCL</span>
          <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"var(--color-background-secondary)", border:"1px solid var(--color-border-primary)", marginRight:4 }}/>Hoy</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:20 }}>
        <KCard label="Esta semana" value={thisWeek.length} accent={thisWeek.length>0?"#A32D2D":undefined} sub="cargas por llegar" />
        <KCard label="Este mes" value={thisMonth.length} sub="ETAs confirmados" />
        <KCard label="Próximos 60d" value={next60.length} sub="en pipeline" />
        <KCard label="FCL activos" value={withETA.filter(f=>f.tipo==="FCL").length} accent="#185FA5" />
        <KCard label="LCL activos" value={withETA.filter(f=>f.tipo==="LCL").length} accent="#3B6D11" />
        <KCard label="Sin ETA" value={FOLIOS.length-withETA.length} accent="#854F0B" sub="pendiente de fecha" />
      </div>
      <div style={{ display:"flex", gap:4, marginBottom:20 }}>
        {[["semana","Esta semana"],["mes","Este mes"],["calendario","Calendario"]].map(([id,lb]) => (
          <Btn key={id} active={view===id} onClick={()=>setView(id)}>{lb}</Btn>
        ))}
      </div>
      {view==="semana" && <VistaSemana />}
      {view==="mes" && <VistaMes />}
      {view==="calendario" && <VistaCalendario />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// COMEX — Análisis anual
// ══════════════════════════════════════════════════════════════
function Comex() {
  const [dim, setDim]   = useState("linea");
  const [year, setYear] = useState("todos");
  const [met, setMet]   = useState("fob");

  const getYear = f => {
    if (f.year) return f.year;
    const d = parseDate(f.conf);
    return d ? d.getFullYear() : null;
  };

  const data = useMemo(() => {
    if (year==="todos") return FOLIOS;
    return FOLIOS.filter(f => getYear(f) === parseInt(year));
  }, [year]);

  const grouped = useMemo(() => {
    const m = {};
    data.forEach(f => {
      const k = dim==="linea" ? f.linea : dim==="prov" ? f.prov : f.cat;
      if (!k) return;
      if (!m[k]) m[k] = { fob:0, folios:0, flete:0, sena:0 };
      m[k].fob += f.fob; m[k].folios++; m[k].flete += f.flete||0; m[k].sena += f.sena||0;
    });
    return Object.entries(m).sort((a,b)=>b[1][met]-a[1][met]);
  }, [data, dim, met]);

  const totFOB    = data.reduce((s,f)=>s+f.fob,0);
  const totSena   = data.reduce((s,f)=>s+f.sena,0);
  const totFlete  = data.reduce((s,f)=>s+f.flete,0);
  const maxV      = grouped.length ? grouped[0][1][met] : 1;

  // Histograma mensual
  const porMes = useMemo(() => {
    const m = MESES_N.map((lb,i)=>({lb,fob:0,cnt:0}));
    data.forEach(f => {
      const d = parseDate(f.conf);
      if (d) { m[d.getMonth()].fob += f.fob; m[d.getMonth()].cnt++; }
    });
    return m;
  }, [data]);
  const maxMes = Math.max(...porMes.map(m=>m.fob));

  // Comparativa 2024 vs 2025
  const comp = useMemo(() => {
    const lineas = [...new Set(FOLIOS.map(f=>f.linea).filter(Boolean))];
    return lineas.map(l => ({
      l,
      v24: FOLIOS.filter(f=>f.linea===l && getYear(f)===2024).reduce((s,f)=>s+f.fob,0),
      v25: FOLIOS.filter(f=>f.linea===l && getYear(f)===2025).reduce((s,f)=>s+f.fob,0),
    })).filter(r=>r.v24>0||r.v25>0).sort((a,b)=>(b.v24+b.v25)-(a.v24+a.v25));
  }, []);
  const maxComp = Math.max(...comp.map(r=>Math.max(r.v24,r.v25)));

  const BC = { linea:"#378ADD", prov:"#1D9E75", cat:"#EF9F27" };
  const metFmt = v => met==="folios" ? v : fmt(v);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:20 }}>
        <KCard label="FOB total" value={fmt(totFOB)} sub={`${data.length} folios`} />
        <KCard label="Prom. por folio" value={fmt(totFOB/(data.length||1))} />
        <KCard label="Proveedores únicos" value={new Set(data.map(f=>f.prov)).size} />
        <KCard label="Señas pagadas" value={fmt(totSena)} accent="#3B6D11" />
        <KCard label="Fletes totales" value={fmt(totFlete)} />
        <KCard label="% señas/FOB" value={totFOB>0?Math.round(totSena/totFOB*100)+"%":"—"} />
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:3 }}>
          {[["linea","Por línea"],["prov","Por proveedor"],["cat","Por categoría"]].map(([id,lb])=>(
            <Btn key={id} active={dim===id} onClick={()=>setDim(id)}>{lb}</Btn>
          ))}
        </div>
        <div style={{ display:"flex", gap:3 }}>
          {["todos","2024","2025"].map(y=>(
            <Btn key={y} active={year===y} accent="#378ADD" onClick={()=>setYear(y)}>{y==="todos"?"Todos":y}</Btn>
          ))}
        </div>
        <select value={met} onChange={e=>setMet(e.target.value)} style={{ fontSize:12, height:32, padding:"0 10px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="fob">Métrica: FOB USD</option>
          <option value="folios">Métrica: Nº folios</option>
          <option value="flete">Métrica: Flete USD</option>
        </select>
      </div>

      {/* Ranking */}
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:16, marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:14 }}>
          Ranking — {met==="fob"?"FOB USD":met==="folios"?"Nº folios":"Flete USD"} · {dim==="linea"?"Por línea":dim==="prov"?"Por proveedor":"Por categoría"} {year!=="todos"?`· ${year}`:""}
        </div>
        {grouped.slice(0,15).map(([k,v]) => {
          const pct = maxV>0 ? (v[met]/maxV)*100 : 0;
          const pctFob = totFOB>0 ? Math.round(v.fob/totFOB*100) : 0;
          return (
            <div key={k} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                <span style={{ fontWeight:500 }}>{k}</span>
                <div style={{ display:"flex", gap:12, color:"var(--color-text-secondary)", fontSize:11 }}>
                  <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{metFmt(v[met])}</span>
                  <span>{pctFob}% del total</span>
                  <span>{v.folios} folio{v.folios>1?"s":""}</span>
                </div>
              </div>
              <div style={{ height:8, background:"var(--color-background-secondary)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", background:BC[dim], borderRadius:4, transition:"width .25s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Histograma mensual */}
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:16, marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:12 }}>Distribución mensual de FOB (por fecha de confirmación)</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:80 }}>
          {porMes.map((m,i) => {
            const h = maxMes>0 ? Math.round((m.fob/maxMes)*72) : 0;
            return (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                <div style={{ width:"100%", background: h>0?"#378ADD":"var(--color-background-secondary)", borderRadius:"3px 3px 0 0", height:h>0?h:3, opacity:.85, transition:"height .2s" }} title={`${m.lb}: ${fmt(m.fob)} · ${m.cnt} folios`} />
                <div style={{ fontSize:9, color:"var(--color-text-tertiary)" }}>{m.lb}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparativa 2024 vs 2025 */}
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:16 }}>
        <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Comparativa 2024 vs 2025 — FOB por línea</div>
        <div style={{ display:"flex", gap:16, fontSize:11, color:"var(--color-text-secondary)", marginBottom:14 }}>
          <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"#B5D4F4", marginRight:4 }}/>2024</span>
          <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"#378ADD", marginRight:4 }}/>2025</span>
        </div>
        {comp.map(row => {
          const w24 = maxComp>0 ? Math.round((row.v24/maxComp)*100) : 0;
          const w25 = maxComp>0 ? Math.round((row.v25/maxComp)*100) : 0;
          const delta = row.v24>0 ? Math.round((row.v25/row.v24-1)*100) : null;
          return (
            <div key={row.l} style={{ marginBottom:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                <span style={{ fontWeight:500 }}>{row.l}</span>
                <div style={{ display:"flex", gap:10, fontSize:11, color:"var(--color-text-secondary)" }}>
                  <span>{fmt(row.v24)}</span>
                  <span>{fmt(row.v25)}</span>
                  {delta!==null && <span style={{ fontWeight:500, color:delta>=0?"#3B6D11":"#A32D2D" }}>{delta>=0?"+":""}{delta}%</span>}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                <div style={{ height:5, background:"var(--color-background-secondary)", borderRadius:3, overflow:"hidden" }}><div style={{ width:`${w24}%`, height:"100%", background:"#B5D4F4", borderRadius:3 }} /></div>
                <div style={{ height:5, background:"var(--color-background-secondary)", borderRadius:3, overflow:"hidden" }}><div style={{ width:`${w25}%`, height:"100%", background:"#378ADD", borderRadius:3 }} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRODUCTO — Gantt
// ══════════════════════════════════════════════════════════════
function Producto() {
  const [sel, setSel]     = useState(null);
  const [filtLinea, setFiltLinea] = useState("Todas");

  const G_START = new Date(2025, 0, 1);
  const G_END   = new Date(2026, 2, 31);
  const TOTAL_D = Math.round((G_END - G_START) / 86400000);
  const TODAY   = new Date(2025, 9, 15);
  const todayPct = Math.round(((TODAY - G_START)/86400000)/TOTAL_D*100);

  const lineas = ["Todas", ...new Set(PRODUCTOS_DEV.map(p=>p.linea))];
  const prods  = filtLinea==="Todas" ? PRODUCTOS_DEV : PRODUCTOS_DEV.filter(p=>p.linea===filtLinea);

  const meses = useMemo(() => {
    const ms = [];
    let d = new Date(G_START);
    while (d <= G_END) {
      ms.push({ y:d.getFullYear(), m:d.getMonth(), lb:MESES_N[d.getMonth()]+"'"+d.getFullYear().toString().slice(2) });
      d = new Date(d.getFullYear(), d.getMonth()+1, 1);
    }
    return ms;
  }, []);

  const colecciones = [...new Set(prods.map(p=>p.coleccion))];

  const EC = [
    "#B5D4F4","#B5D4F4","#FAC775","#FAC775","#FAC775",
    "#9FE1CB","#9FE1CB","#FAC775","#FAC775",
    "#9FE1CB","#C0DD97","#5DCAA5","#5DCAA5","#5DCAA5","#C0DD97","#1D9E75"
  ];

  const PS = { Urgente:{bg:"#FCEBEB",c:"#A32D2D"}, Alta:{bg:"#FAEEDA",c:"#854F0B"}, Media:{bg:"#E6F1FB",c:"#185FA5"}, Baja:{bg:"#EAF3DE",c:"#3B6D11"} };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:18 }}>
        <KCard label="Desarrollos" value={PRODUCTOS_DEV.length} sub="en curso" />
        <KCard label="En aprobación+" value={PRODUCTOS_DEV.filter(p=>p.etapa>=11).length} accent="#3B6D11" />
        <KCard label="Con desvío costo" value={PRODUCTOS_DEV.filter(p=>p.costoReal>p.costoObj&&p.costoReal>0).length} accent="#A32D2D" />
        <KCard label="Colecciones" value={new Set(PRODUCTOS_DEV.map(p=>p.coleccion)).size} />
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
        <select value={filtLinea} onChange={e=>setFiltLinea(e.target.value)} style={{ fontSize:12, height:32, padding:"0 10px", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          {lineas.map(l=><option key={l}>{l}</option>)}
        </select>
        <div style={{ display:"flex", gap:12, marginLeft:"auto", fontSize:10, color:"var(--color-text-secondary)", flexWrap:"wrap" }}>
          {[["#B5D4F4","Idea/Research"],["#FAC775","Diseño/TechPack"],["#9FE1CB","Muestras"],["#5DCAA5","Producción"],["#1D9E75","Lanzado"]].map(([c,l])=>(
            <span key={l}><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:c, marginRight:4 }}/>{l}</span>
          ))}
          <span><span style={{ display:"inline-block", width:1, height:14, background:"#E24B4A", marginRight:4, verticalAlign:"middle" }}/>Hoy</span>
        </div>
      </div>

      {/* GANTT TABLE */}
      <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", overflow:"hidden", marginBottom:16 }}>
        {/* Header */}
        <div style={{ display:"flex", background:"var(--color-background-secondary)", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ width:176, flexShrink:0, padding:"6px 10px", fontSize:10, color:"var(--color-text-tertiary)", fontWeight:500, borderRight:"0.5px solid var(--color-border-tertiary)", textTransform:"uppercase", letterSpacing:".06em" }}>Producto</div>
          <div style={{ flex:1, display:"flex" }}>
            {meses.map((m,i)=>(
              <div key={i} style={{ flex:1, borderRight:"0.5px solid var(--color-border-tertiary)", padding:"6px 0", fontSize:9, color:"var(--color-text-tertiary)", fontWeight:500, textAlign:"center" }}>{m.lb}</div>
            ))}
          </div>
        </div>

        {colecciones.map(col => {
          const items = prods.filter(p=>p.coleccion===col);
          return (
            <div key={col}>
              <div style={{ background:"var(--color-background-secondary)", borderBottom:"0.5px solid var(--color-border-tertiary)", borderTop:"0.5px solid var(--color-border-tertiary)", padding:"4px 10px", fontSize:10, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em" }}>
                {col}
              </div>
              {items.map(p => {
                const start = new Date(p.inicio);
                const end   = new Date(p.fin);
                const left  = Math.max(0, Math.round(((start-G_START)/86400000)/TOTAL_D*100));
                const width = Math.max(1, Math.round(((end-start)/86400000)/TOTAL_D*100));
                const isSel = sel?.id===p.id;
                return (
                  <div key={p.id} style={{ display:"flex", borderBottom:"0.5px solid var(--color-border-tertiary)", background: isSel?"var(--color-background-secondary)":"transparent" }}>
                    <div style={{ width:176, flexShrink:0, padding:"5px 10px", borderRight:"0.5px solid var(--color-border-tertiary)", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                      <div style={{ fontSize:11, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={p.nombre}>{p.nombre}</div>
                      <div style={{ display:"flex", gap:4, marginTop:2, alignItems:"center" }}>
                        <span style={{ fontSize:9, color:"var(--color-text-tertiary)" }}>{p.linea}</span>
                        <span style={{ fontSize:9, padding:"1px 4px", borderRadius:2, background:PS[p.prioridad]?.bg, color:PS[p.prioridad]?.c }}>{p.prioridad}</span>
                      </div>
                    </div>
                    <div style={{ flex:1, position:"relative", padding:"4px 0", cursor:"pointer" }} onClick={()=>setSel(isSel?null:p)}>
                      {/* mes grid */}
                      <div style={{ position:"absolute", inset:0, display:"flex", pointerEvents:"none" }}>
                        {meses.map((_,i)=><div key={i} style={{ flex:1, borderRight:"0.5px solid var(--color-border-tertiary)", opacity:.35 }} />)}
                      </div>
                      {/* línea hoy */}
                      <div style={{ position:"absolute", left:`${todayPct}%`, top:0, bottom:0, width:1.5, background:"#E24B4A", opacity:.8, zIndex:2, pointerEvents:"none" }} />
                      {/* barra */}
                      <div style={{ position:"absolute", left:`${left}%`, width:`${Math.min(width,100-left)}%`, top:4, height:22, borderRadius:4, background:EC[p.etapa-1], border: isSel?"1.5px solid var(--color-text-primary)":"1px solid rgba(0,0,0,.08)", display:"flex", alignItems:"center", padding:"0 6px", overflow:"hidden", zIndex:1 }}>
                        <span style={{ fontSize:9, fontWeight:500, color:"var(--color-text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.nombre}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Detalle */}
      {sel && (
        <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-lg)", padding:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{sel.codigo} · {sel.coleccion}</div>
              <div style={{ fontSize:17, fontWeight:500, margin:"3px 0" }}>{sel.nombre}</div>
              <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>{sel.prov} · {sel.linea}</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <PTag p={sel.prioridad} />
              <button onClick={()=>setSel(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"var(--color-text-secondary)" }}>✕</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:14 }}>
            {ETAPAS.map((e,i)=>(
              <div key={i} style={{ padding:"3px 7px", borderRadius:3, fontSize:10, fontWeight:sel.etapa===i+1?500:400, background:sel.etapa===i+1?EC[i]:"var(--color-background-secondary)", color:"var(--color-text-primary)", opacity:i+1<sel.etapa?0.4:1 }}>{e}</div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
            <KCard label="Costo objetivo" value={sel.costoObj>0?fmt(sel.costoObj):"—"} />
            <KCard label="Costo real" value={sel.costoReal>0?fmt(sel.costoReal):"—"} accent={sel.costoReal>sel.costoObj&&sel.costoReal>0?"#A32D2D":undefined} />
            <KCard label="Etapa" value={`${sel.etapa}/16`} sub={ETAPAS[sel.etapa-1]} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", fontSize:12 }}>
            {[["Inicio",new Date(sel.inicio).toLocaleDateString("es-UY")],["Fin estimado",new Date(sel.fin).toLocaleDateString("es-UY")],["Proveedor",sel.prov],["Colección",sel.coleccion]].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                <span style={{ color:"var(--color-text-secondary)" }}>{k}</span>
                <span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
          {sel.costoReal>sel.costoObj&&sel.costoReal>0 && (
            <div style={{ marginTop:12, padding:"9px 12px", borderRadius:"var(--border-radius-md)", background:"#FCEBEB", fontSize:12, color:"#A32D2D" }}>
              Costo real {Math.round((sel.costoReal/sel.costoObj-1)*100)}% sobre objetivo — +{fmt(sel.costoReal-sel.costoObj)}/unidad
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [mod, setMod] = useState("deposito");
  return (
    <div style={{ padding:"16px 0", fontFamily:"var(--font-sans)" }}>
      <h2 className="sr-only">Disershop ERP v2 — Depósito, ComEx y Desarrollo de producto</h2>
      <div style={{ marginBottom:18 }}>
        <span style={{ fontSize:11, fontWeight:500, textTransform:"uppercase", letterSpacing:".1em", color:"var(--color-text-tertiary)" }}>Disershop ERP</span>
        <span style={{ color:"var(--color-border-secondary)", margin:"0 8px" }}>·</span>
        <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{FOLIOS.length} folios · {PRODUCTOS_DEV.length} desarrollos activos</span>
      </div>
      <TabNav active={mod} onChange={setMod} />
      {mod==="deposito" && <Deposito />}
      {mod==="comex"    && <Comex />}
      {mod==="producto" && <Producto />}
    </div>
  );
}
