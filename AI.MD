Spesifikasi Proyek: Nihongo Kana Master (Hiragana & Katakana Trainer)

Dokumen ini ditujukan untuk AI di platform Antigravity sebagai panduan konteks, spesifikasi fungsional, arsitektur kode, serta aturan pengembangan (rules of engagement) untuk aplikasi Nihongo Kana Master.

1. Aturan Pengembangan Utama (MANDATORY RULES)

Saat memodifikasi, meningkatkan, atau memperbaiki aplikasi ini, AI wajib mematuhi aturan ketat berikut:

Dilarang Menggunakan Emoji: Seluruh elemen antarmuka (UI) tidak boleh menggunakan emoji tekstual apa pun. Gunakan ikon vektor SVG kustom yang bersih dan modern.

Mandat Satu File (Single-File Mandate): Seluruh kode komponen React, logika state, canvas handler, database karakter, hingga styling pembantu harus berada di dalam satu file tunggal (katakana_complete_trainer.jsx).

Bahasa Dokumentasi Kode: Komentar di dalam kode dan teks tampilan pengguna harus menggunakan Bahasa Indonesia yang kasual namun informatif.

Tema Desain: Menggunakan tema putih premium minimalis (Premium Light Theme) dengan warna dasar abu-abu terang (bg-slate-50), teks gelap (text-slate-800), aksen indigo halus, serta borders tipis bernilai estetik tinggi. Hindari warna gelap pekat sebagai latar belakang utama.

2. Fitur & Arsitektur Fungsional

A. Dataset Karakter (Hiragana & Katakana)

Memiliki dua database utama yang mencakup 46 huruf dasar Seion untuk Hiragana dan Katakana.

Tiap objek karakter memiliki properti: kana (karakter Jepang), romaji (pelafalan), row (kelompok baris aksara: A, Ka, Sa, Ta, Na, Ha, Ma, Ya, Ra, Wa), strokes (jumlah coretan), dan guide (instruksi langkah penulisan manual).

B. Mode Belajar (Flashcard & Tracing Canvas)

Flashcard Interaktif: Kartu bolak-balik menggunakan animasi rotasi 3D CSS (preserve-3d & rotate-y-180) untuk menampilkan aksara Jepang di sisi depan dan romaji/detail di sisi belakang saat diketuk.

Tracing Canvas: Kanvas gambar interaktif menggunakan HTML5 Canvas dengan deteksi event mouse (mousedown, mousemove, mouseup) dan touch screen (touchstart, touchmove, touchend) agar pengguna perangkat seluler dapat melatih coretan tangan secara langsung.

Garis Bantu & Pola: Menyediakan garis kisi bantu (auxiliary grid lines) dan opsi untuk menampilkan atau menyembunyikan pola bayangan transparan (faint background guide) di balik kanvas untuk memandu urutan penulisan yang tepat.

C. Mode Kuis (Uji Kemampuan)

Kustomisasi Parameter: Pengguna dapat menentukan jumlah soal (5, 10, 20, 30, atau semua) dan menyaring cakupan baris huruf (misalnya hanya menguji baris "Ha").

Logika Pengacakan Pintar: Menghasilkan opsi jawaban pilihan ganda secara dinamis. Jawaban salah diambil secara acak dari database yang relevan untuk menghindari duplikasi opsi.

Suara Pelafalan (TTS): Menggunakan Web Speech API (SpeechSynthesisUtterance) untuk menyuarakan pelafalan asli bahasa Jepang (ja-JP) pada kecepatan yang disesuaikan (0.75x) setiap kali jawaban diverifikasi.

D. Sertifikat Kelulusan Status Card Generator

HTML5 Canvas Rendering: Saat kuis selesai, pengguna memasukkan nama mereka. Sistem akan merender sertifikat beresolusi tinggi (rasio 9:16 untuk potret Instagram/WhatsApp Status - 1080 x 1920 piksel) langsung pada sebuah elemen kanvas tersembunyi.

Estetika Desain: Sertifikat memadukan elemen bendera Hinomaru merah pucat yang elegan, frame border ganda, rincian skor akurasi kuis, tanda tangan kelulusan, serta stempel merah tradisional Jepang (Hanko Seal).

Ekspor PNG: Mengonversi data kanvas menjadi tautan base64 gambar PNG sehingga pengguna dapat mengunduhnya secara langsung tanpa memerlukan dependensi library eksternal atau server rendering.

3. Struktur State Utama (React)

Aplikasi ini dikelola menggunakan hook React standar (useState, useEffect, useRef, useMemo):

characterType: Mengontrol jenis huruf aktif ('hiragana' atau 'katakana').

selectedRows: Array filter baris huruf aktif (misalnya ['Semua'] atau ['A', 'Ka']).

appMode: Menentukan tampilan aktif ('study' atau 'quiz').

cardIndex: Melacak indeks karakter yang sedang dipelajari.

isFlipped: Status rotasi 3D flashcard.

canvasRef: Referensi ke kanvas corat-coret.

quizQuestions: Menyimpan array objek pertanyaan kuis yang telah diacak.

currentQuestionIndex: Melacak nomor soal kuis yang sedang berjalan.

selectedAnswer: Jawaban yang dipilih oleh pengguna pada soal aktif.

isAnswered: Flag penanda apakah soal aktif sudah dijawab atau belum.

score: Akumulasi jawaban kuis yang benar.

quizFinished: Status penyelesaian sesi kuis.

userName: Nama pengguna untuk disematkan di sertifikat.

shareImage: Menyimpan data URL base64 gambar sertifikat yang siap diunduh.

4. Panduan Pemeliharaan Kode ke Depan

Jika ingin menambahkan dukungan untuk Dakuten (Dakuon) atau Handakuten, kembangkan dataset di luar komponen utama dan gabungkan ke dalam computed state activeDataset menggunakan hook useMemo.

Untuk memperhalus kuas coretan, algoritma penggambaran kanvas dapat ditingkatkan dengan menambahkan interpolasi kurva kuadrat (quadratic curves) agar coretan tangan terasa lebih halus di layar sentuh beresolusi tinggi.

Pastikan seluruh fungsionalitas tombol ekspor gambar sertifikat (downloadImage) tetap menggunakan metode pembuatan elemen jangkar <a> secara dinamis demi menjaga kompatibilitas eksekusi di dalam lingkungan iFrame pasir (sandbox iframe).