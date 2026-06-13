import { Channel } from '../types';

export function parseM3U(content: string): Channel[] {
  const channels: Channel[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      currentChannel = {};
      
      // Parse TV logo URL
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || line.match(/logo="([^"]+)"/i);
      if (logoMatch && logoMatch[1]) {
        currentChannel.logoUrl = logoMatch[1];
      }

      // Parse Category / Group Title
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch && groupMatch[1]) {
        currentChannel.category = groupMatch[1];
      } else {
        currentChannel.category = 'Other Live Channels';
      }

      // Parse name (Everything after the last comma)
      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        currentChannel.name = line.substring(commaIndex + 1).trim();
      } else {
        // Fallback search
        currentChannel.name = 'Unnamed Live Channel';
      }
    } else if (line.length > 0 && !line.startsWith('#')) {
      // This is the channel streaming URL
      if (line.startsWith('http://') || line.startsWith('https://')) {
        currentChannel.url = line;
        
        // Generate fallback name if missing
        if (!currentChannel.name) {
          try {
            const urlObj = new URL(line);
            currentChannel.name = urlObj.pathname.split('/').pop() || 'Unknown Stream';
          } catch {
            currentChannel.name = 'IPTV Stream';
          }
        }
        
        // Assign a stable, unique ID
        currentChannel.id = `m3u-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
        
        channels.push(currentChannel as Channel);
      }
      currentChannel = {}; // Reset for the next stream
    }
  }

  return channels;
}
