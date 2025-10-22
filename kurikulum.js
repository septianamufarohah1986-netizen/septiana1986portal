window.kurikulum = {
  "semesters": [
    { ... semua isi JSON kamu di sini ... }
  ]
};
    {
      "id": 1,
      "title": "Semester 1 — Fondasi Ilmu Dasar & Pengantar Farmasi",
      "courses": [
        { "name": "Kimia Dasar & Praktikum",            "slug": "kimdas",                "modules": 6 },
        { "name": "Fisika Dasar & Praktikum",            "slug": "fisdas",                "modules": 5 },
        { "name": "Biologi Sel & Molekuler",             "slug": "biologi-sel",           "modules": 4 },
        { "name": "Anatomi & Fisiologi Manusia",         "slug": "anatomi-fisiologi",     "modules": 4 },
        { "name": "Farmasi Fisika I",                    "slug": "farmasi-fisika",        "modules": 3 },
        { "name": "Farmasetika Dasar",                   "slug": "farmasetika-dasar",     "modules": 3 }
      ]
    },
    {
      "id": 2,
      "title": "Semester 2 — Lanjutan Ilmu Dasar & Kefarmasian",
      "courses": [
        { "name": "Kimia Organik & Praktikum",           "slug": "kimia-organik",         "modules": 4 },
        { "name": "Kimia Analitik & Praktikum",          "slug": "kimia-analitik",        "modules": 3 },
        { "name": "Farmasi Fisika II & Praktikum",       "slug": "farmasi-fisika-2",      "modules": 3 },
        { "name": "Botani Farmasi / Farmakognosi",       "slug": "botani-farmasi",        "modules": 3 },
        { "name": "Biokimia & Praktikum",                "slug": "biokimia",              "modules": 3 },
        { "name": "(Pengantar) Metodologi Penelitian",   "slug": "metodologi-penelitian", "modules": 3 }
      ]
    },
    {
      "id": 3,
      "title": "Semester 3 — Inti Ilmu Farmasi & Teknologi",
      "courses": [
        { "name": "Teknologi Sediaan Farmasi Solid",     "slug": "teknologi-sediaan-padat",  "modules": 5 },   /* TODO: sesuaikan slug */
        { "name": "Farmakologi Dasar & Toksikologi",     "slug": "farmakologi-dasar",        "modules": 5 },
        { "name": "Analisis Farmasi Instrumental",       "slug": "analisis-farmasi-instrumental", "modules": 5 },
        { "name": "Mikrobiologi Farmasi",                "slug": "mikrobiologi-farmasi",     "modules": 5 },   /* TODO: pastikan slug file */
        { "name": "Kimia Medisinal I",                   "slug": "kimia-medisinal",          "modules": 4 },
        { "name": "Fitokimia I",                         "slug": "fitokimia",                "modules": 4 }
      ]
    },
    {
      "id": 4,
      "title": "Semester 4 — Formulasi Lanjutan & Bahan Alam",
      "courses": [
        { "name": "Teknologi Sediaan Likuida & Semisolida", "slug": "teknologi-likuida-semisolida", "modules": 4 }, /* TODO */
        { "name": "Teknologi Sediaan Steril",               "slug": "teknologi-steril",             "modules": 4 }, /* TODO */
        { "name": "Farmakologi Lanjutan",                   "slug": "farmakologi-lanjutan",         "modules": 4 },
        { "name": "Farmakognosi & Fitokimia II",            "slug": "farmakognosi-fitokimia-2",      "modules": 4 },
        { "name": "Imunologi & Virologi",                   "slug": "imunologi-virologi",            "modules": 3 },
        { "name": "Kimia Medisinal II",                     "slug": "kimia-medisinal-2",             "modules": 3 }
      ]
    },
    {
      "id": 5,
      "title": "Semester 5 — Perjalanan Obat & Aplikasi Klinis",
      "courses": [
        { "name": "Farmakokinetika",                        "slug": "farmakokinetika",              "modules": 4 },
        { "name": "Biofarmasetika",                         "slug": "biofarmasetika",               "modules": 3 },
        { "name": "Bioteknologi Farmasi",                   "slug": "bioteknologi-farmasi",         "modules": 3 },
        { "name": "Farmakoterapi I",                        "slug": "farmakoterapi-1",              "modules": 4 },
        { "name": "Manajemen & Kewirausahaan Farmasi",      "slug": "manajemen-farmasi",            "modules": 3 },
        { "name": "Statistika Farmasi",                     "slug": "statistika-farmasi",           "modules": 3 } /* TODO: cek file */
      ]
    },
    {
      "id": 6,
      "title": "Semester 6 — Terapi, Regulasi, & Metodologi (Lanjutan)",
      "courses": [
        { "name": "Farmakoterapi II",                       "slug": "farmakoterapi-2",              "modules": 3 },
        { "name": "Toksikologi Klinik",                     "slug": "toksikologi-klinik",           "modules": 3 }, /* TODO */
        { "name": "Regulasi & Perundang-undangan Farmasi",  "slug": "regulasi-perundang-farmasi",   "modules": 3 }, /* TODO */
        { "name": "Metodologi Penelitian (Lanjutan)",       "slug": "metodologipenelitian2",        "modules": 3 },
        { "name": "Mata Kuliah Pilihan/Peminatan I",        "slug": "pilihan-1",                    "modules": 3 }  /* opsional */
      ]
    },
    {
      "id": 7,
      "title": "Semester 7 — PKL & Seminar",
      "courses": [
        { "name": "PKL/PKN (Industri, RS, Apotek/PBF)",     "slug": "pkl", "modules": 3 },
        { "name": "Seminar Proposal & Kapita Selekta",      "slug": "seminar-skripsi", "modules": 3 }
      ]
    },
    {
      "id": 8,
      "title": "Semester 8 — Skripsi",
      "courses": [
        { "name": "Skripsi (Tahapan Penelitian)",           "slug": "skripsi", "modules": 4 }
      ]
    }
  ]
}

