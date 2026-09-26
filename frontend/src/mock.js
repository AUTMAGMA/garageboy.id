// Mock data for US Auto Modification (uszggc.com) clone
// All data is mocked on the frontend. Images referenced from the original site + car imagery.

export const BANNERS = [
  {
    id: 'b1',
    title: 'Audi A5 Facelift Retrofit',
    brand: 'audi',
    img: 'https://www.uszggc.com/upfile/202309/2023090861012793.jpg',
  },
  {
    id: 'b2',
    title: 'Benz W221 Facelift Retrofit',
    brand: 'benz',
    img: 'https://www.uszggc.com/upfile/202309/2023090860954097.jpg',
  },
  {
    id: 'b3',
    title: 'BMW F02 Facelift Retrofit',
    brand: 'bmw',
    img: 'https://www.uszggc.com/upfile/202309/2023090860965509.jpg',
  },
  {
    id: 'b4',
    title: 'BMW F10 Facelift Retrofit',
    brand: 'bmw',
    img: 'https://www.uszggc.com/upfile/202309/2023090860975957.jpg',
  },
  {
    id: 'b5',
    title: 'Audi A7 to RS7 Conversion',
    brand: 'audi',
    img: 'https://www.uszggc.com/upfile/202307/2023072057977229.jpg',
  },
];

export const BRANDS = [
  { key: 'benz', name: 'US-Benz', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401086745_80_60_lfit.png' },
  { key: 'bmw', name: 'US-BMW', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401141030_80_60_lfit.png' },
  { key: 'audi', name: 'US-Audi', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401151841_80_60_lfit.png' },
  { key: 'cadillac', name: 'US-Cadillac', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401165830_80_60_lfit.png' },
  { key: 'lexus', name: 'US-Lexus', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401177267_80_60_lfit.png' },
  { key: 'honda', name: 'US-Honda', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401189566_80_60_lfit.png' },
  { key: 'ford', name: 'US-Ford', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401200930_80_60_lfit.png' },
  { key: 'dodge', name: 'US-Dodge', icon: 'https://www.uszggc.com/upfile/thumb/202506/2025061953258333_80_60_lfit.png' },
  { key: 'chevrolet', name: 'US-Chevrolet', icon: 'https://www.uszggc.com/upfile/thumb/202307/2023071401233704_80_60_lfit.png' },
  { key: 'jeep', name: 'US-Jeep', icon: 'https://www.uszggc.com/upfile/thumb/202609/2026090231563105_80_60_lfit.png' },
];

// Filter option definitions
export const FILTERS = {
  brand: [
    { value: 'all', label: 'All' },
    { value: 'bmw', label: 'US-BMW' },
    { value: 'benz', label: 'US-Benz' },
    { value: 'audi', label: 'US-Audi' },
    { value: 'lexus', label: 'US-Lexus' },
  ],
  series: [
    { value: 'all', label: 'All' },
    { value: '1', label: '1 Series' },
    { value: '3', label: '3 Series' },
    { value: '5', label: '5 Series' },
    { value: 'x3', label: 'X3' },
    { value: 'x5', label: 'X5' },
  ],
  model: [
    { value: 'all', label: 'All' },
    { value: 'e90', label: 'E90 (2005-2012)' },
    { value: 'f30', label: 'F30 F35 (2013-2018)' },
    { value: 'g20', label: 'G20 G28 (2019-2023+)' },
  ],
  mod: [
    { value: 'all', label: 'All' },
    { value: 'original', label: 'Original Bumper' },
    { value: 'pre-m3', label: 'Pre-LCI M3 Kit' },
    { value: 'm-tech', label: 'Retrofit M-Tech Kit' },
  ],
};

export const PRODUCTS = [
  // Latest modifications (shown on home)
  { id: 'p1', brand: 'benz', series: '5', model: 'g20', mod: 'm-tech', category: 'E-Class W214 (2024+)', title: 'AMG Body Kit', desc: 'AMG Aero Conversion Package', img: 'https://www.uszggc.com/upfile/thumb/202607/2026072848557481_400_300_lfit.png', latest: true },
  { id: 'p2', brand: 'benz', series: 'x5', model: 'g20', mod: 'm-tech', category: 'G-Class W465', title: 'W465 BBS Wheel Retrofit', desc: 'Offroad BBS Wheel Package', img: 'https://www.uszggc.com/upfile/thumb/202509/2025090656070225_400_300_lfit.png', latest: true },
  { id: 'p3', brand: 'audi', series: '5', model: 'f30', mod: 'pre-m3', category: 'A6 (2012-2015)', title: '2023 A6L Style Kit', desc: 'Facelift A6L Conversion', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121583161705_400_300_lfit.jpg', latest: true },
  { id: 'p4', brand: 'bmw', series: 'x5', model: 'e90', mod: 'm-tech', category: 'X5 E70 (2008-2013)', title: 'E70 to G05 X5M Kit', desc: 'X5M Pre-LCI Widebody Package', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121485594641_400_300_lfit.jpg', latest: true },
  { id: 'p5', brand: 'bmw', series: '3', model: 'g20', mod: 'm-tech', category: 'G20 G28 (2019-2022)', title: 'Facelift M-Tech Kit', desc: 'Old to New M-Tech Conversion', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121372183689_400_300_lfit.jpg', latest: true },
  { id: 'p6', brand: 'audi', series: '3', model: 'e90', mod: 'pre-m3', category: 'A5 (2008-2011)', title: '2021 RS5 Style Kit', desc: 'RS5 Aero Conversion', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121581020641_400_300_lfit.jpg', latest: true },

  // BMW 3 Series
  { id: 'p7', brand: 'bmw', series: '3', model: 'g20', mod: 'pre-m3', category: 'G20 3 Series', title: 'BM-G20 M3C Front Bumper', desc: 'M3 Competition Style Front', img: 'https://www.uszggc.com/upfile/202309/2023090860975957.jpg' },
  { id: 'p8', brand: 'bmw', series: '3', model: 'g20', mod: 'pre-m3', category: 'G20 3 Series', title: 'BM-G20 M3C Rear Bumper', desc: 'Quad Exhaust Fitment', img: 'https://www.uszggc.com/upfile/202309/2023090860965509.jpg' },
  { id: 'p9', brand: 'bmw', series: '3', model: 'f30', mod: 'm-tech', category: 'F30 3 Series', title: 'BM-F30 M-Tech Front Bumper', desc: 'F30 to M-Tech Upgrade', img: 'https://www.uszggc.com/upfile/202309/2023090860975957.jpg' },
  { id: 'p10', brand: 'bmw', series: '3', model: 'e90', mod: 'original', category: 'E90 3 Series', title: 'BM-E90 Carbon Interior', desc: 'Original Carbon Trim', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121372183689_400_300_lfit.jpg' },

  // BMW 5 / X5
  { id: 'p11', brand: 'bmw', series: '5', model: 'g20', mod: 'original', category: 'F10 5 Series', title: 'BM-F10 OEM Plus Retrofit', desc: 'Facelift OEM Upgrade Kit', img: 'https://www.uszggc.com/upfile/202309/2023090860975957.jpg' },
  { id: 'p12', brand: 'bmw', series: 'x5', model: 'e90', mod: 'm-tech', category: 'X5 E70', title: 'BM-X5 M-Tech Widebody', desc: 'Widebody Aerodynamic Package', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121485594641_400_300_lfit.jpg' },

  // BMW 1 Series
  { id: 'p13', brand: 'bmw', series: '1', model: 'f30', mod: 'm-tech', category: 'F20 1 Series', title: 'BM-F20 M-Sport Kit', desc: 'M-Sport Aero Conversion', img: 'https://www.uszggc.com/upfile/202309/2023090860965509.jpg' },

  // Benz
  { id: 'p14', brand: 'benz', series: '1', model: 'f30', mod: 'm-tech', category: 'A-Class', title: 'Benz A-Class AMG Front', desc: 'A-Class AMG Aero Package', img: 'https://www.uszggc.com/upfile/202309/2023090860954097.jpg' },
  { id: 'p15', brand: 'benz', series: '3', model: 'g20', mod: 'original', category: 'C-Class W206', title: 'Benz C-Class OEM Tuning', desc: 'C-Class Original Upgrade', img: 'https://www.uszggc.com/upfile/202309/2023090860954097.jpg' },
  { id: 'p16', brand: 'benz', series: '5', model: 'g20', mod: 'pre-m3', category: 'E-Class', title: 'Benz E-Class AMG Bodykit', desc: 'E-Class AMG Conversion', img: 'https://www.uszggc.com/upfile/thumb/202607/2026072848557481_400_300_lfit.png' },
  { id: 'p17', brand: 'benz', series: 'x5', model: 'g20', mod: 'm-tech', category: 'G-Class W465', title: 'Benz G-Class Offroad Kit', desc: 'G-Wagon Offroad Tuning', img: 'https://www.uszggc.com/upfile/thumb/202509/2025090656070225_400_300_lfit.png' },

  // Audi
  { id: 'p18', brand: 'audi', series: '3', model: 'f30', mod: 'pre-m3', category: 'A3', title: 'Audi A3 S3 Style Kit', desc: 'S3 Aerodynamic Package', img: 'https://www.uszggc.com/upfile/202307/2023072057977229.jpg' },
  { id: 'p19', brand: 'audi', series: '5', model: 'g20', mod: 'm-tech', category: 'A6 C8', title: 'Audi A6 RS Style Bumper', desc: 'RS6 Style Front Conversion', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121583161705_400_300_lfit.jpg' },
  { id: 'p20', brand: 'audi', series: 'x3', model: 'g20', mod: 'original', category: 'Q5', title: 'Audi Q5 Black Optic', desc: 'Black Optic OEM Accent', img: 'https://www.uszggc.com/upfile/202309/2023090861012793.jpg' },

  // Lexus
  { id: 'p21', brand: 'lexus', series: '3', model: 'g20', mod: 'original', category: 'IS', title: 'Lexus IS F-Sport Upgrade', desc: 'IS F-Sport Spindle Grille', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121581020641_400_300_lfit.jpg' },
  { id: 'p22', brand: 'lexus', series: 'x5', model: 'f30', mod: 'm-tech', category: 'RX', title: 'Lexus RX Night Edition', desc: 'RX Custom Black Package', img: 'https://www.uszggc.com/upfile/thumb/202312/2023121485594641_400_300_lfit.jpg' },
];
