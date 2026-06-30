import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ==========================================
// DATASET LENGKAP HIRAGANA (SEION)
// ==========================================
const HIRAGANA_DATA = [
  // Baris A
  { kana: 'あ', romaji: 'a', row: 'A', strokes: 3, guide: '1. Garis mendatar dari kiri ke kanan. 2. Garis tegak lurus melengkung menembus bagian tengah. 3. Garis melingkar besar dari tengah ke kanan bawah.' },
  { kana: 'い', romaji: 'i', row: 'A', strokes: 2, guide: '1. Garis vertikal kiri melengkung dengan kaitan kecil di ujung bawah. 2. Garis vertikal di sebelah kanan yang lebih pendek.' },
  { kana: 'う', romaji: 'u', row: 'A', strokes: 2, guide: '1. Coretan pendek melengkung di bagian atas. 2. Garis lengkung menyerupai bentuk telinga di bagian bawah.' },
  { kana: 'え', romaji: 'e', row: 'A', strokes: 2, guide: '1. Coretan pendek miring di atas. 2. Garis zig-zag mengalir bersambung membentuk gelombang di bagian bawah.' },
  { kana: 'お', romaji: 'o', row: 'A', strokes: 3, guide: '1. Garis mendatar pendek. 2. Garis vertikal lurus ke bawah yang membuat lingkaran besar di bawah lalu naik ke kanan. 3. Titik miring di kanan atas.' },
  
  // Baris Ka
  { kana: 'か', romaji: 'ka', row: 'Ka', strokes: 3, guide: '1. Garis melengkung ke kanan bawah dengan kaitan kecil di ujungnya. 2. Garis miring menusuk dari atas ke kiri bawah. 3. Coretan pendek di kanan atas.' },
  { kana: 'き', romaji: 'ki', row: 'Ka', strokes: 4, guide: '1. Garis mendatar atas. 2. Garis mendatar kedua sejajar di bawahnya. 3. Garis miring memotong kedua garis datar ke kiri bawah. 4. Garis lengkung terbuka di bawah.' },
  { kana: 'く', romaji: 'ku', row: 'Ka', strokes: 1, guide: '1. Garis sudut tunggal mirip tanda lebih kecil dari (<).' },
  { kana: 'け', romaji: 'ke', row: 'Ka', strokes: 3, guide: '1. Garis vertikal di kiri dengan kaitan bawah. 2. Garis datar pendek di tengah kanan. 3. Garis vertikal panjang memotong ujung kanan garis datar.' },
  { kana: 'こ', romaji: 'ko', row: 'Ka', strokes: 2, guide: '1. Garis datar melengkung di atas dengan kaitan kecil. 2. Garis mendatar melengkung di bawah menyeimbangkan bagian atas.' },

  // Baris Sa
  { kana: 'さ', romaji: 'sa', row: 'Sa', strokes: 3, guide: '1. Garis datar miring ke atas. 2. Garis vertikal memotong garis datar dengan sudut ke kanan bawah. 3. Garis lengkung terbuka di bawah.' },
  { kana: 'し', romaji: 'shi', row: 'Sa', strokes: 1, guide: '1. Garis lurus ke bawah lalu memutar melengkung ke kanan atas mirip kail pancing.' },
  { kana: 'す', romaji: 'su', row: 'Sa', strokes: 2, guide: '1. Garis mendatar panjang. 2. Garis lurus tegak memotong, membuat loop lingkaran di tengah, lalu menjuntai lurus ke bawah dengan sedikit belokan.' },
  { kana: 'せ', romaji: 'se', row: 'Sa', strokes: 3, guide: '1. Garis datar panjang. 2. Garis vertikal pendek di kanan dengan kaitan kiri. 3. Garis vertikal kiri melengkung ke kanan bawah.' },
  { kana: 'そ', romaji: 'so', row: 'Sa', strokes: 1, guide: '1. Satu garis berkesinambungan membentuk huruf Z di atas lalu melengkung menyerupai mangkuk terbuka di bawah.' },

  // Baris Ta
  { kana: 'た', romaji: 'ta', row: 'Ta', strokes: 4, guide: '1. Garis datar pendek. 2. Garis miring memotong ke bawah. 3. Garis datar kecil di kanan bawah. 4. Garis lengkung di bawahnya (mirip huruf "ko").' },
  { kana: 'ち', romaji: 'chi', row: 'Ta', strokes: 2, guide: '1. Garis mendatar pendek. 2. Garis miring menusuk lalu memutar melengkung besar menyerupai angka 5.' },
  { kana: 'つ', romaji: 'tsu', row: 'Ta', strokes: 1, guide: '1. Satu tarikan melengkung besar dari kiri, memutar ke kanan atas, lalu melandai ke kiri bawah.' },
  { kana: 'て', romaji: 'te', row: 'Ta', strokes: 1, guide: '1. Garis datar lalu menekuk melengkung lebar ke arah kiri bawah.' },
  { kana: 'と', romaji: 'to', row: 'Ta', strokes: 2, guide: '1. Coretan miring pendek di atas. 2. Setengah lingkaran besar terbuka di bawah yang menempel pada ujung coretan pertama.' },

  // Baris Na
  { kana: 'な', romaji: 'na', row: 'Na', strokes: 4, guide: '1. Garis mendatar pendek. 2. Garis miring memotong ke bawah. 3. Titik coretan kecil di kanan atas. 4. Garis vertikal di bawah membuat simpul lingkaran kecil di ujungnya.' },
  { kana: 'に', romaji: 'ni', row: 'Na', strokes: 3, guide: '1. Garis vertikal kiri dengan kaitan di bawah. 2. Garis mendatar atas di kanan. 3. Garis mendatar bawah di kanan.' },
  { kana: 'ぬ', romaji: 'nu', row: 'Na', strokes: 2, guide: '1. Garis miring dari kiri atas ke kanan bawah. 2. Garis meliuk memutar dari kanan atas, memotong garis pertama, lalu melingkar besar dengan simpul pita di ujung kanan.' },
  { kana: 'ね', romaji: 'ne', row: 'Na', strokes: 2, guide: '1. Garis vertikal lurus di kiri. 2. Garis zig-zag melintasi garis vertikal, naik ke kanan, kembali ke kiri bawah, lalu memutar ke kanan membuat lingkaran simpul.' },
  { kana: 'の', romaji: 'no', row: 'Na', strokes: 1, guide: '1. Satu tarikan garis melengkung spiral dari tengah dalam, melingkar ke atas dan memutar lebar ke kanan bawah.' },

  // Baris Ha
  { kana: 'は', romaji: 'ha', row: 'Ha', strokes: 3, guide: '1. Garis vertikal di kiri dengan kaitan bawah. 2. Garis datar pendek di atas kanan. 3. Garis lurus ke bawah memotong garis datar, membuat simpul melingkar di bawah.' },
  { kana: 'ひ', romaji: 'hi', row: 'Ha', strokes: 1, guide: '1. Garis datar pendek kiri, melengkung turun naik lebar seperti senyuman besar, lalu berakhir datar di kanan.' },
  { kana: 'ふ', romaji: 'fu', row: 'Ha', strokes: 4, guide: '1. Lengkungan atas mirip paruh burung. 2. Garis vertikal meliuk di tengah bawah. 3. Coretan miring kiri. 4. Coretan miring kanan.' },
  { kana: 'へ', romaji: 'he', row: 'Ha', strokes: 1, guide: '1. Garis miring naik lalu menekuk landai miring turun ke kanan.' },
  { kana: 'ほ', romaji: 'ho', row: 'Ha', strokes: 4, guide: '1. Garis vertikal kiri dengan kaitan bawah. 2. Garis datar kanan atas. 3. Garis datar kanan tengah. 4. Garis vertikal tegak memotong kedua garis mendatar lalu bersimpul melingkar di bawah.' },

  // Baris Ma
  { kana: 'ま', romaji: 'ma', row: 'Ma', strokes: 3, guide: '1. Garis datar atas. 2. Garis datar tengah sejajar. 3. Garis tegak memotong dari atas lalu bersimpul bulat di bagian bawah.' },
  { kana: 'み', romaji: 'mi', row: 'Ma', strokes: 2, guide: '1. Garis mendatar miring ke kanan, melingkar bulat di kiri bawah, mendatar ke kanan. 2. Garis miring tegak menusuk ekor garis pertama.' },
  { kana: 'む', romaji: 'mu', row: 'Ma', strokes: 3, guide: '1. Garis mendatar pendek. 2. Garis tegak ke bawah membuat lekukan melingkar di kiri, lalu melebar ke kanan atas dengan kaitan. 3. Titik miring di kanan atas.' },
  { kana: 'め', romaji: 'me', row: 'Ma', strokes: 2, guide: '1. Garis miring pendek melengkung ke kanan bawah. 2. Garis meliuk dari kiri atas, memotong garis pertama, lalu melingkar besar ke kanan bawah.' },
  { kana: 'も', romaji: 'mo', row: 'Ma', strokes: 3, guide: '1. Garis lengkung vertikal memutar ke kanan (seperti pancing). 2. Garis datar atas memotong. 3. Garis datar bawah memotong.' },

  // Baris Ya
  { kana: 'や', romaji: 'ya', row: 'Ya', strokes: 3, guide: '1. Garis lengkung mendatar memutar ke bawah lalu berkait ke atas. 2. Coretan miring kecil di kanan atas. 3. Garis miring panjang memotong garis pertama.' },
  { kana: 'ゆ', romaji: 'yu', row: 'Ya', strokes: 2, guide: '1. Garis lurus miring ke bawah, memutar ke atas lalu melingkar besar ke kanan bawah. 2. Garis tegak melengkung memotong di sisi kanan.' },
  { kana: 'よ', romaji: 'yo', row: 'Ya', strokes: 2, guide: '1. Garis datar sangat pendek. 2. Garis tegak meluncur dari atas, bersimpul bulat di kiri bawah, lalu mengarah mendatar ke kanan.' },

  // Baris Ra
  { kana: 'ら', romaji: 'ra', row: 'Ra', strokes: 2, guide: '1. Coretan pendek melengkung di atas. 2. Garis tegak lurus melengkung besar terbuka di bawah menyerupai angka 5 tanpa topi.' },
  { kana: 'り', romaji: 'ri', row: 'Ra', strokes: 2, guide: '1. Garis vertikal kiri pendek berkait. 2. Garis vertikal kanan lebih panjang melengkung anggun ke kiri bawah.' },
  { kana: 'る', romaji: 'ru', row: 'Ra', strokes: 1, guide: '1. Garis zig-zag menyamping mirip angka 3, tetapi diakhiri dengan simpul melingkar penuh di bawahnya.' },
  { kana: 'れ', romaji: 're', row: 'Ra', strokes: 2, guide: '1. Garis tegak lurus di kiri. 2. Garis zig-zag menusuk garis kiri, naik, turun miring, lalu meliuk naik berbelok tajam ke kanan atas.' },
  { kana: 'ろ', romaji: 'ro', row: 'Ra', strokes: 1, guide: '1. Garis zig-zag menyamping mirip angka 3 (sama seperti "ru" tetapi tanpa simpul bulat di ujung bawah).' },

  // Baris Wa
  { kana: 'わ', romaji: 'wa', row: 'Wa', strokes: 2, guide: '1. Garis vertikal lurus di kiri. 2. Garis zig-zag menusuk garis kiri, miring turun, lalu melingkar besar terbuka ke kanan bawah.' },
  { kana: 'を', romaji: 'wo', row: 'Wa', strokes: 3, guide: '1. Garis mendatar. 2. Garis miring tegak menusuk, lalu berbelok mendatar ke kanan bawah. 3. Coretan lengkung di sisi kanan menyerupai huruf C terbalik.' },
  { kana: 'ん', romaji: 'n', row: 'Wa', strokes: 1, guide: '1. Satu coretan miring ke bawah, lalu meliuk tajam ke atas kanan membentuk gelombang mirip huruf "h" bersambung.' }
];

// ==========================================
// DATASET LENGKAP KATAKANA (SEION)
// ==========================================
const KATAKANA_DATA = [
  // Baris A
  { kana: 'ア', romaji: 'a', row: 'A', strokes: 2, guide: '1. Garis mendatar pendek menekuk tajam ke kiri bawah. 2. Garis miring melengkung di bawahnya mengarah ke kiri bawah.' },
  { kana: 'イ', romaji: 'i', row: 'A', strokes: 2, guide: '1. Garis miring menusuk dari kanan atas ke kiri bawah. 2. Garis vertikal lurus ke bawah di tengah garis pertama.' },
  { kana: 'ウ', romaji: 'u', row: 'A', strokes: 3, guide: '1. Garis vertikal kecil di atas tengah. 2. Garis vertikal kecil di kiri atas. 3. Garis datar mengalir dari titik kiri menekuk tajam ke bawah.' },
  { kana: 'エ', romaji: 'e', row: 'A', strokes: 3, guide: '1. Garis mendatar atas pendek. 2. Garis vertikal lurus di tengah. 3. Garis mendatar bawah yang lebih panjang.' },
  { kana: 'オ', romaji: 'o', row: 'A', strokes: 3, guide: '1. Garis mendatar tengah. 2. Garis tegak lurus berkait di bawahnya. 3. Garis miring di sebelah kiri memotong titik temu.' },

  // Baris Ka
  { kana: 'カ', romaji: 'ka', row: 'Ka', strokes: 2, guide: '1. Garis mendatar menekuk bersudut miring ke bawah. 2. Garis miring menusuk melengkung memotong ke kiri bawah (mirip Hiragana "ka" tanpa tanda kutip).' },
  { kana: 'キ', romaji: 'ki', row: 'Ka', strokes: 3, guide: '1. Garis mendatar atas. 2. Garis mendatar tengah sejajar. 3. Garis miring menusuk lurus memotong kedua garis ke kiri bawah.' },
  { kana: 'ク', romaji: 'ku', row: 'Ka', strokes: 2, guide: '1. Garis miring menusuk ke kiri bawah. 2. Garis datar berawal dari ujung atas menekuk tajam melengkung ke kiri bawah.' },
  { kana: 'ケ', romaji: 'ke', row: 'Ka', strokes: 3, guide: '1. Garis miring meluncur ke kiri. 2. Garis datar menyentuh garis miring. 3. Garis melengkung panjang memotong garis datar ke bawah.' },
  { kana: 'コ', romaji: 'ko', row: 'Ka', strokes: 2, guide: '1. Garis mendatar menekuk tajam lurus ke bawah. 2. Garis mendatar di bawah menutup ujung vertikal pertama.' },

  // Baris Sa
  { kana: 'サ', romaji: 'sa', row: 'Sa', strokes: 3, guide: '1. Garis mendatar panjang. 2. Garis vertikal pendek di kiri condong ke bawah. 3. Garis vertikal kanan menekuk sedikit ke bawah kanan.' },
  { kana: 'シ', romaji: 'shi', row: 'Sa', strokes: 3, guide: '1. Titik miring atas kiri. 2. Titik miring kedua di bawahnya. 3. Tarikan melengkung menyapu dari kiri bawah melesat ke kanan atas.' },
  { kana: 'ス', romaji: 'su', row: 'Sa', strokes: 2, guide: '1. Garis mendatar berawal miring ke kiri bawah. 2. Garis miring menusuk ke bawah kanan dari tengah garis pertama.' },
  { kana: 'セ', romaji: 'se', row: 'Sa', strokes: 2, guide: '1. Garis mendatar berbelok tajam meluncur ke kiri bawah. 2. Garis vertikal tegak miring menyentuh ujung belokan kanan lalu mengarah ke kanan.' },
  { kana: 'ソ', romaji: 'so', row: 'Sa', strokes: 2, guide: '1. Titik miring kiri atas. 2. Coretan miring panjang meluncur dari kanan atas ke kiri bawah (sejajar kemiringan).' },

  // Baris Ta
  { kana: 'タ', romaji: 'ta', row: 'Ta', strokes: 3, guide: '1. Garis miring pendek ke kiri. 2. Garis mendatar menusuk tekuk melengkung ke kiri bawah. 3. Garis miring pendek memotong bagian tengah dalam.' },
  { kana: 'チ', romaji: 'chi', row: 'Ta', strokes: 3, guide: '1. Coretan miring datar ke kiri atas. 2. Garis datar tengah di bawahnya. 3. Garis miring melengkung besar menusuk memotong ke kiri bawah.' },
  { kana: 'ツ', romaji: 'tsu', row: 'Ta', strokes: 3, guide: '1. Titik miring tegak di kiri atas. 2. Titik miring tegak kedua di kanannya. 3. Garis miring lurus menyapu meluncur dari kanan atas ke kiri bawah.' },
  { kana: 'テ', romaji: 'te', row: 'Ta', strokes: 3, guide: '1. Garis mendatar atas pendek. 2. Garis mendatar tengah lebih panjang. 3. Garis miring anggun menyapu dari tengah bawah garis kedua ke kiri bawah.' },
  { kana: 'ト', romaji: 'to', row: 'Ta', strokes: 2, guide: '1. Garis vertikal tegak lurus. 2. Garis miring menusuk ke bawah kanan menempel di tengah garis vertikal.' },

  // Baris Na
  { kana: 'ナ', romaji: 'na', row: 'Na', strokes: 2, guide: '1. Garis mendatar lebar. 2. Garis miring panjang menusuk membelok ke kiri bawah.' },
  { kana: 'ニ', romaji: 'ni', row: 'Na', strokes: 2, guide: '1. Garis mendatar pendek di atas. 2. Garis mendatar lebih panjang di bawahnya.' },
  { kana: 'ヌ', romaji: 'nu', row: 'Na', strokes: 2, guide: '1. Garis mendatar menekuk menyudut miring ke kiri bawah. 2. Garis silang memotong diagonal di tengahnya.' },
  { kana: 'ネ', romaji: 'ne', row: 'Na', strokes: 4, guide: '1. Titik miring di atas. 2. Garis datar pendek menekuk lurus miring ke kiri bawah. 3. Garis vertikal menopang di tengah bawah. 4. Coretan miring di kanan bawah.' },
  { kana: 'ノ', romaji: 'no', row: 'Na', strokes: 1, guide: '1. Satu coretan miring anggun meluncur bebas dari kanan atas menyapu ke kiri bawah.' },

  // Baris Ha
  { kana: 'ハ', romaji: 'ha', row: 'Ha', strokes: 2, guide: '1. Garis miring pendek meluncur ke kiri bawah. 2. Garis miring panjang meluncur ke kanan bawah secara simetris.' },
  { kana: 'ヒ', romaji: 'hi', row: 'Ha', strokes: 2, guide: '1. Garis datar meliuk miring ke kanan. 2. Garis melengkung menyerupai mangkok terbuka di kanan dengan tangkai miring lurus di bawah.' },
  { kana: 'フ', romaji: 'fu', row: 'Ha', strokes: 1, guide: '1. Garis mendatar menekuk landai melengkung miring ke kiri bawah.' },
  { kana: 'ヘ', romaji: 'he', row: 'Ha', strokes: 1, guide: '1. Garis miring pendek naik lalu menekuk landai miring turun ke kanan (sama dengan Hiragana).' },
  { kana: 'ホ', romaji: 'ho', row: 'Ha', strokes: 4, guide: '1. Garis mendatar. 2. Garis vertikal tegak lurus menusuk berkait di bawah. 3. Coretan miring kiri penyeimbang. 4. Coretan miring kanan.' },

  // Baris Ma
  { kana: 'マ', romaji: 'ma', row: 'Ma', strokes: 2, guide: '1. Garis mendatar menekuk tajam miring lurus ke kiri bawah. 2. Garis miring pendek menyentuh sudut atas kanan.' },
  { kana: 'ミ', romaji: 'mi', row: 'Ma', strokes: 3, guide: '1. Coretan miring mendatar atas. 2. Coretan kedua sejajar di tengah. 3. Coretan ketiga sejajar di bawah.' },
  { kana: 'ム', romaji: 'mu', row: 'Ma', strokes: 2, guide: '1. Coretan miring ke kiri bawah menekuk meluncur horizontal ke kanan. 2. Titik miring di kanan bawah.' },
  { kana: 'メ', romaji: 'me', row: 'Ma', strokes: 2, guide: '1. Garis miring meluncur anggun dari kanan atas ke kiri bawah. 2. Garis miring pendek memotong persis di tengahnya.' },
  { kana: 'モ', romaji: 'mo', row: 'Ma', strokes: 3, guide: '1. Garis mendatar atas. 2. Garis mendatar kedua sejajar. 3. Garis vertikal pancing menekuk memotong dari atas.' },

  // Baris Ya
  { kana: 'ヤ', romaji: 'ya', row: 'Ya', strokes: 2, guide: '1. Garis mendatar menekuk tajam condong ke kiri bawah. 2. Garis tegak lurus memotong meluncur miring.' },
  { kana: 'ユ', romaji: 'yu', row: 'Ya', strokes: 2, guide: '1. Garis mendatar menekuk mengarah ke bawah lalu meluncur lurus ke kanan. 2. Garis mendatar memotong bagian tengahnya.' },
  { kana: 'ヨ', romaji: 'yo', row: 'Ya', strokes: 3, guide: '1. Garis mendatar atas menekuk lurus ke bawah. 2. Garis mendatar tengah menempel. 3. Garis mendatar bawah menutup rapi.' },

  // Baris Ra
  { kana: 'ラ', romaji: 'ra', row: 'Ra', strokes: 2, guide: '1. Garis mendatar atas pendek. 2. Garis mendatar kedua menekuk tajam meluncur miring ke kiri bawah.' },
  { kana: 'リ', romaji: 'ri', row: 'Ra', strokes: 2, guide: '1. Garis vertikal kiri lurus. 2. Garis vertikal kanan panjang meliuk miring ke kiri bawah.' },
  { kana: 'ル', romaji: 'ru', row: 'Ra', strokes: 2, guide: '1. Garis miring menyerong ke bawah kanan menekuk ke kiri bawah. 2. Garis tegak lurus di kanan membengkok anggun ke kanan bawah.' },
  { kana: 'レ', romaji: 're', row: 'Ra', strokes: 1, guide: '1. Garis vertikal lurus ke bawah menekuk tajam menanjak ke kanan atas.' },
  { kana: 'ロ', romaji: 'ro', row: 'Ra', strokes: 3, guide: '1. Garis vertikal kiri. 2. Garis mendatar atas menekuk tajam lurus ke bawah kanan. 3. Garis mendatar bawah menyatukan kotak dengan rapi.' },

  // Baris Wa
  { kana: 'ワ', romaji: 'wa', row: 'Wa', strokes: 2, guide: '1. Garis vertikal kiri pendek. 2. Garis mendatar menusuk menekuk tajam meluncur melengkung ke kiri bawah.' },
  { kana: 'ヲ', romaji: 'wo', row: 'Wa', strokes: 3, guide: '1. Garis mendatar atas. 2. Garis mendatar tengah sejajar. 3. Garis miring menyapu dari tengah atas ke kiri bawah memotong keduanya.' },
  { kana: 'ン', romaji: 'n', row: 'Wa', strokes: 2, guide: '1. Titik miring condong di kiri atas. 2. Garis miring menyapu tegak lurus mengarah dari kiri bawah melesat ke kanan atas.' }
];

const AVAILABLE_ROWS = ['Semua', 'A', 'Ka', 'Sa', 'Ta', 'Na', 'Ha', 'Ma', 'Ya', 'Ra', 'Wa'];

const QUIZ_TYPE_OPTIONS = [
  { id: 'Semua', label: 'Semua Tipe Soal' },
  { id: 'multiple-choice', label: 'Pilihan Ganda' },
  { id: 'typing', label: 'Mengetik Romaji' },
  { id: 'speaking', label: 'Pengucapan Suara' },
  { id: 'matching', label: 'Cocokkan Kartu' },
  { id: 'writing', label: 'Menggambar Aksara' }
];

interface MatchingPair {
  kana: string;
  romaji: string;
}

interface QuizQuestion {
  originalItem: {
    kana: string;
    romaji: string;
    row: string;
    strokes: number;
    guide: string;
  };
  type: 'multiple-choice' | 'typing' | 'speaking' | 'matching' | 'writing';
  questionText: string;
  isQuestionKana: boolean;
  correctAnswer: string;
  options: string[];
  matchingPairs?: MatchingPair[];
}

interface QuizHistoryItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  romaji: string;
  kana: string;
}

const getStrokeGuideUrl = (char: string) => {
  const codePoint = char.codePointAt(0);
  if (!codePoint) return '';
  const hex = codePoint.toString(16).padStart(5, '0');
  return `https://raw.githubusercontent.com/KanjiVG/KanjiVG/master/kanji/${hex}.svg`;
};

const toHiragana = (str: string): string =>
  str.replace(/[\u30A1-\u30F6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

const normalizeSpeechText = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[\u3000\s.,/#!$%^&*;:{}=\-_`~()「」。、]/g, '');

const deduplicateCharsAndWords = (text: string): string => {
  if (!text) return '';
  
  // 1. Pecah dan hapus kata berulang dengan spasi (untuk romaji, misal: "so so so" -> "so")
  const words = text.split(/[\s\u3000]+/);
  const uniqueWords: string[] = [];
  for (const w of words) {
    if (!w.trim()) continue;
    if (uniqueWords.length === 0 || w.trim().toLowerCase() !== uniqueWords[uniqueWords.length - 1].toLowerCase()) {
      uniqueWords.push(w.trim());
    }
  }
  
  const jointWords = uniqueWords.join(' ');
  
  // 2. Untuk karakter Jepang berurutan tanpa spasi (misal: "ほほほ" -> "ほ")
  if (jointWords.length > 1) {
    const chars = [...jointWords];
    const firstChar = chars[0];
    if (chars.every(c => c === firstChar)) {
      return firstChar;
    }
  }
  
  return jointWords;
};

const PHONETIC_MAP: Record<string, string[]> = {
  a: ['a', 'ah', 'are', 'ar', 'up', 'an', 'at', 'as', 'am', 'あ', 'ア', '阿', '亜'],
  i: ['i', 'ee', 'each', 'eat', 'it', 'in', 'is', 'y', 'e', 'い', 'イ', '胃', '意', '医', '井', '衣', '位', '委'],
  u: ['u', 'oo', 'who', 'you', 'yoo', 'uh', 'o', 'to', 'two', 'through', 'up', 'us', 'う', 'ウ', '宇', '有', '羽'],
  e: ['e', 'eh', 'ay', 'a', 'he', 'hey', 'pay', 'え', 'エ', '絵', '重', '衣'],
  o: ['o', 'oh', 'owe', 'or', 'all', 'ok', 'of', 'on', 'who', 'wo', 'を', 'ヲ', 'おう', 'お', 'オ', '尾', '男', '御'],
  ka: ['ka', 'car', 'cut', 'kah', 'a', 'ah', 'ca', 'c', 'k', 'か', 'カ', '蚊', '課', '科', '香', '下', '化', '加'],
  ki: ['ki', 'key', 'gee', 'kih', 'i', 'ee', 'qi', 'gee', 'き', 'キ', '木', '気', '期', '機', '黄', '来'],
  ku: ['ku', 'coo', 'cool', 'kuh', 'u', 'oo', 'q', 'koo', 'く', 'ク', '区', '苦', '九', '工'],
  ke: ['ke', 'kay', 'care', 'keh', 'e', 'eh', 'k', 'け', 'ケ', '毛', '化'],
  ko: ['ko', 'co', 'core', 'koh', 'o', 'oh', 'co', 'go', 'k', 'こ', 'コ', '子', '個', '戸', '湖', '古'],
  sa: ['sa', 'sun', 'sah', 'a', 'ah', 's', 'さ', 'サ', '差', '左', '砂'],
  shi: ['shi', 'she', 'see', 'し', 'シ', '四', '市', '死', '静', '師', '志', '私', 'c', 'si', 'ci', 'shee', 'i', 'ee'],
  su: ['su', 'sue', 'soon', 'す', 'ス', '酢', '巣', '素', '数', 'so', 'sou', 'そ', 'ソ', 'そう', 's', 'u', 'oo'],
  se: ['se', 'say', 'set', 'seh', 'e', 'eh', 's', 'せ', 'セ', '背', '瀬'],
  so: ['so', 'sew', 'saw', 'soh', 'o', 'oh', 's', 'そ', 'ソ', '粗', '祖', '素'],
  ta: ['ta', 'tar', 'touch', 'tah', 'a', 'ah', 't', 'た', 'タ', '田', '多', '太'],
  chi: ['chi', 'chee', 'cheap', 'she', 'tea', 'qi', 'key', 'ci', 'c', 'i', 'ee', 't', 'ち', 'チ', '血', '地', '知', '千'],
  tsu: ['tsu', 'too', 'two', 'sue', 'ts', 'chu', 'zu', 'zoo', 'u', 'oo', 't', 'つ', 'ツ', '津', '都'],
  te: ['te', 'tay', 'take', 'teh', 'e', 'eh', 't', 'て', 'テ', '手', '天'],
  to: ['to', 'toe', 'two', 'toh', 'o', 'oh', 't', 'と', 'ト', '都', '図', '戸', '外'],
  na: ['na', 'nah', 'now', 'nah', 'a', 'ah', 'n', 'な', 'ナ', '名', '菜', '無'],
  ni: ['ni', 'knee', 'near', 'nih', 'i', 'ee', 'n', 'に', 'ニ', '二', '荷', '似'],
  nu: ['nu', 'new', 'noo', 'nuh', 'u', 'oo', 'n', 'ぬ', 'ヌ'],
  ne: ['ne', 'nay', 'net', 'neh', 'e', 'eh', 'n', 'ね', 'ネ', '根', '音'],
  no: ['no', 'know', 'noh', 'o', 'oh', 'n', 'の', 'ノ', '野'],
  ha: ['ha', 'hah', 'hot', 'a', 'ah', 'h', 'は', 'ハ', '歯', '葉', '波', '羽'],
  hi: ['hi', 'hee', 'he', 'i', 'ee', 'h', 'ひ', 'ヒ', '火', '日', '比', '非', '避'],
  fu: ['fu', 'who', 'foo', 'hu', 'full', 'for', 'f', 'u', 'oo', 'ふ', 'フ', '二', '府', '婦', '夫', '符'],
  he: ['he', 'hay', 'hair', 'heh', 'e', 'eh', 'hei', 'hey', 'h', 'へ', 'ヘ', '経', '辺', '屁'],
  ho: ['ho', 'hoe', 'home', 'hoh', 'o', 'oh', 'how', 'h', 'ほ', 'ホ', '帆', '歩', '火', '保'],
  ma: ['ma', 'mah', 'my', 'mah', 'a', 'ah', 'm', 'ま', 'マ', '間', '真', '魔'],
  mi: ['mi', 'mee', 'me', 'mih', 'i', 'ee', 'm', 'み', 'ミ', '実', '身', '見', '美', '三'],
  mu: ['mu', 'moo', 'move', 'muh', 'u', 'oo', 'm', 'む', 'ム', '無', '六', '牟'],
  me: ['me', 'may', 'met', 'meh', 'e', 'eh', 'm', 'め', 'メ', '目', '芽', '女'],
  mo: ['mo', 'more', 'mow', 'moh', 'o', 'oh', 'm', 'も', 'モ', '藻', '毛', '百'],
  ya: ['ya', 'yah', 'yard', 'a', 'ah', 'y', 'や', 'ヤ', '矢', '屋', '夜', '八'],
  yu: ['yu', 'you', 'yoo', 'yuh', 'u', 'oo', 'y', 'ゆ', 'ユ', '湯', '弓', '由', '輸'],
  yo: ['yo', 'yow', 'your', 'yoh', 'o', 'oh', 'y', 'よ', 'ヨ', '夜', '余', '四', '与'],
  ra: ['ra', 'rah', 'run', 'rah', 'a', 'ah', 'r', 'ら', 'ラ', '等', '裸'],
  ri: ['ri', 'ree', 're', 'rih', 'i', 'ee', 'RE', 'ri.', 'r', 'り', 'リ', '利', '理', '里', '陸'],
  ru: ['ru', 'roo', 'rule', 'ruh', 'u', 'oo', 'r', 'る', 'ル', '留', '流', '類'],
  re: ['re', 'ray', 'red', 'reh', 'e', 'eh', 'r', 'れ', 'レ', '例', '礼', '冷'],
  ro: ['ro', 'row', 'road', 'roh', 'o', 'oh', 'r', 'ろ', 'ロ', '路', '炉', '露'],
  wa: ['wa', 'white', 'one', 'wah', 'a', 'ah', 'w', 'わ', 'ワ', '輪', '和', '話'],
  wo: ['wo', 'war', 'whoa', 'woh', 'o', 'oh', 'w', 'を', 'ヲ', 'ウォ'],
  n: ['n', 'end', 'in', 'and', 'ん', 'ン', '運']
};

const isRepeatedRomaji = (spoken: string, expected: string): boolean => {
  if (!spoken || !expected) return false;
  const cleanSpoken = spoken.toLowerCase().trim();
  const cleanExpected = expected.toLowerCase().trim();
  if (cleanSpoken === cleanExpected) return true;

  try {
    const escaped = cleanExpected.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const replaced = cleanSpoken.replace(new RegExp(escaped, 'g'), '');
    return replaced === '';
  } catch {
    return false;
  }
};

const isPhoneticMatch = (spoken: string, expected: string): boolean => {
  const cleanSpoken = normalizeSpeechText(spoken);
  const cleanExpected = expected.toLowerCase().trim();
  if (cleanSpoken === cleanExpected) return true;

  if (isRepeatedRomaji(cleanSpoken, cleanExpected)) return true;

  const list = PHONETIC_MAP[cleanExpected];
  if (!list) return false;

  const spokenHiragana = toHiragana(cleanSpoken);
  if (list.some((val) => {
    const v = val.toLowerCase();
    return cleanSpoken === v || spokenHiragana === toHiragana(v) || isRepeatedRomaji(cleanSpoken, v);
  })) {
    return true;
  }

  if (cleanExpected.length >= 2) {
    return list.some(
      (val) => cleanSpoken.includes(val.toLowerCase()) || val.toLowerCase().includes(cleanSpoken)
    );
  }
  return false;
};

const isSpeechCorrect = (resultText: string, kana: string, romaji: string): boolean => {
  const cleanResult = normalizeSpeechText(resultText);
  const cleanRomaji = romaji.toLowerCase().trim();
  const normalizedKana = toHiragana(kana);
  const resultHiragana = toHiragana(cleanResult);

  if (resultHiragana.includes(normalizedKana)) return true;
  if (cleanResult === cleanRomaji) return true;
  if (isRepeatedRomaji(cleanResult, cleanRomaji)) return true;

  // Jika romaji adalah huruf vokal pendek (length 1), toleransi kata pendek <= 3 huruf yang mengandung romaji tersebut (misal: "on", "oh", "ok" untuk "o")
  if (cleanRomaji.length === 1 && cleanResult.length <= 3 && cleanResult.includes(cleanRomaji)) return true;

  if (cleanRomaji.length >= 2 && cleanResult.includes(cleanRomaji)) return true;

  if (isPhoneticMatch(cleanResult, cleanRomaji)) return true;

  for (const token of resultText.split(/[\s\u3000]+/)) {
    const cleanToken = normalizeSpeechText(token);
    if (!cleanToken) continue;
    if (toHiragana(cleanToken).includes(normalizedKana)) return true;
    if (isPhoneticMatch(cleanToken, cleanRomaji)) return true;
  }

  return false;
};

const evaluateSpeechResults = (
  event: SpeechRecognitionEvent,
  kana: string,
  romaji: string
): { transcript: string; isCorrect: boolean; isFinal: boolean } => {
  let transcript = '';
  let isCorrect = false;
  let isFinal = false;

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (result.isFinal) isFinal = true;
    for (let j = 0; j < result.length; j++) {
      const alt = result[j].transcript.trim();
      if (!alt) continue;
      transcript = alt;
      const cleanAlt = deduplicateCharsAndWords(alt);
      if (isSpeechCorrect(alt, kana, romaji) || isSpeechCorrect(cleanAlt, kana, romaji)) {
        return { transcript: alt, isCorrect: true, isFinal: result.isFinal };
      }
    }
  }

  return { transcript, isCorrect, isFinal };
};

const checkStrokeOrder = (
  userStrokes: Array<Array<{ x: number; y: number }>>,
  rawSvg: string
): { success: boolean; message?: string } => {
  if (!rawSvg) {
    // Jika visual guide SVG tidak dimuat (offline/error), skip pengecekan
    return { success: true };
  }

  // Filter out tiny accidental strokes/clicks
  const validStrokes = userStrokes.filter((stroke) => {
    if (stroke.length < 2) return false;
    let dist = 0;
    for (let i = 1; i < stroke.length; i++) {
      dist += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
    }
    return dist > 15; // filter out noise
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return { success: true };

  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = '109px';
  tempDiv.style.height = '109px';
  tempDiv.appendChild(svgEl);
  document.body.appendChild(tempDiv);

  try {
    const paths = Array.from(svgEl.querySelectorAll('path')).filter(
      (p) => p.id && p.id.includes('-s')
    ) as SVGPathElement[];

    // Hanya periksa JUMLAH coretan — posisi dan arah tidak diperiksa
    if (validStrokes.length !== paths.length) {
      return {
        success: false,
        message: `Jumlah coretan kurang tepat! Karakter ini membutuhkan ${paths.length} coretan, sedangkan Anda membuat ${validStrokes.length} coretan.`
      };
    }
  } catch (error) {
    console.error('Error checking stroke order:', error);
  } finally {
    document.body.removeChild(tempDiv);
  }

  return { success: true };
};

export default function App() {
  // Sesi Filter & Pengaturan Global
  const [characterType, setCharacterType] = useState('hiragana'); // 'hiragana' | 'katakana'
  const [selectedRows, setSelectedRows] = useState<string[]>(['Semua']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [selectedQuizTypes, setSelectedQuizTypes] = useState<string[]>(['Semua']);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);

  // Click outside listener untuk custom dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [appMode, setAppMode] = useState('study'); // 'study' | 'quiz'

  // State Mode Belajar (Flashcard)
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [showSelectorModal, setShowSelectorModal] = useState(false); // Quick selector popup

  // State Tracing Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#4f46e5'); // Indigo-600
  const [checkingStatus, setCheckingStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Stroke refs
  const userStrokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const quizUserStrokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const rawSvgTextRef = useRef<string>('');

  // State Mode Kuis
  const [quizLength, setQuizLength] = useState(10); // Default 10 soal
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const isAnsweredRef = useRef(isAnswered);
  useEffect(() => {
    isAnsweredRef.current = isAnswered;
  }, [isAnswered]);
  const skipResetRef = useRef(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [userName, setUserName] = useState('');
  
  // Stopwatch Timer
  const [quizTime, setQuizTime] = useState(0);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (appMode === 'quiz' && !quizFinished) {
      setQuizTime(0);
      const timer = setInterval(() => {
        setQuizTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [appMode, quizFinished]);

  // Typing Quiz
  const [typingInput, setTypingInput] = useState('');

  // Speaking Quiz
  const [isListening, setIsListening] = useState(false);
  const [speakingRecognizedText, setSpeakingRecognizedText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Matching Game
  const [selectedKana, setSelectedKana] = useState<string | null>(null);
  const [selectedRomaji, setSelectedRomaji] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [matchingShuffledKana, setMatchingShuffledKana] = useState<string[]>([]);
  const [matchingShuffledRomaji, setMatchingShuffledRomaji] = useState<string[]>([]);

  // Writing Quiz
  const quizCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isQuizDrawing, setIsQuizDrawing] = useState(false);

  // State Generator Status Card
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const statusCanvasRef = useRef<HTMLCanvasElement | null>(null);



  // Audio Ref untuk Musik Kemenangan
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);

  // Efek memutar musik kemenangan saat kuis selesai
  useEffect(() => {
    if (quizFinished && appMode === 'quiz') {
      if (!victoryAudioRef.current) {
        victoryAudioRef.current = new Audio('/finishTest.mp3');
        victoryAudioRef.current.loop = true;
      }
      victoryAudioRef.current.play().catch((err) => {
        console.log("Gagal memutar musik, perlu interaksi pengguna terlebih dahulu:", err);
      });
    } else {
      if (victoryAudioRef.current) {
        victoryAudioRef.current.pause();
        victoryAudioRef.current.currentTime = 0;
      }
    }
  }, [quizFinished, appMode]);

  // Filter dataset aktif sesuai pilihan Hiragana/Katakana & Baris
  const activeDataset = useMemo(() => {
    const rawData = characterType === 'hiragana' ? HIRAGANA_DATA : KATAKANA_DATA;
    if (selectedRows.includes('Semua') || selectedRows.length === 0) return rawData;
    return rawData.filter(item => selectedRows.includes(item.row));
  }, [characterType, selectedRows]);

  // Efek memuat KanjiVG SVG dan menyisipkan indikator arah coretan (arrow & dot)
  useEffect(() => {
    let isMounted = true;
    if (activeDataset.length === 0 || !activeDataset[cardIndex]) {
      setSvgContent(null);
      rawSvgTextRef.current = '';
      return;
    }
    const char = activeDataset[cardIndex].kana;
    const url = getStrokeGuideUrl(char);
    if (!url) {
      setSvgContent(null);
      return;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch SVG');
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        rawSvgTextRef.current = text;

        // Parse SVG dan sisipkan penanda panah & titik mulai
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');

        if (svgEl) {
          // Defs untuk menyimpan marker panah dan titik
          const defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');

          // Marker kepala panah di ujung garis
          const marker = doc.createElementNS('http://www.w3.org/2000/svg', 'marker');
          marker.setAttribute('id', 'arrow-marker');
          marker.setAttribute('viewBox', '0 0 10 10');
          marker.setAttribute('refX', '7');
          marker.setAttribute('refY', '5');
          marker.setAttribute('markerWidth', '5');
          marker.setAttribute('markerHeight', '5');
          marker.setAttribute('orient', 'auto');

          const markerPath = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
          markerPath.setAttribute('d', 'M 0 2 L 8 5 L 0 8 z');
          markerPath.setAttribute('fill', '#3b82f6'); // Biru untuk panah
          marker.appendChild(markerPath);
          defs.appendChild(marker);

          // Marker bulatan kecil di awal garis
          const startMarker = doc.createElementNS('http://www.w3.org/2000/svg', 'marker');
          startMarker.setAttribute('id', 'start-dot');
          startMarker.setAttribute('viewBox', '0 0 10 10');
          startMarker.setAttribute('refX', '5');
          startMarker.setAttribute('refY', '5');
          startMarker.setAttribute('markerWidth', '3.5');
          startMarker.setAttribute('markerHeight', '3.5');
          startMarker.setAttribute('orient', 'auto');

          const startCircle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          startCircle.setAttribute('cx', '5');
          startCircle.setAttribute('cy', '5');
          startCircle.setAttribute('r', '3');
          startCircle.setAttribute('fill', '#3b82f6'); // Biru untuk titik mulai
          startMarker.appendChild(startCircle);
          defs.appendChild(startMarker);

          svgEl.insertBefore(defs, svgEl.firstChild);

          // Rancang ulang coretan: 
          // 1. Coretan asli dibuat tebal abu-abu lembut sebagai panduan menulis (tanpa panah)
          // 2. Duplikasi coretan menjadi garis biru tipis dengan panah arah di dalamnya
          const paths = doc.querySelectorAll('path');
          paths.forEach((p) => {
            if (p.id && p.id.includes('-s')) {
              // Gaya coretan panduan utama (tebal & bersih)
              p.setAttribute('stroke', '#cbd5e1'); // Slate-200 (abu-abu lembut)
              p.setAttribute('stroke-width', '11'); // Tebal seperti kuas
              p.setAttribute('fill', 'none');
              p.removeAttribute('marker-start');
              p.removeAttribute('marker-end');

              // Gandakan path untuk panah petunjuk arah
              const arrowPath = p.cloneNode(true) as SVGPathElement;
              arrowPath.removeAttribute('id');
              arrowPath.setAttribute('stroke', '#3b82f6'); // Biru
              arrowPath.setAttribute('stroke-width', '1.5'); // Tipis di tengah
              arrowPath.setAttribute('fill', 'none');
              arrowPath.setAttribute('marker-start', 'url(#start-dot)');
              arrowPath.setAttribute('marker-end', 'url(#arrow-marker)');
              
              // Masukkan path panah setelah path utama agar menumpuk di atasnya
              p.parentNode?.insertBefore(arrowPath, p.nextSibling);
            }
          });

          // Style nomor coretan agar terlihat bold & berwarna biru
          const textElements = doc.querySelectorAll('text');
          textElements.forEach((t) => {
            t.setAttribute('fill', '#2563eb'); // Royal blue
            t.setAttribute('font-weight', 'bold');
            t.setAttribute('font-size', '10px');
          });

          svgEl.setAttribute('width', '100%');
          svgEl.setAttribute('height', '100%');

          const serializer = new XMLSerializer();
          setSvgContent(serializer.serializeToString(svgEl));
        } else {
          setSvgContent(null);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat visual guide:", err);
        if (isMounted) {
          setSvgContent(null);
          rawSvgTextRef.current = '';
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cardIndex, activeDataset]);

  // Reset indeks kartu bila dataset berganti
  useEffect(() => {
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    setCardIndex(0);
    setIsFlipped(false);
    clearCanvas();
  }, [activeDataset]);

  // Efek inisialisasi Canvas Gambar saat kartu aktif berubah
  useEffect(() => {
    if (appMode === 'study' && canvasRef.current) {
      clearCanvas();
    }
  }, [cardIndex, appMode, activeDataset]);

  // ==========================================
  // FITUR AUDIO (VOICE PRO)
  // ==========================================
  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.75;
      window.speechSynthesis.speak(utterance);
    }
  };

  // ==========================================
  // LOGIKA TRACING CANVAS
  // ==========================================
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (checkingStatus !== 'idle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    userStrokesRef.current.push([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (checkingStatus !== 'idle') return;
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (userStrokesRef.current.length > 0) {
      userStrokesRef.current[userStrokesRef.current.length - 1].push({ x, y });
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    userStrokesRef.current = [];
  };

  // LOGIKA TRACING CANVAS UNTUK KUIS (WRITING TYPE)
  const quizStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (checkingStatus !== 'idle') return;
    const canvas = quizCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsQuizDrawing(true);
    quizUserStrokesRef.current.push([{ x, y }]);
  };

  const quizDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (checkingStatus !== 'idle') return;
    if (!isQuizDrawing) return;
    const canvas = quizCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (quizUserStrokesRef.current.length > 0) {
      quizUserStrokesRef.current[quizUserStrokesRef.current.length - 1].push({ x, y });
    }
  };

  const quizStopDrawing = () => {
    setIsQuizDrawing(false);
  };

  const quizClearCanvas = () => {
    const canvas = quizCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    quizUserStrokesRef.current = [];
  };

  // Sound teneng (benar) menggunakan Web Audio API
  const playTeneng = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration - 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      playTone(659.25, now, 0.12); // E5
      playTone(783.99, now + 0.1, 0.35); // G5
    } catch (e) {
      console.log("Audio play failed:", e);
    }
  };

  // Sound tetot (salah) menggunakan Web Audio API
  const playTetot = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth'; // Buzzing sound
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration - 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      playTone(130.81, now, 0.15); // C3
      playTone(98.00, now + 0.15, 0.35); // G2
    } catch (e) {
      console.log("Audio play failed:", e);
    }
  };

  // Coretan Checker (Stroke checker)
  // Validasi: hanya cek jumlah coretan — posisi, arah, dan bentuk tidak diperhitungkan
  const verifyDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cek apakah ada coretan sama sekali (deteksi pixel non-putih)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasPixels = false;
    for (let i = 0; i < imageData.length; i += 4) {
      if (imageData[i] < 240 || imageData[i+1] < 240 || imageData[i+2] < 240) {
        hasPixels = true;
        break;
      }
    }

    if (!hasPixels) {
      setCheckingStatus('fail');
      setValidationMessage('Anda belum menulis apa pun.');
      playTetot();
      setTimeout(() => {
        setCheckingStatus('idle');
        setValidationMessage(null);
      }, 1500);
      return;
    }

    // Cek jumlah coretan — satu-satunya validasi yang berlaku
    if (rawSvgTextRef.current) {
      const strokeCheck = checkStrokeOrder(userStrokesRef.current, rawSvgTextRef.current);
      if (!strokeCheck.success) {
        setCheckingStatus('fail');
        setValidationMessage(strokeCheck.message || 'Jumlah coretan tidak tepat!');
        playTetot();
        setTimeout(() => {
          setCheckingStatus('idle');
          setValidationMessage(null);
        }, 3000);
        return;
      }
    }

    // Lulus — jumlah coretan benar!
    setCheckingStatus('success');
    playTeneng();
    setTimeout(() => {
      setCheckingStatus('idle');
      setValidationMessage(null);
      handleNextCard();
    }, 1200);
  };

  // Coretan Checker Kuis (Stroke checker kuis)
  // Validasi: hanya cek jumlah coretan — posisi, arah, dan bentuk tidak diperhitungkan
  const verifyQuizDrawing = () => {
    const canvas = quizCanvasRef.current;
    if (!canvas) return;

    const currentQ = quizQuestions[currentQuestionIndex];

    // Cek apakah ada coretan sama sekali
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasPixels = false;
    for (let i = 0; i < imageData.length; i += 4) {
      if (imageData[i] < 240 || imageData[i+1] < 240 || imageData[i+2] < 240) {
        hasPixels = true;
        break;
      }
    }

    if (!hasPixels) {
      setCheckingStatus('fail');
      setValidationMessage('Anda belum menulis apa pun.');
      playTetot();
      setTimeout(() => {
        setCheckingStatus('idle');
        setValidationMessage(null);
      }, 1500);
      return;
    }

    // Cek jumlah coretan — satu-satunya validasi yang berlaku
    if (rawSvgTextRef.current) {
      const strokeCheck = checkStrokeOrder(quizUserStrokesRef.current, rawSvgTextRef.current);
      if (!strokeCheck.success) {
        setCheckingStatus('fail');
        setValidationMessage(strokeCheck.message || 'Jumlah coretan tidak tepat!');
        playTetot();
        setTimeout(() => {
          setCheckingStatus('idle');
          setValidationMessage(null);
        }, 3000);
        return;
      }
    }

    // Lulus — jumlah coretan benar!
    setCheckingStatus('success');
    playTeneng();
    setTimeout(() => {
      setCheckingStatus('idle');
      setValidationMessage(null);
      handleAnswerSubmit(currentQ.correctAnswer);
    }, 1200);
  };

  // Efek memuat visual guide SVG untuk kuis (tipe writing)
  useEffect(() => {
    let isMounted = true;
    if (appMode !== 'quiz' || quizQuestions.length === 0 || !quizQuestions[currentQuestionIndex]) {
      return;
    }
    const currentQ = quizQuestions[currentQuestionIndex];
    if (currentQ.type !== 'writing') return;

    const char = currentQ.originalItem.kana;
    const url = getStrokeGuideUrl(char);
    if (!url) return;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch SVG');
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        rawSvgTextRef.current = text;
      })
      .catch((err) => {
        console.error("Gagal memuat visual guide kuis:", err);
        if (isMounted) {
          rawSvgTextRef.current = '';
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentQuestionIndex, quizQuestions, appMode]);

  // Web Speech API - Mulai Rekam Suara
  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startSpeechRecognition = async () => {
    if (isListening || isAnsweredRef.current) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert('Browser Anda tidak mendukung Web Speech API. Gunakan Google Chrome atau Microsoft Edge terbaru.');
      return;
    }

    setSpeakingRecognizedText('Meminta akses mikrofon...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      setSpeakingRecognizedText('Akses mikrofon ditolak atau tidak terdeteksi. Silakan izinkan akses mikrofon pada pengaturan browser Anda lalu coba lagi.');
      return;
    }

    stopSpeechRecognition();

    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ || currentQ.type !== 'speaking') return;

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    recognition.lang = 'ja-JP';
    
    // Set continuous ke true agar mic tetap merekam secara terus menerus dan tidak menutup cepat saat jeda hening sejenak
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    let latestTranscript = '';

    // Timeout keamanan jika hening selama 12 detik berturut-turut untuk menghentikan mic
    let silenceTimeout: any;
    const resetSilenceTimeout = () => {
      clearTimeout(silenceTimeout);
      silenceTimeout = setTimeout(() => {
        if (recognitionRef.current === recognition) {
          stopSpeechRecognition();
          if (!isAnsweredRef.current && latestTranscript) {
            handleAnswerSubmit(latestTranscript);
          } else {
            setSpeakingRecognizedText('Perekam suara dinonaktifkan (hening). Ketuk kembali ikon mic untuk mengulangi.');
          }
        }
      }, 12000);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setSpeakingRecognizedText('Mendengarkan... Silakan ucapkan pelafalannya.');
      resetSilenceTimeout();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      recognitionRef.current = null;
      clearTimeout(silenceTimeout);

      const errorMessages: Record<string, string> = {
        'no-speech': 'Suara tidak terdengar. Silakan ketuk mic dan ucapkan lafalnya.',
        'audio-capture': 'Perangkat mikrofon tidak ditemukan. Sambungkan mic Anda.',
        'not-allowed': 'Akses mikrofon ditolak. Izinkan mikrofon di pengaturan browser Anda.',
        network: 'Membutuhkan koneksi internet untuk memproses suara.',
        aborted: '',
      };
      const msg = errorMessages[event.error];
      if (msg) setSpeakingRecognizedText(msg);
    };

    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(silenceTimeout);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isAnsweredRef.current) return;
      resetSilenceTimeout();

      const { transcript, isCorrect } = evaluateSpeechResults(
        event,
        currentQ.originalItem.kana,
        currentQ.correctAnswer
      );

      if (transcript) {
        const cleanText = deduplicateCharsAndWords(transcript);
        latestTranscript = cleanText;
        setSpeakingRecognizedText(`"${cleanText}"`);
      }

      if (isCorrect) {
        clearTimeout(silenceTimeout);
        stopSpeechRecognition();
        handleAnswerSubmit(currentQ.correctAnswer);
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      setSpeakingRecognizedText('Gagal memulai mikrofon. Coba lagi.');
    }
  };

  useEffect(() => {
    return () => stopSpeechRecognition();
  }, []);

  // Logika interaksi Matching Game kuis
  const handleMatchingClick = (type: 'kana' | 'romaji', value: string) => {
    if (isAnswered) return;
    
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ.matchingPairs) return;

    if (type === 'kana') {
      if (selectedKana === value) {
        setSelectedKana(null);
      } else {
        const isAlreadyMatched = currentQ.matchingPairs.some(p => p.kana === value && matchedPairs.includes(p.romaji));
        if (isAlreadyMatched) return;

        if (selectedRomaji) {
          // Check pair
          const correctPair = currentQ.matchingPairs.find(p => p.kana === value && p.romaji === selectedRomaji);
          if (correctPair) {
            playTeneng();
            const newMatched = [...matchedPairs, selectedRomaji];
            setMatchedPairs(newMatched);
            setSelectedKana(null);
            setSelectedRomaji(null);
            if (newMatched.length === 4) {
              handleAnswerSubmit(currentQ.correctAnswer);
            }
          } else {
            playTetot();
            setSelectedKana(null);
            setSelectedRomaji(null);
          }
        } else {
          setSelectedKana(value);
        }
      }
    } else {
      if (selectedRomaji === value) {
        setSelectedRomaji(null);
      } else {
        if (matchedPairs.includes(value)) return;

        if (selectedKana) {
          // Check pair
          const correctPair = currentQ.matchingPairs.find(p => p.kana === selectedKana && p.romaji === value);
          if (correctPair) {
            playTeneng();
            const newMatched = [...matchedPairs, value];
            setMatchedPairs(newMatched);
            setSelectedKana(null);
            setSelectedRomaji(null);
            if (newMatched.length === 4) {
              handleAnswerSubmit(currentQ.correctAnswer);
            }
          } else {
            playTetot();
            setSelectedKana(null);
            setSelectedRomaji(null);
          }
        } else {
          setSelectedRomaji(value);
        }
      }
    }
  };

  // Logika kirim jawaban mengetik kuis
  const handleTypingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered) return;
    
    const currentQ = quizQuestions[currentQuestionIndex];
    const cleanedInput = typingInput.toLowerCase().trim();
    const cleanedCorrect = currentQ.correctAnswer.toLowerCase().trim();
    
    const isCorrect = cleanedInput === cleanedCorrect;
    if (isCorrect) {
      playTeneng();
      handleAnswerSubmit(currentQ.correctAnswer);
    } else {
      playTetot();
      handleAnswerSubmit(typingInput || 'Tidak diisi');
    }
  };

  // ==========================================
  // LOGIKA KUIS
  // ==========================================
  // ==========================================
  // LOGIKA KUIS
  // ==========================================
  const startQuiz = () => {
    if (activeDataset.length === 0) return;

    // Mengacak dataset terpilih
    const shuffled = [...activeDataset].sort(() => Math.random() - 0.5);
    
    // Batasi jumlah pertanyaan sesuai pilihan pengguna
    const actualLength = Math.min(quizLength, shuffled.length);
    const selectedQuestions = shuffled.slice(0, actualLength);

    const isSpeechSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

    const questions: QuizQuestion[] = selectedQuestions.map((item) => {
      // Dapatkan tipe-tipe soal yang dipilih oleh pengguna
      const chosenTypes = selectedQuizTypes.includes('Semua')
        ? ['multiple-choice', 'typing', 'writing', 'matching', 'speaking']
        : selectedQuizTypes;

      // Filter tipe soal agar hanya menggunakan tipe yang didukung perangkat
      let possibleTypes = chosenTypes.filter((t) => {
        if (t === 'speaking') return isSpeechSupported;
        return ['multiple-choice', 'typing', 'writing', 'matching'].includes(t);
      }) as QuizQuestion['type'][];

      // Fallback jika tidak ada tipe soal yang cocok
      if (possibleTypes.length === 0) {
        possibleTypes = ['multiple-choice'];
      }

      const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
      
      let isQuestionKana = Math.random() > 0.5;
      let correctAnswer = '';
      let questionText = '';
      let options: string[] = [];
      let matchingPairs: MatchingPair[] = [];

      if (type === 'writing') {
        isQuestionKana = false;
        questionText = item.romaji;
        correctAnswer = item.kana;
        options = [];
      } else if (type === 'typing') {
        isQuestionKana = true;
        questionText = item.kana;
        correctAnswer = item.romaji;
        options = [];
      } else if (type === 'speaking') {
        isQuestionKana = true;
        questionText = item.kana;
        correctAnswer = item.romaji;
        options = [];
      } else if (type === 'matching') {
        isQuestionKana = true;
        questionText = "Hubungkan 4 Pasang Aksara!";
        correctAnswer = item.romaji;
        options = [];
        
        const fullSet = characterType === 'hiragana' ? HIRAGANA_DATA : KATAKANA_DATA;
        const pool = activeDataset.length >= 4 ? activeDataset : fullSet;
        const otherItems = pool.filter(x => x.kana !== item.kana).sort(() => Math.random() - 0.5).slice(0, 3);
        matchingPairs = [item, ...otherItems].map(x => ({ kana: x.kana, romaji: x.romaji })).sort(() => Math.random() - 0.5);
      } else {
        // multiple-choice
        correctAnswer = isQuestionKana ? item.romaji : item.kana;
        questionText = isQuestionKana ? item.kana : item.romaji;
        const fullSet = characterType === 'hiragana' ? HIRAGANA_DATA : KATAKANA_DATA;
        const wrongAnswersPool = fullSet
          .map(x => isQuestionKana ? x.romaji : x.kana)
          .filter(x => x !== correctAnswer);
        const wrongAnswers = wrongAnswersPool.sort(() => Math.random() - 0.5).slice(0, 3);
        options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      }

      return {
        originalItem: item,
        type,
        questionText,
        isQuestionKana,
        correctAnswer,
        options,
        matchingPairs
      };
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
    setQuizHistory([]);
    setShareImage(null);
  };

  // Efek merestart kuis jika filter baris berubah setelah dropdown ditutup
  const prevDropdownOpenRef = useRef(isDropdownOpen);
  useEffect(() => {
    if (prevDropdownOpenRef.current && !isDropdownOpen) {
      if (appMode === 'quiz') {
        startQuiz();
      }
    }
    prevDropdownOpenRef.current = isDropdownOpen;
  }, [isDropdownOpen, appMode]);

  // Inisialisasi state soal kuis baru
  useEffect(() => {
    if (appMode === 'quiz' && quizQuestions.length > 0 && quizQuestions[currentQuestionIndex]) {
      const currentQ = quizQuestions[currentQuestionIndex];
      setTypingInput('');
      setSpeakingRecognizedText('');
      stopSpeechRecognition();
      setSelectedAnswer(null);
      setIsAnswered(false);
      setCheckingStatus('idle');
      setValidationMessage(null);
      
      if (currentQ.type === 'matching' && currentQ.matchingPairs) {
        setSelectedKana(null);
        setSelectedRomaji(null);
        setMatchedPairs([]);
        setMatchingShuffledKana([...currentQ.matchingPairs].map(p => p.kana).sort(() => Math.random() - 0.5));
        setMatchingShuffledRomaji([...currentQ.matchingPairs].map(p => p.romaji).sort(() => Math.random() - 0.5));
      }
      
      setTimeout(() => {
        quizClearCanvas();
      }, 50);
    }
  }, [currentQuestionIndex, quizQuestions, appMode]);

  const handleAnswerSubmit = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    const currentQ = quizQuestions[currentQuestionIndex];
    const isCorrect = option === currentQ.correctAnswer;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setQuizHistory(prev => [...prev, {
      question: currentQ.questionText,
      userAnswer: option,
      correctAnswer: currentQ.correctAnswer,
      isCorrect,
      romaji: currentQ.originalItem.romaji,
      kana: currentQ.originalItem.kana
    }]);

    playAudio(currentQ.originalItem.kana);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  // Enter untuk lanjut ke soal berikutnya setelah menjawab
  useEffect(() => {
    if (appMode !== 'quiz' || quizFinished || !isAnswered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      e.preventDefault();
      handleNextQuestion();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, quizFinished, isAnswered, currentQuestionIndex, quizQuestions.length]);

  // ==========================================
  // GENERATE SHARE CARD (STATUS CANVAS)
  // ==========================================
  const generateStatusCard = () => {
    const canvas = statusCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Desain Dimensi Status Portrait 3:4 (Sempurna untuk Instagram/WhatsApp Status)
    const width = 1080;
    const height = 1440;
    canvas.width = width;
    canvas.height = height;

    // 1. Latar Belakang Putih Keabu-abuan Halus
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, width, height);

    // Garis kisi latar belakang ala kertas gambar tradisional Jepang
    ctx.strokeStyle = '#f1f5f9'; // slate-100
    ctx.lineWidth = 2;
    const gridSize = 60;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Lingkaran Besar Pucat (Aksen Bendera Jepang Hinomaru)
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 50, 260, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.04)'; // Sangat samar merah
    ctx.fill();

    // 3. Garis Bingkai Ganda Minimalis Elegan
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    ctx.strokeStyle = '#4f46e5'; // Aksen garis indigo dalam
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, width - 104, height - 104);

    // 4. Header Sertifikat
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Label Inggris
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('LEARNTOJAPANESE CERTIFICATE', width / 2, 130);

    // Judul Utama Kaligrafi Jepang
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.font = '900 68px sans-serif';
    ctx.fillText('日本語の修了証', width / 2, 190); 
    ctx.font = '400 24px sans-serif';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.fillText('(Sertifikat Kelulusan LearnToJapanese)', width / 2, 280);

    // Garis pemisah tradisional
    ctx.beginPath();
    ctx.moveTo(width / 2 - 180, 330);
    ctx.lineTo(width / 2 + 180, 330);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 5. Isi Teks Utama
    ctx.fillStyle = '#334155'; // slate-700
    ctx.font = 'normal 32px sans-serif';
    ctx.fillText('Sertifikat ini diberikan dengan bangga kepada:', width / 2, 400);

    // Nama Penerima
    const displayName = userName.trim() || 'Sang Pembelajar';
    ctx.fillStyle = '#1e1b4b'; // indigo-950
    
    // Tentukan ukuran font secara dinamis agar tidak overflow
    let nameFontSize = 56;
    ctx.font = `bold ${nameFontSize}px sans-serif`;
    let nameWidth = ctx.measureText(displayName).width;
    
    // Batas lebar nama adalah 760px (agar tidak menembus bingkai)
    while (nameWidth > 760 && nameFontSize > 20) {
      nameFontSize -= 2;
      ctx.font = `bold ${nameFontSize}px sans-serif`;
      nameWidth = ctx.measureText(displayName).width;
    }
    
    ctx.fillText(displayName, width / 2, 470);

    // Garis hiasan bawah nama
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 250, 560);
    ctx.lineTo(width / 2 + 250, 560);
    ctx.stroke();

    ctx.fillStyle = '#475569'; // slate-600
    ctx.font = 'normal 28px sans-serif';
    ctx.fillText('Telah sukses menyelesaikan evaluasi kecerdasan aksara', width / 2, 610);
    ctx.fillText(`Kategori: ${characterType === 'hiragana' ? 'Hiragana Dasar' : 'Katakana Dasar'} (Baris: ${selectedRows.join(', ')})`, width / 2, 660);

    // 6. Kotak Tampilan Statistik Akurasi Kuis
    const cardY = 760;
    const cardWidth = 600;
    const cardHeight = 160;
    const cardX = (width - cardWidth) / 2;

    // Gambar Kotak Putih dengan Shadow Elegan
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 15;
    
    // Custom Round Rect drawing
    ctx.beginPath();
    ctx.moveTo(cardX + 25, cardY);
    ctx.lineTo(cardX + cardWidth - 25, cardY);
    ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + 25);
    ctx.lineTo(cardX + cardWidth, cardY + cardHeight - 25);
    ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - 25, cardY + cardHeight);
    ctx.lineTo(cardX + 25, cardY + cardHeight);
    ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - 25);
    ctx.lineTo(cardX, cardY + 25);
    ctx.quadraticCurveTo(cardX, cardY, cardX + 25, cardY);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Reset bayangan agar tidak merusak elemen lain

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sektor Skor Benar
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SOAL BENAR', cardX + 100, cardY + 30);
    
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(`${score} / ${quizQuestions.length}`, cardX + 100, cardY + 75);

    // Pembatas Vertikal 1
    ctx.beginPath();
    ctx.moveTo(cardX + 200, cardY + 25);
    ctx.lineTo(cardX + 200, cardY + cardHeight - 25);
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Sektor Durasi Kuis
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('DURASI', cardX + 300, cardY + 30);
    
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(formatTime(quizTime), cardX + 300, cardY + 75);

    // Pembatas Vertikal 2
    ctx.beginPath();
    ctx.moveTo(cardX + 400, cardY + 25);
    ctx.lineTo(cardX + 400, cardY + cardHeight - 25);
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Sektor Akurasi Persen
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('AKURASI AKHIR', cardX + 500, cardY + 30);

    const accuracy = Math.round((score / quizQuestions.length) * 100);
    ctx.fillStyle = '#10b981'; // Emerald-500 untuk kelulusan sukses
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(`${accuracy}%`, cardX + 500, cardY + 75);

    // 7. Stempel Merah Tradisional Jepang (Hanko Stamp)
    const stampX = width - 280;
    const stampY = height - 280;
    const stampSize = 120;

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 8;
    ctx.strokeRect(stampX, stampY, stampSize, stampSize);

    // Isi Teks dalam Stempel Hanko
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('日本語', stampX + stampSize/2, stampY + stampSize/3);
    ctx.fillText('合格印', stampX + stampSize/2, stampY + (stampSize/3)*2);

    // 8. Keterangan Tanggal Cetak
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = 'normal 24px sans-serif';
    ctx.fillText(`Tanggal: ${formattedDate}`, 100, height - 220);
    ctx.fillText('Platform Pembelajaran: LearnToJapanese Pro', 100, height - 170);

    // Konversikan rendering canvas ke URL base64 gambar
    const dataUrl = canvas.toDataURL('image/png');
    setShareImage(dataUrl);
    setShowShareModal(true);
  };

  const downloadImage = () => {
    if (!shareImage) return;
    const link = document.createElement('a');
    link.download = `Sertifikat_Kana_${userName || 'Master'}.png`;
    link.href = shareImage;
    link.click();
  };

  // Pengendali Navigasi Flashcard Belajar
  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCardIndex((prev) => (prev - 1 + activeDataset.length) % activeDataset.length);
    }, 150);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCardIndex((prev) => (prev + 1) % activeDataset.length);
    }, 150);
  };

  const handleGridItemClick = (kana: string) => {
    const rawData = characterType === 'hiragana' ? HIRAGANA_DATA : KATAKANA_DATA;
    const rawIndex = rawData.findIndex(item => item.kana === kana);
    if (rawIndex === -1) return;

    const activeIndex = activeDataset.findIndex(item => item.kana === kana);
    if (activeIndex !== -1) {
      setCardIndex(activeIndex);
      setIsFlipped(false);
    } else {
      skipResetRef.current = true;
      setSelectedRows(['Semua']);
      setCardIndex(rawIndex);
      setIsFlipped(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Kustomisasi CSS Animasi Efek Flip, 3D & Shake */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out 0s 2; }
      `}</style>

      {/* HEADER NAVBAR */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Favicon emoji sebagai logo */}
            <div className="p-2.5 text-indigo-600 rounded-xl flex items-center justify-center w-10 h-10">
              <span className="text-xl leading-none select-none">🎌</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">LearnToJapanese</h1>
              <p className="text-xs text-slate-500">Learn Japanese Mother Father</p>
            </div>
          </div>

          {/* Pengalih Mode Utama */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (appMode === 'quiz') {
                  startQuiz();
                } else {
                  setAppMode('study');
                }
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                appMode === 'study'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {/* Ikon: refresh saat quiz, pensil saat belajar */}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {appMode === 'quiz' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                )}
              </svg>
              {appMode === 'quiz' ? 'Mulai Ulang Kuis' : 'Belajar Menulis'}
            </button>
            <button
              onClick={() => {
                if (appMode === 'quiz') {
                  setAppMode('study');
                } else {
                  setAppMode('quiz');
                  startQuiz();
                }
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                appMode === 'quiz'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {appMode === 'quiz' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {appMode === 'quiz' ? 'Batal Kuis' : 'Mulai Kuis'}
            </button>
          </div>
        </div>
      </header>

      {/* PANEL UTAMA */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ================= PANEL FILTER & SETTING ================= */}
        {/* Sembunyikan saat kuis aktif berlangsung */}
        {!(appMode === 'quiz' && !quizFinished) && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Sektor Jenis Aksara */}
              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aksara Utama</label>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setCharacterType('hiragana')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      characterType === 'hiragana' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    ひらがな Hiragana
                  </button>
                  <button
                    onClick={() => setCharacterType('katakana')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      characterType === 'katakana' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    カタカナ Katakana
                  </button>
                </div>
              </div>

              {/* Sektor Filter Baris Karakter */}
              <div className="md:col-span-3 flex flex-col gap-1.5 relative" ref={dropdownRef}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batasan Baris Huruf</label>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left flex items-center justify-between shadow-sm hover:bg-slate-100/50 transition-colors"
                >
                  <span className="truncate">
                    {selectedRows.includes('Semua')
                      ? 'Gunakan Semua Baris'
                      : `Hanya Baris: ${selectedRows.join(', ')}`}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto p-1.5 flex flex-col gap-0.5 animate-fadeIn">
                    {AVAILABLE_ROWS.map((row) => {
                      const isChecked = selectedRows.includes(row);
                      return (
                        <button
                          key={row}
                          type="button"
                          onClick={() => {
                            if (row === 'Semua') {
                              setSelectedRows(['Semua']);
                            } else {
                              let newRows = [...selectedRows];
                              if (newRows.includes('Semua')) {
                                newRows = newRows.filter(r => r !== 'Semua');
                              }
                              
                              if (isChecked) {
                                newRows = newRows.filter(r => r !== row);
                                if (newRows.length === 0) {
                                  newRows = ['Semua'];
                                }
                              } else {
                                newRows.push(row);
                              }
                              setSelectedRows(newRows);
                            }
                          }}
                          className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                            isChecked
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{row === 'Semua' ? 'Gunakan Semua Baris' : `Hanya Baris: ${row}`}</span>
                          {isChecked && (
                            <svg className="w-4 h-4 text-indigo-650 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sektor Tipe Soal Kuis */}
              <div className="md:col-span-3 flex flex-col gap-1.5 relative" ref={typeDropdownRef}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipe Soal Kuis</label>
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left flex items-center justify-between shadow-sm hover:bg-slate-100/50 transition-colors"
                >
                  <span className="truncate">
                    {selectedQuizTypes.includes('Semua')
                      ? 'Semua Tipe Soal'
                      : selectedQuizTypes.map(t => {
                          const option = QUIZ_TYPE_OPTIONS.find(o => o.id === t);
                          return option ? option.label : t;
                        }).join(', ')}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isTypeDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto p-1.5 flex flex-col gap-0.5 animate-fadeIn">
                    {QUIZ_TYPE_OPTIONS.map((opt) => {
                      const isChecked = selectedQuizTypes.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            if (opt.id === 'Semua') {
                              setSelectedQuizTypes(['Semua']);
                            } else {
                              let newTypes = [...selectedQuizTypes];
                              if (newTypes.includes('Semua')) {
                                newTypes = newTypes.filter(t => t !== 'Semua');
                              }
                              
                              if (isChecked) {
                                newTypes = newTypes.filter(t => t !== opt.id);
                                if (newTypes.length === 0) {
                                  newTypes = ['Semua'];
                                }
                              } else {
                                newTypes.push(opt.id);
                              }
                              setSelectedQuizTypes(newTypes);
                            }
                          }}
                          className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                            isChecked
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isChecked && (
                            <svg className="w-4 h-4 text-indigo-650 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sektor Jumlah Soal Kuis */}
              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah Soal Kuis</label>
                <div className="flex gap-1.5">
                  {[5, 10, 20, 30].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setQuizLength(num);
                        if (appMode === 'quiz') {
                          setTimeout(() => startQuiz(), 50);
                        }
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        quizLength === num
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </section>
        )}

        {/* ========================================================= */}
        {/* MODE BELAJAR (FLASHCARD & CANVAS DRAWING)                  */}
        {/* ========================================================= */}
        {appMode === 'study' && activeDataset.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sektor Kiri: Flashcard Visual */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Karakter {cardIndex + 1} dari {activeDataset.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSelectorModal(true)}
                    className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-all flex items-center gap-1 shadow-sm"
                    title="Pilih Huruf Langsung"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h12" />
                    </svg>
                  </button>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase">
                    Baris {activeDataset[cardIndex].row}
                  </span>
                </div>
              </div>

              {/* Flip Card Sisi Bolak-balik */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full h-80 perspective-1000 cursor-pointer"
              >
                <div className={`w-full h-full duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                  
                  {/* Sisi Depan: Huruf Kana Jepang */}
                  <div className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-sm backface-hidden">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Aksara Jepang</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(activeDataset[cardIndex].kana);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors border border-slate-100"
                        title="Dengarkan Suara Pelafalan"
                      >
                        {/* Vektor SVG Ikon Speaker */}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-center select-none">
                      <h3 className="text-8xl font-black text-slate-800">{activeDataset[cardIndex].kana}</h3>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-slate-400">Ketuk kartu untuk melihat Romaji pelafalan</p>
                    </div>
                  </div>

                  {/* Sisi Belakang: Cara Baca Romaji */}
                  <div className="absolute inset-0 w-full h-full bg-indigo-50/10 border-2 border-indigo-600/30 rounded-3xl p-6 flex flex-col justify-between shadow-sm backface-hidden rotate-y-180">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-extrabold text-indigo-500 uppercase tracking-widest">Romaji Lafal</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(activeDataset[cardIndex].kana);
                        }}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl transition-colors shadow-sm"
                        title="Dengarkan Suara Pelafalan"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-center">
                      <h4 className="text-6xl font-black text-indigo-600 tracking-tight">{activeDataset[cardIndex].romaji}</h4>
                      <p className="text-2xl font-bold text-slate-500 mt-2">{activeDataset[cardIndex].kana}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-slate-400">Ketuk kembali untuk menyembunyikan romaji</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Tombol Kemudi Belajar */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrevCard}
                  className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Sebelumnya
                </button>
                <button
                  onClick={handleNextCard}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  Selanjutnya
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

            </div>

            {/* Sektor Kanan: Tracing Canvas (Menggambar Huruf) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Urutan Coretan & Menggambar Bebas
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tulis langsung pada kanvas dengan meniru alur huruf</p>
                  </div>
                </div>

                {/* AREA CANVAS UTAMA */}
                <div className={`relative w-full aspect-square max-w-[340px] mx-auto bg-slate-50 border rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300 ${
                  checkingStatus === 'success' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                    : checkingStatus === 'fail' 
                    ? 'border-rose-500 ring-2 ring-rose-500/20 animate-shake' 
                    : 'border-slate-200'
                }`}>
                  
                  {/* Bayangan Guide Karakter untuk Tracing (Visual Stroke Guide) */}
                  {showGuide && (
                    <div 
                      key={activeDataset[cardIndex].kana}
                      className="absolute inset-0 flex items-center justify-center select-none pointer-events-none p-4"
                    >
                      {svgContent ? (
                        <div 
                          className="w-full h-full object-contain opacity-35" 
                          dangerouslySetInnerHTML={{ __html: svgContent }} 
                        />
                      ) : (
                        <span className="text-[14rem] font-bold font-sans text-slate-900 leading-none select-none">
                          {activeDataset[cardIndex].kana}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Garis Sumbu Pembantu */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2">
                    <div className="border-r border-dashed border-slate-300"></div>
                    <div></div>
                    <div className="border-t border-dashed border-slate-300 border-r"></div>
                    <div className="border-t border-dashed border-slate-300"></div>
                  </div>

                  {/* Kanvas Interaktif */}
                  <canvas
                    ref={canvasRef}
                    width={340}
                    height={340}
                    className="absolute inset-0 z-10 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />

                  {/* Palet Warna Spidol */}
                  <div className="absolute bottom-3 left-3 z-20 flex gap-1.5 bg-white/90 backdrop-blur px-2 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                    {['#4f46e5', '#ef4444', '#10b981', '#0f172a'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setBrushColor(color)}
                        className={`w-4 h-4 rounded-full border transition-all ${
                          brushColor === color ? 'scale-125 border-slate-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title="Pilih Warna Kuas"
                      />
                    ))}
                  </div>

                </div>

                {validationMessage && (
                  <div className={`text-center text-xs font-bold py-1.5 px-3 rounded-lg max-w-[340px] mx-auto transition-all ${
                    checkingStatus === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {validationMessage}
                  </div>
                )}

                {/* TOMBOL KONTROL CANVAS */}
                <div className="max-w-[340px] mx-auto w-full grid grid-cols-3 gap-2 mt-1">
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all text-center flex items-center justify-center ${
                      showGuide 
                        ? 'bg-slate-100 border-slate-300 text-slate-700' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {showGuide ? 'Sembunyikan' : 'Bayangan'}
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="py-2 px-1 text-[11px] font-bold bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-xl transition-all text-center flex items-center justify-center"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={verifyDrawing}
                    className="py-2 px-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                    </svg>
                    Periksa
                  </button>
                </div>

              </div>
            </div>

            {/* ========================================================= */}
            {/* TABEL KAMUS & GRID AKSARA INTERAKTIF                       */}
            {/* ========================================================= */}
            <div className="lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Kamus & Grid Aksara Jepang ({characterType === 'hiragana' ? 'Hiragana' : 'Katakana'})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Ketuk huruf di bawah untuk langsung melatihnya di kanvas tracing. Huruf abu-abu berarti sedang ter-filter.
                  </p>
                </div>
              </div>

              {(() => {
                const rawData = characterType === 'hiragana' ? HIRAGANA_DATA : KATAKANA_DATA;
                return (
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2">
                    {rawData.map((item) => {
                      const isActiveInFilter = activeDataset.some((activeItem) => activeItem.kana === item.kana);
                      const isCurrentCard = activeDataset[cardIndex]?.kana === item.kana;

                      return (
                        <button
                          key={item.kana}
                          onClick={() => handleGridItemClick(item.kana)}
                          className={`flex flex-col items-center justify-center py-1.5 sm:py-2 px-1 rounded-xl border transition-all ${
                            isCurrentCard
                              ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/10 scale-105'
                              : isActiveInFilter
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/20 shadow-sm'
                              : 'bg-slate-50 border-slate-150 text-slate-400 opacity-60 hover:bg-slate-100/85 hover:border-slate-200'
                          }`}
                        >
                          <span className="text-base sm:text-lg font-bold">{item.kana}</span>
                          <span className={`text-[9px] font-bold uppercase ${isCurrentCard ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {item.romaji}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* NOTIFIKASI JIKA HASIL FILTER KOSONG */}
        {activeDataset.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-bold text-slate-800">Tidak Ada Karakter</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">Ganti pengaturan baris atau beralih tipe aksara di panel atas untuk memuat huruf kembali.</p>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE KUIS (EVALUASI KEMAMPUAN MEMBACA)                    */}
        {/* ========================================================= */}
        {appMode === 'quiz' && !quizFinished && quizQuestions.length > 0 && (
          <div className="w-full max-w-xl mx-auto flex flex-col flex-1 gap-6">
            
            {/* Progress Sesi Kuis */}
            <div className="flex flex-col gap-2 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider items-center">
                <span>Pertanyaan {currentQuestionIndex + 1} dari {quizQuestions.length}</span>
                <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-150 normal-case font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(quizTime)}
                </span>
                <span>Benar: {score}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Kotak Pertanyaan Kuis */}
            <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center min-h-[16rem] text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-4 left-4">
                <span className="text-xs uppercase tracking-widest font-extrabold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  {quizQuestions[currentQuestionIndex].type === 'multiple-choice'
                    ? (quizQuestions[currentQuestionIndex].isQuestionKana ? "Tebak Romaji" : "Tebak Huruf")
                    : quizQuestions[currentQuestionIndex].type === 'typing'
                    ? "Mengetik Romaji"
                    : quizQuestions[currentQuestionIndex].type === 'speaking'
                    ? "Pengucapan Suara"
                    : quizQuestions[currentQuestionIndex].type === 'matching'
                    ? "Cocokkan Kartu"
                    : "Menggambar Aksara"}
                </span>
              </div>

              <span className="text-8xl font-black text-slate-800 my-4 select-none animate-fadeIn">
                {quizQuestions[currentQuestionIndex].questionText}
              </span>
              <p className="text-xs text-slate-400 max-w-xs mt-2">
                {quizQuestions[currentQuestionIndex].type === 'multiple-choice'
                  ? "Pilih satu jawaban yang menurut Anda paling tepat."
                  : quizQuestions[currentQuestionIndex].type === 'typing'
                  ? "Ketik romaji pelafalan untuk huruf di atas."
                  : quizQuestions[currentQuestionIndex].type === 'speaking'
                  ? "Klik mikrofon di bawah lalu lafalkan huruf di atas."
                  : quizQuestions[currentQuestionIndex].type === 'matching'
                  ? "Hubungkan 4 pasang aksara Jepang dan romajinya."
                  : "Gunakan kuas untuk menulis aksara Jepang pada kanvas di bawah."}
              </p>
            </div>

            {/* AREA JAWABAN KUIS SESUAI TIPE */}
            {!isAnswered && quizQuestions[currentQuestionIndex].type === 'matching' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <p className="text-xs text-center text-slate-400 font-medium">Pilih satu aksara Jepang di kiri, lalu pasangannya di kanan.</p>
                <div className="grid grid-cols-2 gap-6">
                  {/* Kolom Kiri: Kana */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase text-center">Aksara Jepang</span>
                    {matchingShuffledKana.map((kanaVal) => {
                      const isMatched = quizQuestions[currentQuestionIndex].matchingPairs?.some(
                        p => p.kana === kanaVal && matchedPairs.includes(p.romaji)
                      );
                      const isSelected = selectedKana === kanaVal;
                      return (
                        <button
                          key={kanaVal}
                          disabled={isMatched}
                          onClick={() => handleMatchingClick('kana', kanaVal)}
                          className={`py-3.5 px-4 rounded-xl border text-center font-bold text-lg transition-all ${
                            isMatched
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700 opacity-60 cursor-not-allowed font-extrabold'
                              : isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {kanaVal}
                        </button>
                      );
                    })}
                  </div>

                  {/* Kolom Kanan: Romaji */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase text-center">Romaji Lafal</span>
                    {matchingShuffledRomaji.map((romajiVal) => {
                      const isMatched = matchedPairs.includes(romajiVal);
                      const isSelected = selectedRomaji === romajiVal;
                      return (
                        <button
                          key={romajiVal}
                          disabled={isMatched}
                          onClick={() => handleMatchingClick('romaji', romajiVal)}
                          className={`py-3.5 px-4 rounded-xl border text-center font-bold text-lg transition-all ${
                            isMatched
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700 opacity-60 cursor-not-allowed font-extrabold'
                              : isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {romajiVal}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {!isAnswered && quizQuestions[currentQuestionIndex].type === 'typing' && (
              <form onSubmit={(e) => handleTypingSubmit(e)} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Masukkan Lafal Romaji</label>
                  <input
                    type="text"
                    value={typingInput}
                    onChange={(e) => setTypingInput(e.target.value)}
                    placeholder="Contoh: ka, sa, ta..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold text-center"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playTetot();
                      handleAnswerSubmit('Tidak dijawab');
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                  >
                    Lewati Soal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10"
                  >
                    Kirim Jawaban
                  </button>
                </div>
              </form>
            )}

            {!isAnswered && quizQuestions[currentQuestionIndex].type === 'speaking' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center gap-6">
                <p className="text-xs text-center text-slate-400 font-medium max-w-xs">
                  Ketuk mikrofon lalu ucapkan pelafalan huruf di atas. Bisa dalam bahasa Jepang atau romaji — coba lagi jika belum tepat.
                </p>

                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  disabled={isListening}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/20'
                      : 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 hover:scale-105 active:scale-95'
                  }`}
                  title="Mulai Rekam Suara"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                {speakingRecognizedText && (
                  <div className="text-center max-w-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Hasil Rekaman Suara</span>
                    <p className="text-sm font-bold text-slate-700">{speakingRecognizedText}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { stopSpeechRecognition(); playTetot(); handleAnswerSubmit('Tidak dijawab'); }}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-all"
                >
                  Lewati Soal
                </button>
              </div>
            )}

            {!isAnswered && quizQuestions[currentQuestionIndex].type === 'writing' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className={`relative w-full aspect-square max-w-[280px] mx-auto bg-slate-50 border rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300 ${
                  checkingStatus === 'success' 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                    : checkingStatus === 'fail' 
                    ? 'border-rose-500 ring-2 ring-rose-500/20 animate-shake' 
                    : 'border-slate-200'
                }`}>
                  
                  {/* Garis Sumbu Pembantu */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2">
                    <div className="border-r border-dashed border-slate-300"></div>
                    <div></div>
                    <div className="border-t border-dashed border-slate-300 border-r"></div>
                    <div className="border-t border-dashed border-slate-300"></div>
                  </div>

                  {/* Kanvas Kuis */}
                  <canvas
                    ref={quizCanvasRef}
                    width={280}
                    height={280}
                    className="absolute inset-0 z-10 cursor-crosshair touch-none"
                    onMouseDown={quizStartDrawing}
                    onMouseMove={quizDraw}
                    onMouseUp={quizStopDrawing}
                    onMouseLeave={quizStopDrawing}
                    onTouchStart={quizStartDrawing}
                    onTouchMove={quizDraw}
                    onTouchEnd={quizStopDrawing}
                  />
                </div>

                {validationMessage && (
                  <div className={`text-center text-xs font-bold py-1.5 px-3 rounded-lg max-w-[280px] mx-auto transition-all ${
                    checkingStatus === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {validationMessage}
                  </div>
                )}

                <div className="max-w-[280px] mx-auto w-full grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playTetot();
                      handleAnswerSubmit('Tidak dijawab');
                    }}
                    className="py-2 px-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-750 rounded-xl transition-all text-center flex items-center justify-center"
                  >
                    Lewati
                  </button>
                  <button
                    type="button"
                    onClick={quizClearCanvas}
                    className="py-2 px-1 text-[11px] font-bold bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-xl transition-all text-center flex items-center justify-center"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={verifyQuizDrawing}
                    className="py-2 px-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                  >
                    Periksa
                  </button>
                </div>
              </div>
            )}

            {!isAnswered && quizQuestions[currentQuestionIndex].type === 'multiple-choice' && (
              <div className="grid grid-cols-2 gap-4">
                {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSubmit(option)}
                      className="p-5 rounded-2xl border bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 text-center font-bold text-lg md:text-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tampilan Riwayat Jawaban Sementara setelah Soal Terjawab */}
            {isAnswered && (
              <div className={`p-5 rounded-3xl border text-center flex flex-col items-center justify-center gap-2 shadow-sm ${
                selectedAnswer === quizQuestions[currentQuestionIndex].correctAnswer
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-2 font-black text-lg">
                  {selectedAnswer === quizQuestions[currentQuestionIndex].correctAnswer ? (
                    <>
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Luar Biasa, Benar!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Kurang Tepat!
                    </>
                  )}
                </div>
                <p className="text-xs">
                  Jawaban Anda: <span className="font-bold">"{selectedAnswer}"</span> | Jawaban Benar: <span className="font-bold">"{quizQuestions[currentQuestionIndex].correctAnswer}"</span>
                </p>
              </div>
            )}

            {/* Aksi Lanjutan Setelah Menjawab */}
            {isAnswered && (
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-600 text-xl">
                      {quizQuestions[currentQuestionIndex].originalItem.kana}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Pelafalan Benar</p>
                      <p className="text-sm font-bold text-slate-800">
                        {quizQuestions[currentQuestionIndex].originalItem.romaji.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => playAudio(quizQuestions[currentQuestionIndex].originalItem.kana)}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all border border-slate-100"
                    title="Mainkan Suara Pengucapan"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                >
                  {currentQuestionIndex + 1 === quizQuestions.length ? 'Lihat Hasil Akhir' : 'Lanjut ke Pertanyaan Berikutnya'}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <p className="text-[10px] text-center text-slate-400 font-medium">
                  Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-bold">Enter</kbd> untuk lanjut
                </p>
              </div>
            )}

            {/* Panel Kompanion Kuis — menempel ke bawah, tanpa spoiler jawaban */}
            {(() => {
              const currentQ = quizQuestions[currentQuestionIndex];
              const answeredCount = currentQuestionIndex + (isAnswered ? 1 : 0);
              const accuracy = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;
              const remaining = quizQuestions.length - currentQuestionIndex - (isAnswered ? 0 : 1);
              const quizTips: Record<QuizQuestion['type'], string> = {
                'multiple-choice': 'Dengarkan bunyi vokal dan konsonan dengan teliti sebelum memilih. Perhatikan perbedaan huruf yang bentuknya mirip.',
                'typing': 'Ketik romaji standar tanpa spasi, huruf kecil. Contoh: shi (bukan si), tsu (bukan tu), chi (bukan ti).',
                'speaking': 'Ucapkan pelafalan jelas dan dekat mikrofon. Pastikan browser sudah mengizinkan akses mikrofon.',
                'matching': 'Cocokkan berdasarkan bunyi romaji, bukan hanya kemiripan bentuk visual aksara.',
                'writing': 'Ikuti urutan goresan yang benar — validator mengecek pola stroke, bukan hanya bentuk akhir.',
              };
              const modeLabels: Record<QuizQuestion['type'], string> = {
                'multiple-choice': 'Pilihan Ganda',
                'typing': 'Mengetik Romaji',
                'speaking': 'Pengucapan Suara',
                'matching': 'Cocokkan Kartu',
                'writing': 'Menggambar Aksara',
              };
              return (
                <div className="mt-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tips & Referensi Kuis</span>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Info Sesi</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Mode <span className="font-bold text-slate-800">{modeLabels[currentQ.type]}</span>
                          {' · '}
                          {characterType === 'hiragana' ? 'Hiragana' : 'Katakana'}
                          {' · '}
                          {selectedRows.includes('Semua') ? 'Semua Baris' : `Baris ${selectedRows.join(', ')}`}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Sisa Soal</p>
                          <p className="text-lg font-black text-slate-700">{Math.max(remaining, 0)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-2 text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Waktu</p>
                          <p className="text-lg font-black text-slate-700">{formatTime(quizTime)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tips Mode Ini</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{quizTips[currentQ.type]}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl py-2 px-2 text-center">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase">Benar</p>
                          <p className="text-lg font-black text-emerald-700">{score}</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl py-2 px-2 text-center">
                          <p className="text-[10px] font-bold text-indigo-600 uppercase">Akurasi</p>
                          <p className="text-lg font-black text-indigo-700">{accuracy}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* ========================================================= */}
        {/* LAPORAN HASIL AKHIR KUIS & CETAK KARTU STATUS              */}
        {/* ========================================================= */}
        {appMode === 'quiz' && quizFinished && (
          <div className="w-full max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
            
            {/* Lencana Sukses */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900">Kuis Selesai!</h2>
              <p className="text-xs text-slate-500 mt-1">Anda telah merampungkan latihan pemahaman alfabet Jepang dengan baik.</p>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
              <div className="bg-slate-50 p-2 sm:p-4 rounded-2xl border border-slate-150 text-center">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Total Skor</span>
                <p className="text-base sm:text-2xl font-black text-indigo-600">{score} / {quizQuestions.length}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">Selesai dijawab</p>
              </div>
              <div className="bg-slate-50 p-2 sm:p-4 rounded-2xl border border-slate-150 text-center">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Durasi Kuis</span>
                <p className="text-base sm:text-2xl font-black text-indigo-600">{formatTime(quizTime)}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">Waktu tempuh</p>
              </div>
              <div className="bg-slate-50 p-2 sm:p-4 rounded-2xl border border-slate-150 text-center">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Akurasi Kelulusan</span>
                <p className="text-base sm:text-2xl font-black text-emerald-600">
                  {Math.round((score / quizQuestions.length) * 100)}%
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">Kecocokan jawaban</p>
              </div>
            </div>

            {/* Pembuat Sertifikat Status Card */}
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Cetak Sertifikat Keren!</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tulis nama Anda di bawah untuk mengompilasi lembar prestasi beresolusi tinggi ke status WhatsApp atau Instagram Anda.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ketik nama Anda di sini..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                <button
                  onClick={generateStatusCard}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 w-full sm:w-auto whitespace-nowrap active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Render Foto
                </button>
              </div>
            </div>

            {/* Riwayat Menjawab */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tinjauan Detil Jawaban:</h3>
              <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-2">
                {quizHistory.map((hist, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      hist.isCorrect 
                        ? 'bg-emerald-50/60 border-emerald-100 text-slate-700'
                        : 'bg-rose-50/60 border-rose-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">{hist.kana}</span>
                      <div>
                        <p className="font-semibold">Soal: {hist.question}</p>
                        <p className="text-[10px] text-slate-400">Jawab: {hist.userAnswer} (Asli: {hist.correctAnswer})</p>
                      </div>
                    </div>
                    {hist.isCorrect ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/60 border border-emerald-200 px-2 py-0.5 rounded-full">Benar</span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 border border-rose-200 px-2 py-0.5 rounded-full">Salah</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Kontrol Menu Utama Kuis */}
            <div className="flex gap-3">
              <button
                onClick={() => setAppMode('study')}
                className="flex-1 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                Kembali Belajar
              </button>
              <button
                onClick={startQuiz}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10"
              >
                Ulangi Kuis
              </button>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-4 py-6 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 LearnToJapanese. All rights reserved.</p>
          <a
            href="https://github.com/RyuuMachida"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-3.795-.735-.405-1.035-1.005-1.305-1.005-1.305-.81-.555.015-.555.015-.555.885.075 1.35.915 1.35.915.795 1.365 2.085.975 2.595.735.075-.57.315-.975.57-1.2-2.4-.27-4.92-1.2-4.92-5.355 0-1.185.42-2.145 1.11-2.895-.105-.27-.465-1.365.105-2.835 0 0 .915-.3 3 1.11.87-.24 1.815-.36 2.745-.36.93 0 1.875.12 2.745.36 2.085-1.41 3-1.11 3-1.11.57 1.47.21 2.565.105 2.835.69.75 1.11 1.71 1.11 2.895 0 4.17-2.52 5.085-4.935 5.355.39.33.735.96.735 1.935 0 1.395-.015 2.52-.015 2.865 0 .285.225.69.84.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            RyuuMachida
          </a>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL PREVIEW STATUS CARD YANG DI-RENDER CANVAS            */}
      {/* ========================================================= */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-sm font-bold text-slate-800">Foto Status Siap!</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Konten Gambar */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4 bg-slate-50">
              
              <div className="w-full max-w-[270px] aspect-[3/4] shadow-xl border border-slate-200 rounded-xl overflow-hidden bg-white">
                <img 
                  src={shareImage || ''} 
                  alt="Sertifikat Latihan Kana" 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-center max-w-xs">
                <p className="text-xs font-semibold text-indigo-600">Tip Penyimpanan:</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik tombol <b>Unduh Gambar</b> di bawah untuk mengunduh, atau tekan lama pada gambar di atas untuk menyimpannya langsung ke ponsel Anda.
                </p>
              </div>

            </div>

            {/* Aksi Bawah Modal */}
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                Tutup
              </button>
              <button
                onClick={downloadImage}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Unduh Gambar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL QUICK CHARACTER SELECTOR */}
      {showSelectorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Pilih Huruf {characterType === 'hiragana' ? 'Hiragana' : 'Katakana'}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pilih karakter untuk melatih penulisan secara langsung</p>
              </div>
              <button 
                onClick={() => setShowSelectorModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Grid Karakter */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="grid grid-cols-5 gap-3">
                {activeDataset.map((item, index) => {
                  const isActive = index === cardIndex;
                  return (
                    <button
                      key={item.kana}
                      onClick={() => {
                        setCardIndex(index);
                        setIsFlipped(false);
                        setShowSelectorModal(false);
                      }}
                      className={`h-14 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                        isActive
                          ? 'bg-indigo-600 border-indigo-600 text-white font-black scale-105 shadow-md shadow-indigo-600/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-lg font-bold">{item.kana}</span>
                      <span className={`text-[10px] uppercase font-semibold ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>{item.romaji}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Canvas untuk Merender Template Status */}
      <canvas ref={statusCanvasRef} className="hidden" />

    </div>
  );
}
