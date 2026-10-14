export interface Reward {
  id: string;
  name: string;
  requiredPoin: number;
  category: "Merchandise" | "Voucher" | "Program Kelas";
  stock: number;
  description: string;
  isAvailable: boolean;
  image?: string;
  badge?: string;
}

/**
 * Official Reward Catalog from Section 5 of Master Blueprint
 */
export const OFFICIAL_REWARDS: Reward[] = [
  {
    id: "reward-1",
    name: "Keychain Mr.BOB",
    requiredPoin: 10,
    category: "Merchandise",
    stock: 500,
    description: "Gantungan kunci eksklusif bertema Mr.BOB Kampung Inggris.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-2",
    name: "Notebook Merchandise",
    requiredPoin: 50,
    category: "Merchandise",
    stock: 250,
    description: "Buku catatan spiral premium Mr.BOB untuk mencatat vocab & materi.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-3",
    name: "T-Shirt Mr.BOB Kampung Inggris",
    requiredPoin: 75,
    category: "Merchandise",
    stock: 150,
    description: "Kaos cotton combed eksklusif official Mr.BOB Kampung Inggris.",
    isAvailable: true,
    badge: "Popular",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-4",
    name: "Free Program Kelas Satuan 2 Minggu",
    requiredPoin: 100,
    category: "Program Kelas",
    stock: 80,
    description: "Akses gratis program kelas satuan pilihan durasi 2 minggu.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-5",
    name: "Voucher Belajar Rp250.000",
    requiredPoin: 200,
    category: "Voucher",
    stock: 100,
    description: "Voucher potongan biaya pendaftaran kursus senilai Rp250.000.",
    isAvailable: true,
    badge: "Best Value",
    image: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-6",
    name: "Free Program Kelas Satuan 1 Bulan",
    requiredPoin: 500,
    category: "Program Kelas",
    stock: 50,
    description: "Gratis kelas satuan full 1 bulan untuk upgrade speaking/grammar.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-7",
    name: "Free Super Private Class Speaking Akselerasi",
    requiredPoin: 1000,
    category: "Program Kelas",
    stock: 25,
    description: "Sesi privat intensif 1-on-1 bersama Master Tutor Mr.BOB.",
    isAvailable: true,
    badge: "Exclusive",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-8",
    name: "Free Program Kelas 2 Minggu Non Camp",
    requiredPoin: 2500,
    category: "Program Kelas",
    stock: 30,
    description: "Paket lengkap program tatap muka 2 minggu non camp di Pare.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-9",
    name: "Free Program Kelas 1 Bulan Non Camp",
    requiredPoin: 5000,
    category: "Program Kelas",
    stock: 20,
    description: "Paket kursus 1 bulan penuh non camp di Mr.BOB Kampung Inggris.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-10",
    name: "Free Program Kelas 1 Bulan 5-up",
    requiredPoin: 7500,
    category: "Program Kelas",
    stock: 15,
    description: "Paket program intensif 1 bulan paket asrama 5-up English area.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-11",
    name: "Free Program Kelas 2 Bulan 5-up",
    requiredPoin: 10000,
    category: "Program Kelas",
    stock: 10,
    description: "Paket lengkap belajar 2 bulan asrama 5-up garansi lancar speaking.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-12",
    name: "Free Program Kelas 3 Bulan 5-up",
    requiredPoin: 20000,
    category: "Program Kelas",
    stock: 8,
    description: "Program intensif transformasi bahasa Inggris 3 bulan penuh.",
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "reward-13",
    name: "Free Program Kelas 3 Bulan 7-up",
    requiredPoin: 50000,
    category: "Program Kelas",
    stock: 5,
    description: "The Ultimate Journey: 3 bulan paket asrama 7-up all-inclusive VIP.",
    isAvailable: true,
    badge: "Ultimate Reward",
    image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500&auto=format&fit=crop&q=80",
  },
];
