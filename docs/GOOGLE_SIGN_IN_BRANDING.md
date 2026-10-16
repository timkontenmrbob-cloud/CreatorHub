# Branding Google Sign In untuk production

Aplikasi menampilkan **Mr.BOB Creator Hub** pada halaman login dan memulai Google OAuth melalui Supabase Auth. URL callback aplikasi memakai origin situs yang sedang dibuka dengan path `/auth/callback`, sehingga domain production tidak perlu ditulis langsung di kode.

Sebelum rilis pada domain production:

1. Di **Google Auth Platform → Branding**, atur nama aplikasi menjadi **Mr.BOB Creator Hub**. Tambahkan logo yang disetujui, email dukungan, homepage, kebijakan privasi, dan tautan ketentuan layanan pada domain production. Selesaikan verifikasi brand Google dan atur Audience untuk pengguna production. Nama pada consent screen berasal dari pengaturan ini; `signInWithOAuth` tidak dapat mengaturnya.
2. Di **Google Auth Platform → Clients**, daftarkan origin situs production sebagai authorized JavaScript origin. Daftarkan **URL callback Supabase Auth** yang tertera pada pengaturan provider Google di Supabase sebagai authorized redirect URI. URL tersebut berakhir dengan `/auth/v1/callback`, berbeda dari route aplikasi `/auth/callback`. Simpan Google client ID dan secret di **Supabase → Authentication → Providers → Google**.
3. Di **Supabase → Authentication → URL Configuration**, atur Site URL ke situs production dan masukkan URL persis `https://<domain-production>/auth/callback` ke daftar redirect yang diizinkan. Simpan URL callback lokal atau preview hanya untuk lingkungan yang memerlukan OAuth. Aplikasi mengirim URL ini melalui `redirectTo` lalu menukar kode autentikasi di route tersebut.
4. Atur `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` untuk proyek Supabase production. Bila Supabase Auth memakai custom domain, gunakan domain itu di `NEXT_PUBLIC_SUPABASE_URL` dan daftarkan URL callback-nya di Google.
5. Uji alur pada situs yang sudah terpasang dengan akun Google: halaman login → pemilihan akun/consent Google → callback aplikasi → dashboard creator atau pelengkapan profil. Periksa nama aplikasi serta domain yang ditampilkan Google.

**Batasan provider:** Jika Supabase hosted Auth masih memakai URL proyek bawaan, Google dapat menampilkan `<project-id>.supabase.co` pada consent screen karena callback OAuth berada di domain Supabase. Teks aplikasi, metadata, dan `redirectTo` tidak dapat mengganti domain tersebut. Branding dan verifikasi Google mengatur nama serta logo aplikasi; [custom domain Supabase](https://supabase.com/docs/guides/platform/custom-domains) adalah cara yang didukung untuk memakai domain Auth sesuai brand.

Rujukan: [Panduan Google sign-in Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URL Supabase](https://supabase.com/docs/guides/auth/redirect-urls), [branding aplikasi OAuth Google](https://support.google.com/cloud/answer/15549049?hl=en).
