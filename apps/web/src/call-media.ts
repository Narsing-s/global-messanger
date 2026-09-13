export type CallQuality = 'excellent' | 'good' | 'fair' | 'poor';

export async function getCallMedia(video = true) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 2,
    },
    video: video
      ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        }
      : false,
  });

  if (video) {
    const track = stream.getVideoTracks()[0];
    track?.applyConstraints?.({}).catch(() => undefined);
    if (track) {
      try {
        track.contentHint = 'motion';
      } catch {
        // contentHint is optional and not supported by every browser.
      }
    }
  }

  return stream;
}

export async function getReliableScreenShare() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen sharing is not supported');
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 30, max: 30 },
        width: { ideal: 1920, max: 2560 },
        height: { ideal: 1080, max: 1440 },
      },
      audio: true,
    });

    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        track.contentHint = 'detail';
      } catch {
        // contentHint is optional and not supported by every browser.
      }
    }

    return stream;
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') {
      throw error;
    }

    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  }
}

export function qualityFromStats(stats: {
  rttMs: number;
  packetLossPct: number;
  jitterMs: number;
}): CallQuality {
  if (stats.rttMs > 300 || stats.packetLossPct > 8 || stats.jitterMs > 50) {
    return 'poor';
  }
  if (stats.rttMs > 180 || stats.packetLossPct > 4 || stats.jitterMs > 30) {
    return 'fair';
  }
  if (stats.rttMs > 100 || stats.packetLossPct > 1.5 || stats.jitterMs > 15) {
    return 'good';
  }
  return 'excellent';
}

export async function readPeerQuality(pc: RTCPeerConnection) {
  const reports = await pc.getStats();
  let rtt = 0;
  let lost = 0;
  let received = 0;
  let jitter = 0;

  reports.forEach((r: any) => {
    if (
      r.type === 'candidate-pair' &&
      r.state === 'succeeded' &&
      typeof r.currentRoundTripTime === 'number'
    ) {
      rtt = Math.max(rtt, r.currentRoundTripTime * 1000);
    }

    if (r.type === 'inbound-rtp') {
      lost += Number(r.packetsLost || 0);
      received += Number(r.packetsReceived || 0);
      jitter = Math.max(jitter, Number(r.jitter || 0) * 1000);
    }
  });

  const packetLossPct = lost + received > 0 ? (lost / (lost + received)) * 100 : 0;
  const quality = qualityFromStats({ rttMs: rtt, packetLossPct, jitterMs: jitter });

  return { rttMs: rtt, packetLossPct, jitterMs: jitter, quality };
}

export function applyAdaptiveBitrate(sender: RTCRtpSender, quality: CallQuality) {
  const parameters = sender.getParameters();
  if (!parameters.encodings?.length) {
    parameters.encodings = [{}];
  }

  const limits: Record<CallQuality, number> = {
    excellent: 2500000,
    good: 1800000,
    fair: 1000000,
    poor: 450000,
  };

  parameters.encodings.forEach((encoding) => {
    encoding.maxBitrate = limits[quality];
    encoding.maxFramerate = quality === 'poor' ? 15 : 30;
  });

  return sender.setParameters(parameters);
}

export async function reconnectPeer(pc: RTCPeerConnection) {
  if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
    try {
      pc.restartIce();
      return true;
    } catch {
      try {
        pc.close();
        return false;
      } catch {
        return false;
      }
    }
  }

  return true;
}
