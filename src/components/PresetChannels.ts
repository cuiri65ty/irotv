import { Channel } from '../types';

export const PRESET_CHANNELS: Channel[] = [
  {
    id: 'nasa-tv',
    name: 'NASA Space TV Live',
    url: 'https://nasa-otv.akamaized.net/hls/live/2042340/nasa_otv/master.m3u8',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
    category: 'Science & Outer-space',
  },
  {
    id: 'france24-en',
    name: 'France 24 News (English)',
    url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/France_24_logo.svg',
    category: 'World News',
  },
  {
    id: 'dw-en',
    name: 'Deutsche Welle DW News (English)',
    url: 'https://dwstream4-lh.akamaihd.net/i/dwstream4_live@131320/master.m3u8',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Deutsche_Welle_logo.svg',
    category: 'World News',
  },
  {
    id: 'euronews-en',
    name: 'Euronews HD (English)',
    url: 'https://euronews-eng-hls-live.akamaized.net/hls/live/2018861/en/master.m3u8',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Euronews_logo_2016.svg',
    category: 'World News',
  },
  {
    id: 'kess-persian',
    name: 'Al Jazeera English News',
    url: 'https://live-amg-03.gamedistribution.com/aljazeera-eng/master.m3u8',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Aljazeera_eng.svg',
    category: 'World News',
  },
  {
    id: 'redbulltv',
    name: 'Red Bull TV USA',
    url: 'https://rbmn-live.akamaized.net/hls/live/2021617/redbulltv-v3-us/master.m3u8',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Red_Bull_Logo.svg',
    category: 'Sports & Entertainment',
  },
  {
    id: 'sintel-test',
    name: 'Sintel Cine-Cinematique (4K HLS Test)',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    logoUrl: 'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/clapperboard.svg',
    category: 'Movies & Cinematic Testers',
  },
  {
    id: 'bunny-test',
    name: 'Big Buck Bunny (HLS Standard Test)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logoUrl: 'https://raw.githubusercontent.com/lucide-react/lucide/main/icons/film.svg',
    category: 'Movies & Cinematic Testers',
  }
];
